import os, io, time
from typing import Dict, List, Any
from flask import Flask, jsonify, request

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

app = Flask(__name__)

_model = None

def get_model():
    global _model
    if _model is None:
        # Import and initialize heavy libs on first use
        from bart_model import load_bart_model  # adjust to your code
        _model = load_bart_model()              # or class ctor
    return _model

@app.get("/health")
def health():
    return jsonify(status="ok")

@app.get("/warmup")
def warmup():
    get_model()
    return jsonify(status="warmed")

@app.route("/")
def root():
    return "OK. Endpoints: GET/POST /admin/categories, POST /classify, GET /health, POST /upload_cv, POST /parse_resume"

# -------- ADMIN: manage categories (no hardcoding) --------
@app.route("/admin/categories", methods=["GET", "POST"])
def categories():
    if request.method == "GET":
        return load_categories()
    elif request.method == "POST":
        payload = request.json
        try:
            save_categories(payload)
            return {"status": "saved", "categories": load_categories()}
        except Exception as e:
            return {"status": "error", "detail": str(e)}, 400

# -------- CLASSIFY: feed dynamic labels to BART and pick Top-3 --------
@app.route("/classify", methods=["POST"])
def classify():
    data = request.json
    text = data.get("text")
    file = request.files.get("file")
    top_k = data.get("top_k", 3)

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
    }

@app.route("/upload_cv", methods=["POST"])
def upload_cv():
    file = request.files.get("file")
    top_k = request.form.get("top_k", 3)

    if file is None:
        return {"status": "error", "detail": "No file uploaded."}, 400

    data = file.read()
    if not data:
        return {"status": "error", "detail": "Empty file."}, 400
    text = extract_text_auto(data, file.filename or "upload.txt")

    cats = load_categories()
    if not cats:
        return {"status": "error", "detail": "No categories configured. Use POST /admin/categories first."}, 409

    result = classify_text_by_categories(text, cats, top_k=top_k)
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}
    return {
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result
    }

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
