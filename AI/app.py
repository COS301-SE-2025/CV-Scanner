import os, time, logging
from typing import Dict, List, Any
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.getenv("CORS_ORIGINS", "*")}})

gunicorn_logger = logging.getLogger("gunicorn.error")
if gunicorn_logger.handlers:
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)

# MOVE heavy imports inside functions (lazy)
def _lazy_import():
    """
    Import modules that may pull large ML deps. Prevents crash at startup
    if dependencies not yet installed or slow to load.
    """
    from config_store import load_categories, save_categories
    from bart_model import classify_text_by_categories
    from cv_parser import parse_resume_from_bytes
    return load_categories, save_categories, classify_text_by_categories, parse_resume_from_bytes

# OPTIONAL: simple extractors; replace with your PDF/DOCX code if you like
def extract_text_auto(file_bytes: bytes, filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    elif name.endswith(".pdf"):
        # Try to extract PDF text properly
        try:
            import PyPDF2
            import io
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            # Check if we got readable text or just binary garbage
            if text.strip() and len(text.strip()) > 10:
                # Check if text looks like actual content vs PDF binary
                if text.count('\x00') < len(text) * 0.1:  # Less than 10% null bytes
                    return text.strip()
            
            # If PyPDF2 failed, try alternative approach
            app.logger.warning("PyPDF2 extraction returned empty/binary data, trying fallback")
            
        except Exception as e:
            app.logger.warning(f"PDF extraction failed: {e}")
        
        # Fallback: try to decode as text but warn about potential issues
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore")
            if len(decoded) > 100 and (decoded.count('\x00') > 10 or 'obj' in decoded[:200]):
                app.logger.warning("PDF appears to contain binary data - text extraction may be unreliable")
                return "Error: Unable to extract readable text from PDF. The file may be password-protected, image-based, or corrupted."
            return decoded
        except Exception:
            return "Error: Unable to extract text from PDF file."
    
    # fallback: treat everything as text (front-end can pre-extract)
    return file_bytes.decode("utf-8", errors="ignore")

_model = None
def get_model():
    global _model
    if _model is None:
        # import and init heavy libs here
        from bart_model import load_bart_model  # adjust to your code
        _model = load_bart_model()
    return _model

# --- Heuristic best-fit project type from CV text + labels ---
def infer_project_type(text: str, applied_labels: Dict[str, List[str]] | None = None):
    """
    Returns a dict: {"type": <str>, "confidence": <0..1>, "basis": [<keywords/labels>]}
    """
    text_l = (text or "").lower()

    # Keyword rules (tweak freely)
    RULES = {
        "Machine Learning / Data Science": [
            "machine learning", "deep learning", "data science", "nlp", "computer vision",
            "pytorch", "tensorflow", "sklearn", "xgboost", "model training", "dataset"
        ],
        "API Backend / Services": [
            "rest api", "graphql", "fastapi", "django", "flask", "express", "spring boot",
            "microservice", "endpoint", "jwt", "postgres", "mongodb"
        ],
        "Frontend Web App": [
            "react", "next.js", "typescript", "javascript", "spa", "redux", "tailwind",
            "vue", "angular", "ui", "ux"
        ],
        "DevOps / Infrastructure": [
            "docker", "kubernetes", "terraform", "ci/cd", "jenkins", "github actions",
            "helm", "prometheus", "grafana", "aws", "azure", "gcp"
        ],
        "Mobile App": [
            "android", "ios", "react native", "flutter", "kotlin", "swift", "xcode"
        ],
        "Data Engineering / ETL": [
            "airflow", "spark", "databricks", "etl", "elt", "data pipeline", "kafka",
            "bigquery", "snowflake", "redshift"
        ],
        "General Web Application": [
            "full-stack", "web application", "crud", "authentication", "authorization"
        ]
    }

    scores = {k: 0 for k in RULES}

    # Keyword scoring
    for ptype, kws in RULES.items():
        for kw in kws:
            if kw in text_l:
                scores[ptype] += 1

    # Label bonuses (from your classifier result)
    label_bonus_basis = []
    if applied_labels:
        flat = {lbl.lower() for group in applied_labels.values() for lbl in group}
        if any(x in flat for x in ["data science", "machine learning", "ml engineer"]):
            scores["Machine Learning / Data Science"] += 2; label_bonus_basis.append("label: ML/DS")
        if any(x in flat for x in ["backend", "api", "software engineering"]):
            scores["API Backend / Services"] += 2; label_bonus_basis.append("label: Backend/API")
        if any(x in flat for x in ["frontend", "ui", "web dev"]):
            scores["Frontend Web App"] += 2; label_bonus_basis.append("label: Frontend")
        if "devops" in flat:
            scores["DevOps / Infrastructure"] += 2; label_bonus_basis.append("label: DevOps")
        if any(x in flat for x in ["mobile", "android", "ios"]):
            scores["Mobile App"] += 2; label_bonus_basis.append("label: Mobile")
        if any(x in flat for x in ["data engineering", "etl", "pipeline"]):
            scores["Data Engineering / ETL"] += 2; label_bonus_basis.append("label: Data Eng")

    # Pick best
    best_type, best_score = max(scores.items(), key=lambda kv: kv[1])
    sorted_vals = sorted(scores.values(), reverse=True)
    second = sorted_vals[1] if len(sorted_vals) > 1 else 0

    if best_score == 0:
        return {"type": "General Software Project", "confidence": 0.3, "basis": []}

    # Confidence: base 0.55 + margin bonus (capped)
    margin = max(0, best_score - second)
    conf = min(0.9, 0.55 + 0.1 * margin)

    # Basis (top 3 matched keywords + any label reasons)
    basis = []
    for kw in RULES[best_type]:
        if kw in text_l:
            basis.append(kw)
        if len(basis) >= 3:
            break
    basis.extend(label_bonus_basis)
    basis = basis[:5]

    return {"type": best_type, "confidence": round(conf, 2), "basis": basis}


@app.get("/health")
def health():
    return jsonify(status="ok", time=time.time())


@app.get("/startup_diagnostics")
def startup_diagnostics():
    """
    Quick endpoint to confirm files & environment.
    """
    root_files = []
    try:
        root_files = os.listdir(".")
    except Exception as e:
        root_files = [f"error: {e}"]
    return jsonify(
        status="ok",
        cwd=os.getcwd(),
        files=root_files,
        python_version=os.sys.version,
        env_present=bool(os.getenv("WEBSITE_SITE_NAME")),
    )


def _ensure_cache_dirs():
    for var in ("TRANSFORMERS_CACHE", "HF_HOME"):
        path = os.getenv(var)
        if path:
            try:
                os.makedirs(path, exist_ok=True)
            except Exception:
                app.logger.exception("Failed creating cache dir for %s", var)


@app.get("/warmup")
def warmup():
    t0 = time.perf_counter()
    try:
        _ensure_cache_dirs()
        # If you have model preload logic, call it here safely:
        # preload_models()  # make sure it handles repeated calls
        ms = int((time.perf_counter() - t0) * 1000)
        return jsonify(status="ok", warmed=True, ms=ms)
    except Exception as e:
        app.logger.exception("Warmup failed")
        return jsonify(status="error", error=str(e)), 500


@app.route("/")
def root():
    return "OK. Endpoints: GET/POST /admin/categories, POST /classify, POST /upload_cv, POST /summarize_cv, POST /parse_resume, GET /health"


@app.route("/admin/categories", methods=["GET"])
def get_categories():
    load_categories, _, _, _ = _lazy_import()
    return jsonify(load_categories())


@app.route("/admin/categories", methods=["POST"])
def set_categories():
    load_categories, save_categories, _, _ = _lazy_import()
    try:
        payload = request.get_json(force=True)
        if not isinstance(payload, dict):
            return make_response(jsonify({"status": "error", "detail": "Expected JSON object"}), 400)
        save_categories(payload)
        return jsonify({"status": "saved", "categories": load_categories()})
    except Exception as e:
        app.logger.exception("Saving categories failed")
        return make_response(jsonify({"status": "error", "detail": str(e)}), 400)


@app.route("/classify", methods=["POST"])
def classify():
    load_categories, _, classify_text_by_categories, _ = _lazy_import()
    # Accept either JSON { "text": "..." } or multipart form with file
    text = None
    if request.content_type and request.content_type.startswith("multipart/"):
        file = request.files.get("file")
        if file:
            data = file.read()
            if not data:
                return make_response(jsonify({"status": "error", "detail": "Empty file."}), 400)
            text = extract_text_auto(data, file.filename or "upload.txt")
    else:
        j = request.get_json(silent=True) or {}
        text = j.get("text")

    if not text or not str(text).strip():
        return make_response(jsonify({"status": "error", "detail": "Provide `text` or upload `file`."}), 400)

    try:
        top_k = int(request.values.get("top_k", request.args.get("top_k", 3)))
    except Exception:
        top_k = 3

    cats = load_categories()
    if not cats:
        return make_response(jsonify({"status": "error", "detail": "No categories configured. Use POST /admin/categories first."}), 409)

    result = classify_text_by_categories(text, cats, top_k=top_k)
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}
    return jsonify({
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result
    })


