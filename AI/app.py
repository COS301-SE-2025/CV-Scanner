import time, logging, os, sys, subprocess, random
from typing import Dict, List, Any
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS, cross_origin
import torch
import spacy
import numpy as np
from transformers import pipeline

# -------------------- Setup --------------------
# Deterministic inference for consistent results
os.environ["TOKENIZERS_PARALLELISM"] = "false"
torch.manual_seed(0)
np.random.seed(0)
random.seed(0)
torch.use_deterministic_algorithms(False)

# Ensure spaCy model is available (safe + idempotent)
try:
    spacy.load("en_core_web_sm")
except Exception:
    try:
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        spacy.load("en_core_web_sm")
    except Exception as e:
        logging.warning("Failed to ensure spaCy model en_core_web_sm: %s", e)

# Select runtime device
DEVICE_ID = 0 if torch.cuda.is_available() else -1
logging.info("Runtime device: %s (cuda_available=%s)", DEVICE_ID, torch.cuda.is_available())

# Flask app setup
app = Flask(__name__)
CORS(app,
     origins=[
         "http://localhost",
         "http://localhost:3000",
         "https://jolly-bay-0e45d8b03.2.azurestaticapps.net"
     ],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=False)

gunicorn_logger = logging.getLogger("gunicorn.error")
if gunicorn_logger.handlers:
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)

# -------------------- Global Pipeline --------------------
MODEL = None

def get_pipeline():
    """Load the BART model once and reuse it for all requests."""
    global MODEL
    if MODEL is None:
        print("🔄 Loading BART model once...")
        MODEL = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=DEVICE_ID
        )
        MODEL.model.eval()
        print("✅ Model ready.")
    return MODEL

def warm_up_model():
    """Preload the model to avoid cold start delay."""
    print("Warming up zero-shot model...")
    try:
        get_pipeline()
    except Exception as e:
        print(f"Warm-up failed: {e}")

# Trigger warm-up immediately after app creation
with app.app_context():
    warm_up_model()

# -------------------- Lazy Imports --------------------
def _lazy_import():
    from config_store import load_categories, save_categories
    from cv_parser import parse_resume_from_bytes
    return load_categories, save_categories, parse_resume_from_bytes

