import os
import time
import tempfile
from typing import List

import torch
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from transformers import pipeline

from cv_parser import parse_resume_from_bytes, extract_text  # reuse robust extraction

# ---------- FastAPI ----------
app = FastAPI(title="CV API (Parse & Probabilities)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

# ---------- Zero-shot classifier (probabilities) ----------
try:
    zsc = pipeline(
        "zero-shot-classification",
        model="facebook/bart-large-mnli",
        device=0 if torch.cuda.is_available() else -1
    )
except Exception:
    zsc = None

def classify_text_probabilities(text: str, candidate_labels: List[str]):
    if not zsc:
        raise RuntimeError("Zero-shot classifier not available")
    if not candidate_labels:
        raise ValueError("No candidate labels provided")
    res = zsc(text, candidate_labels=candidate_labels, multi_label=True)
    return [{"label": lbl, "score": float(scr)} for lbl, scr in zip(res["labels"], res["scores"])]

# ---------- Routes ----------
@app.get("/", response_class=PlainTextResponse)
async def root():
    return "OK. Use POST /parse_cv (summary) and POST /upload_cv (probabilities)."

@app.get("/health")
async def health():
    return {"status": "ok", "ts": time.time()}

@app.post("/parse_cv")
async def parse_cv(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.docx', '.txt']:
        raise HTTPException(status_code=400, detail="File must be PDF, DOCX, or TXT")

    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file.")
        parsed = parse_resume_from_bytes(data, file.filename)

        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "summary": parsed.get("summary"),
            "personal_info": parsed.get("personal_info"),
            "sections": parsed.get("sections"),
            "skills": parsed.get("skills"),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/upload_cv")
async def upload_file(
    file: UploadFile = File(...),
    labels: str = Query(
        default="Software Engineering,Data Science,DevOps,Frontend,Backend",
        description="Comma-separated labels"
    )
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.docx', '.txt']:
        raise HTTPException(status_code=400, detail="File must be PDF, DOCX, or TXT")

    try:
        # Write to temp file so we can reuse cv_parser.extract_text
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file.")
        temp.write(content)
        temp.close()

        try:
            raw_text = extract_text(temp.name)
        finally:
            try:
                os.unlink(temp.name)
            except Exception:
                pass

        candidate_labels = [s.strip() for s in labels.split(",") if s.strip()]
        if not candidate_labels:
            raise HTTPException(status_code=400, detail="No valid labels provided")

        probs = classify_text_probabilities(raw_text, candidate_labels)

        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "labels": candidate_labels,
            "probabilities": probs
        })
    except HTTPException:
        raise
    except Exception as e:
        # best effort cleanup
        try:
            if 'temp' in locals() and os.path.exists(temp.name):
                os.unlink(temp.name)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "5000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
