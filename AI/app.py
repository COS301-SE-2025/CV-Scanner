# app.py
import os
import time
from typing import Dict, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse

from config_store import load_categories, save_categories
from bart_model import classify_text_by_categories

# NEW: bring in the robust PDF/DOCX/TXT extract + CV parser
from cv_parser import parse_resume_from_bytes

app = FastAPI(title="Dynamic ZSC Classifier + CV Parser")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

@app.get("/", response_class=PlainTextResponse)
async def root():
    return "OK. Endpoints: GET/POST /admin/categories, POST /classify, POST /upload_cv, GET /health"

@app.get("/health")
async def health():
    return {"status": "ok", "ts": time.time()}

# ----- Admin categories -----
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

# ----- Core classify -----
@app.post("/classify")
async def classify(
    text: str = Body(None),
    file: UploadFile = File(None),
    top_k: int = Body(3),
    parse_cv: bool = Body(False)  # NEW: also run the CV parser on the same input
):
    if file is None and (text is None or not text.strip()):
        raise HTTPException(400, "Provide `text` or upload `file`.")
    if file is not None:
        data = await file.read()
        if not data:
            raise HTTPException(400, "Empty file.")
        # If it's a document, we still want the raw text for the classifier
        # cv_parser will do the heavy lifting to extract/normalize
        cv = parse_resume_from_bytes(data, file.filename or "upload.bin")
        text = " ".join([
            cv.get("summary",""),
            cv.get("sections",{}).get("experience",""),
            cv.get("sections",{}).get("projects",""),
            cv.get("sections",{}).get("skills",""),
            cv.get("sections",{}).get("education",""),
        ]).strip()
    else:
        data = text.encode("utf-8", errors="ignore")
        cv = parse_resume_from_bytes(data, "inline.txt") if parse_cv else None

    cats = load_categories()
    if not cats:
        raise HTTPException(409, "No categories configured. Use POST /admin/categories first.")

    result = classify_text_by_categories(text, cats, top_k=top_k)
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}

    payload = {
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result
    }
    if parse_cv or file is not None:
        payload["cv_parse"] = cv
    return JSONResponse(payload)

# ----- CV-specific upload -----
@app.post("/upload_cv")
async def upload_cv(file: UploadFile = File(...), top_k: int = 3):
    """
    Upload a CV (PDF/DOCX/TXT) and get BOTH:
      - robust CV parsing (personal_info/sections/skills/summary), and
      - category classification (on the extracted text/summary).
    """
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file.")

    cv = parse_resume_from_bytes(data, file.filename or "upload.bin")

    cats = load_categories()
    if not cats:
        raise HTTPException(409, "No categories configured. Use POST /admin/categories first.")

    # Use a concatenation of summary + sections for classification input
    classify_text = " ".join([
        cv.get("summary",""),
        cv.get("sections",{}).get("experience",""),
        cv.get("sections",{}).get("projects",""),
        cv.get("sections",{}).get("skills",""),
        cv.get("sections",{}).get("education",""),
    ]).strip()

    result = classify_text_by_categories(classify_text, cats, top_k=top_k)
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}

    return JSONResponse({
        "status": "success",
        "filename": file.filename,
        "top_k": top_k,
        "applied": applied,
        "raw": result,
        "cv_parse": cv
    })


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8081"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