# -------------------- Utilities --------------------
def extract_text_auto(file_bytes: bytes, filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    return file_bytes.decode("utf-8", errors="ignore")

def truncate_text(text: str, max_chars=2000) -> str:
    """Reduce text length for faster inference."""
    return text[:max_chars]

# -------------------- Project Type Heuristic --------------------
def infer_project_type(text: str, applied_labels: Dict[str, List[str]] | None = None):
    text_l = (text or "").lower()
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
    for ptype, kws in RULES.items():
        for kw in kws:
            if kw in text_l:
                scores[ptype] += 1

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

    best_type, best_score = max(scores.items(), key=lambda kv: kv[1])
    sorted_vals = sorted(scores.values(), reverse=True)
    second = sorted_vals[1] if len(sorted_vals) > 1 else 0

    if best_score == 0:
        return {"type": "General Software Project", "confidence": 0.3, "basis": []}

    margin = max(0, best_score - second)
    conf = min(0.9, 0.55 + 0.1 * margin)

    basis = []
    for kw in RULES[best_type]:
        if kw in text_l:
            basis.append(kw)
        if len(basis) >= 3:
            break
    basis.extend(label_bonus_basis)
    return {"type": best_type, "confidence": round(conf, 2), "basis": basis[:5]}

# -------------------- Health Endpoints --------------------
@app.get("/health")
def health():
    return {"status": "ok", "time": time.time()}, 200

@app.get("/startup_diagnostics")
def startup_diagnostics():
    try:
        root_files = os.listdir(".")
    except Exception as e:
        root_files = [f"error: {e}"]
    return jsonify(status="ok", cwd=os.getcwd(), files=root_files, python_version=os.sys.version)

@app.get("/warmup")
def warmup():
    t0 = time.perf_counter()
    try:
        get_pipeline()
        ms = int((time.perf_counter() - t0) * 1000)
        return jsonify(status="ok", warmed=True, ms=ms)
    except Exception as e:
        app.logger.exception("Warmup failed")
        return jsonify(status="error", error=str(e)), 500

@app.route("/")
def root():
    return "OK. Endpoints: /classify, /upload_cv, /parse_resume, /health"

# -------------------- Admin Category --------------------
@app.route("/admin/categories", methods=["GET"])
def get_categories():
    load_categories, _, _ = _lazy_import()
    return jsonify(load_categories())

@app.route("/admin/categories", methods=["POST"])
def set_categories():
    load_categories, save_categories, _ = _lazy_import()
    try:
        payload = request.get_json(force=True)
        if not isinstance(payload, dict):
            return make_response(jsonify({"status": "error", "detail": "Expected JSON object"}), 400)
        save_categories(payload)
        return jsonify({"status": "saved", "categories": load_categories()})
    except Exception as e:
        return make_response(jsonify({"status": "error", "detail": str(e)}), 400)

# -------------------- Upload CV Endpoint --------------------
@app.route("/upload_cv", methods=["POST"])
@cross_origin()
def upload_cv():
    """
    Handles CV uploads, classifies text into categories, and infers project type.
    Combines performance optimization (cached model, truncated text)
    with the original structured multi-category output format.
    """
    load_categories, _, _ = _lazy_import()

    file = request.files.get("file")
    if not file:
        return make_response(jsonify({"status": "error", "detail": "No file uploaded."}), 400)

    data = file.read()
    if not data:
        return make_response(jsonify({"status": "error", "detail": "Empty file."}), 400)

    # Get top_k (default = 3)
    try:
        top_k = int(request.values.get("top_k", request.args.get("top_k", 3)))
    except Exception:
        top_k = 3

    # Extract and truncate text for faster inference
    text = extract_text_auto(data, file.filename or "upload.txt")
    text = truncate_text(text, 2000)

    # Load categories
    cats = load_categories()
    if not cats:
        return make_response(jsonify({
            "status": "error",
            "detail": "No categories configured. Use POST /admin/categories first."
        }), 409)

    # Get cached model pipeline
    pipe = get_pipeline()

    result = {}
    for cat, labels in cats.items():
        if not labels:
            continue
        try:
            res = pipe(text, candidate_labels=labels, multi_label=True)
        except Exception as e:
            app.logger.warning(f"Classification failed for {cat}: {e}")
            continue

        labels_res = res.get("labels", [])
        scores_res = [max(float(s), 0.01) for s in res.get("scores", [])]
        top_k_list = [
            {"label": lbl, "score": sc}
            for lbl, sc in zip(labels_res, scores_res[:top_k])
        ]

        result[cat] = {
            "labels": labels_res,
            "scores": scores_res,
            "top_k": top_k_list
        }

    # Build applied (top labels per category)
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}

    # Infer project fit type
    best_fit = infer_project_type(text, applied)

    # Final structured response
    response_payload = {
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result,
        "best_fit_project_type": best_fit
    }

    return jsonify(response_payload)

# -------------------- Resume Parsing --------------------
@app.route("/parse_resume", methods=["POST"])
@cross_origin()
def parse_resume_endpoint():
    _, _, parse_resume_from_bytes = _lazy_import()
    file = request.files.get("file")
    if not file:
        return make_response(jsonify({"status": "error", "detail": "No file uploaded."}), 400)
    try:
        data = file.read()
        result = parse_resume_from_bytes(data, file.filename)
        return jsonify({"status": "success", "filename": file.filename, "result": result})
    except Exception as e:
        return make_response(jsonify({"status": "error", "detail": str(e)}), 500)

# -------------------- ASGI Adapter --------------------
try:
    from asgiref.wsgi import WsgiToAsgi
    asgi_app = WsgiToAsgi(app)
except Exception:
    asgi_app = None

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
