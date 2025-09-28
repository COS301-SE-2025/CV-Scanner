import os, time, logging
from typing import Dict, List, Any
from flask import Flask, jsonify, request, make_response

app = Flask(__name__)

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
    # Minimal, safe health response to avoid any jsonify/context issues during debug
    try:
        return {"status": "ok", "time": time.time()}, 200
    except Exception as e:
        app.logger.exception("Health endpoint failed")
        # fallback plain-text error
        return ("error", 500)


# Removed FastAPI-style duplicate /admin/categories route (invalid for Flask because load_categories not in scope here)
# The valid Flask route for /admin/categories is defined later with @app.route(..., methods=["GET"])


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
    return "OK. Endpoints: GET/POST /admin/categories, POST /classify, POST /upload_cv, POST /parse_resume, GET /health"


@app.route("/admin/categories", methods=["GET"])
def get_categories():
    load_categories, _, _, _ = _lazy_import()
    return jsonify(load_categories())


@app.route("/admin/categories", methods=["POST"])
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
        # Replaced FastAPI HTTPException with Flask response
        return make_response(jsonify({"status": "error", "detail": str(e)}), 400)

@app.route("/classify", methods=["POST"])
def classify():
    # Lazy import heavy components
    load_categories, _, classify_text_by_categories, _ = _lazy_import()

    # Extract inputs
    text = None
    if request.is_json:
        text = (request.get_json(silent=True) or {}).get("text")
    if not text:
        text = request.form.get("text")

    file = request.files.get("file")

    if not file and (not text or not text.strip()):
        return make_response(jsonify({"status": "error", "detail": "Provide 'text' or upload 'file'."}), 400)

    if file:
        data = file.read()
        if not data:
            return make_response(jsonify({"status": "error", "detail": "Empty file."}), 400)
        text = extract_text_auto(data, file.filename or "upload.txt")

    try:
        top_k = int(request.values.get("top_k", 3))
    except Exception:
        top_k = 3

    # Load categories and classify
    try:
        cats = load_categories()
    except Exception as e:
        app.logger.exception("Loading categories failed")
        return make_response(jsonify({"status": "error", "detail": "Failed loading categories", "exception": str(e)}), 500)

    if not cats:
        return make_response(jsonify({"status": "error", "detail": "No categories configured. Use POST /admin/categories first."}), 409)

    try:
        result = classify_text_by_categories(text, cats, top_k=top_k)
    except Exception as e:
        app.logger.exception("Classification failed")
        return make_response(jsonify({"status": "error", "detail": "Classification failed", "exception": str(e)}), 500)

    applied = {cat: [x["label"] for x in info.get("top_k", [])] for cat, info in result.items()}
    best_fit = infer_project_type(text, applied)

    return jsonify({
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result,
        "best_fit_project_type": best_fit
    })


@app.route("/upload_cv", methods=["POST"])
def upload_cv():
    load_categories, _, classify_text_by_categories, _ = _lazy_import()

    file = request.files.get("file")
    if not file:
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
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}


   
    best_fit = infer_project_type(text, applied)

    return JSONResponse({
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result,

        "best_fit_project_type": best_fit  # ⬅️ added field

    })


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


if __name__ == "__main__":

    import uvicorn
    port = int(os.environ.get("PORT", "5000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)

