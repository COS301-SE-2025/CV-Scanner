import os, io, time
from typing import Dict, List, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse

from config_store import load_categories, save_categories
from bart_model import classify_text_by_categories

# OPTIONAL: simple extractors; replace with your PDF/DOCX code if you like
def extract_text_auto(file_bytes: bytes, filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    # fallback: treat everything as text (front-end can pre-extract)
    return file_bytes.decode("utf-8", errors="ignore")

app = FastAPI(title="Dynamic ZSC Classifier (Admin-editable categories)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

@app.get("/", response_class=PlainTextResponse)
async def root():
    return "OK. Endpoints: GET/POST /admin/categories, POST /classify, GET /health"

@app.get("/health")
async def health():
    return {"status": "ok", "ts": time.time()}

# -------- ADMIN: manage categories (no hardcoding) --------
@app.get("/admin/categories")
async def get_categories():
    return load_categories()

@app.post("/admin/categories")
async def set_categories(payload: Dict[str, List[str]] = Body(...)):
    """
    Body example:
    {
      "Skills": ["Writer","Coder","Backend","Manager","HR Supervisor"],
      "Education": ["Matric","Diploma","Bachelor","Honours","Masters","PhD"],
      "Experience": ["Intern","Junior","Mid","Senior","Lead"]
    }
    """
    try:
        save_categories(payload)
        return {"status": "saved", "categories": load_categories()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------- CLASSIFY: feed dynamic labels to BART and pick Top-3 --------
@app.post("/classify")
async def classify(
    text: str = Body(None),
    file: UploadFile = File(None),
    top_k: int = Body(3)
):
    if file is None and (text is None or not text.strip()):
        raise HTTPException(400, "Provide `text` or upload `file`.")
    if file is not None:
        data = await file.read()
        if not data:
            raise HTTPException(400, "Empty file.")
        text = extract_text_auto(data, file.filename or "upload.txt")

    cats = load_categories()
    if not cats:
        raise HTTPException(409, "No categories configured. Use POST /admin/categories first.")

    result = classify_text_by_categories(text, cats, top_k=top_k)
    # Also return a compact "applied" mapping: category -> topK labels
    applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in result.items()}
    return JSONResponse({
        "status": "success",
        "top_k": top_k,
        "applied": applied,
        "raw": result
    })

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8081"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)