@app.route("/upload_cv", methods=["POST"])
def upload_cv():
    load_categories, _, classify_text_by_categories, _ = _lazy_import()
    file = request.files.get("file")
    if file is None:
        return make_response(jsonify({"status": "error", "detail": "No file uploaded."}), 400)

    data = file.read()
    if not data:
        return make_response(jsonify({"status": "error", "detail": "Empty file."}), 400)

    try:
        top_k = int(request.values.get("top_k", request.args.get("top_k", 3)))
    except Exception:
        top_k = 3

    text = extract_text_auto(data, file.filename or "upload.txt")

    cats = load_categories()
    if not cats:
        return make_response(jsonify({"status": "error", "detail": "No categories configured. Use POST /admin/categories first."}), 409)

    result = classify_text_by_categories(text, cats, top_k=top_k)
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}

    best_fit = infer_project_type(text, applied)

    return jsonify({
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result,
        "best_fit_project_type": best_fit
    })


# -------- NEW: Summary-Only Endpoint --------
@app.route("/summarize_cv", methods=["POST"])
def summarize_cv_endpoint():
    # Handle multiple files
    files = request.files.getlist("file") or request.files.getlist("files")
    
    if not files:
        return make_response(jsonify({"status": "error", "detail": "No files uploaded."}), 400)

    try:
        # Import summary generator once
        try:
            from summary import summary_generator
        except Exception as imp_err:
            import traceback
            traceback.print_exc()
            return make_response(jsonify({
                "status": "error",
                "detail": "Summary module import failed",
                "exception": str(imp_err)
            }), 500)

        results = []
        
        for i, file in enumerate(files):
            try:
                data = file.read()
                if not data:
                    results.append({
                        "file_index": i,
                        "filename": file.filename,
                        "status": "error",
                        "detail": "Empty file"
                    })
                    continue

                # Extract text from file
                text = extract_text_auto(data, file.filename or f"upload_{i}.txt")

                # Generate summary
                result = summary_generator.generate_summary(text)

                results.append({
                    "file_index": i,
                    "filename": file.filename,
                    "status": "success",
                    "result": result
                })

            except Exception as e:
                results.append({
                    "file_index": i,
                    "filename": file.filename,
                    "status": "error",
                    "detail": str(e)
                })

        return jsonify({
            "status": "success",
            "total_files": len(files),
            "results": results
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return make_response(jsonify({
            "status": "error",
            "detail": "Summary generation failed",
            "exception": str(e)
        }), 500)


# -------- NEW: CV/Resume Parsing Endpoint --------
@app.route("/parse_resume", methods=["POST"])
def parse_resume_endpoint():
    _, _, _, parse_resume_from_bytes = _lazy_import()
    file = request.files.get("file")

    if file is None:
        return make_response(jsonify({"status": "error", "detail": "No file uploaded."}), 400)

    try:
        data = file.read()
        if not data:
            return make_response(jsonify({"status": "error", "detail": "Empty file uploaded."}), 400)

        # Lazy-import parser so startup stays fast and we get a clear error if parser deps are missing
        try:
            from cv_parser import parse_resume_from_bytes
        except Exception as imp_err:
            import traceback
            traceback.print_exc()
            return make_response(jsonify({
                "status": "error",
                "detail": "Parser module import failed",
                "exception": str(imp_err)
            }), 500)

        try:
            result = parse_resume_from_bytes(data, file.filename)
        except Exception as parse_err:
            import traceback
            traceback.print_exc()
            return make_response(jsonify({
                "status": "error",
                "detail": "Parser error",
                "exception": str(parse_err)
            }), 500)

        return jsonify({
            "status": "success",
            "filename": file.filename,
            "result": result
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return make_response(jsonify({"status": "error", "detail": f"Error parsing resume: {str(e)}"}), 500)


# -------- NEW: Multiple CV/Resume Parsing Endpoint --------
@app.route("/parse_resumes_batch", methods=["POST"])
def parse_resumes_batch_endpoint():
    """Parse multiple CV/resume files in a single request"""
    _, _, _, parse_resume_from_bytes = _lazy_import()
    
    # Get multiple files using 'files' parameter
    files = request.files.getlist("files")
    
    if not files:
        return make_response(jsonify({"status": "error", "detail": "No files uploaded. Use 'files' parameter for multiple uploads."}), 400)
    
    # Import parser
    try:
        from cv_parser import parse_resume_from_bytes
    except Exception as imp_err:
        import traceback
        traceback.print_exc()
        return make_response(jsonify({
            "status": "error",
            "detail": "Parser module import failed",
            "exception": str(imp_err)
        }), 500)
    
    results = []
    errors = []
    
    # Process each file
    for i, file in enumerate(files):
        if not file or not file.filename:
            errors.append({
                "file_index": i,
                "filename": "unknown",
                "error": "Invalid file"
            })
            continue
            
        try:
            data = file.read()
            if not data:
                errors.append({
                    "file_index": i,
                    "filename": file.filename,
                    "error": "Empty file uploaded"
                })
                continue
            
            # Parse the resume
            result = parse_resume_from_bytes(data, file.filename)
            results.append({
                "file_index": i,
                "filename": file.filename,
                "status": "success",
                "result": result
            })
            
        except Exception as parse_err:
            import traceback
            traceback.print_exc()
            errors.append({
                "file_index": i,
                "filename": file.filename,
                "error": f"Parse error: {str(parse_err)}"
            })
    
    # Return comprehensive batch response
    total_files = len(files)
    successful_files = len(results)
    failed_files = len(errors)
    
    response = {
        "status": "success" if successful_files > 0 else "error",
        "batch_summary": {
            "total_files": total_files,
            "successful": successful_files,
            "failed": failed_files,
            "success_rate": f"{(successful_files/total_files)*100:.1f}%" if total_files > 0 else "0%"
        },
        "results": results
    }
    
    if errors:
        response["errors"] = errors
    
    return jsonify(response)


if __name__ == "__main__":
    # Local run only; in Azure use gunicorn startup command
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
