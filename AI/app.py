import os, io, time
from typing import Dict, List, Any
from flask import Flask, jsonify, request
app = Flask(__name__)

from config_store import load_categories, save_categories
from bart_model import classify_text_by_categories

# Import CV parser functions
from cv_parser import parse_resume_from_bytes

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

    return {"type": best_type, "confidence": round(conf, 2), "basis": basis}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)
@app.get("/warmup")
def warmup():
    get_model()
    return jsonify(status="warmed")

@app.route("/")
def root():
    return "OK. Endpoints: GET/POST /admin/categories, POST /classify, GET /health, POST /upload_cv, POST /parse_resume"


@app.get("/admin/categories")
async def get_categories():
    return load_categories()

@app.post("/admin/categories")
async def set_categories(payload: Dict[str, List[str]] = Body(...)):
    try:
        save_categories(payload)
        return {"status": "saved", "categories": load_categories()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/classify")
async def classify(
    text: str = Body(None),
    file: UploadFile = File(None),
    top_k: int = Body(3)
):
    if file is None and (text is None or not text.strip()):
        return {"status": "error", "detail": "Provide `text` or upload `file`."}, 400
    if file is not None:
        data = file.read()
        if not data:
            return {"status": "error", "detail": "Empty file."}, 400
        text = extract_text_auto(data, file.filename or "upload.txt")

    cats = load_categories()
    if not cats:
        return {"status": "error", "detail": "No categories configured. Use POST /admin/categories first."}, 409

    result = classify_text_by_categories(text, cats, top_k=top_k)
    # Also return a compact "applied" mapping: category -> topK labels
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}
    return {
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result
    })

@app.post("/upload_cv")
async def upload_cv(file: UploadFile = File(...), top_k: int = 3):
    data = await file.read()
    if not data:
        return {"status": "error", "detail": "Empty file."}, 400
    text = extract_text_auto(data, file.filename or "upload.txt")

    cats = load_categories()
    if not cats:
        return {"status": "error", "detail": "No categories configured. Use POST /admin/categories first."}, 409

    result = classify_text_by_categories(text, cats, top_k=top_k)
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
    file = request.files.get("file")

    if file is None:
        return {"status": "error", "detail": "No file uploaded."}, 400

    try:
        # Read the uploaded file
        data = file.read()
        if not data:
            return {"status": "error", "detail": "Empty file uploaded."}, 400
        
        # Parse the resume using the complete cv_parser functionality
        result = parse_resume_from_bytes(data, file.filename)
        
        return {
            "status": "success",
            "filename": file.filename,
            "result": result
        }
    
    except Exception as e:
        return {"status": "error", "detail": f"Error parsing resume: {str(e)}"}, 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
