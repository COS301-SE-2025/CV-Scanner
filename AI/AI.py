from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  
import docx  
import tempfile
import os
import re


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(pdf_bytes)
        tmp_file.flush()
        tmp_path = tmp_file.name

    try:
        text = ""
        with fitz.open(tmp_path) as pdf:
            for page in pdf:
                text += page.get_text()
    finally:
        os.unlink(tmp_path)

    return text.strip()

def extract_text_from_docx_bytes(docx_bytes: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
        tmp_file.write(docx_bytes)
        tmp_file.flush()
        tmp_path = tmp_file.name

    try:
        doc = docx.Document(tmp_path)
        text = "\n".join([para.text for para in doc.paragraphs])
    finally:
        os.unlink(tmp_path)

    return text.strip()

def extract_text_auto(file_bytes: bytes, filename: str) -> str:
    """Detect file type and extract text accordingly."""
    if filename.lower().endswith(".pdf"):
        return extract_text_from_pdf_bytes(file_bytes)
    elif filename.lower().endswith(".docx"):
        return extract_text_from_docx_bytes(file_bytes)
    else:
        raise ValueError("Unsupported file type. Only PDF and DOCX are supported.")


def preprocess_text(cv_text: str) -> list:
    """
    Clean and normalize CV text.
    Returns a list of cleaned non-empty lines.
    """
    # Convert to lowercase for uniformity
    text = cv_text.lower()

   
    text = re.sub(r"[^a-z0-9@\.\+\-\s]", " ", text)


    text = re.sub(r"\s+", " ", text)

   
    lines = cv_text.splitlines()

    
    cleaned_lines = [line.strip() for line in lines if line.strip()]

    return cleaned_lines

# ----------------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "CV Processing API is running (Step 1 + Step 2)"}

@app.post("/upload_cv/")
async def upload_cv(file: UploadFile = File(...)):
    """Upload PDF or DOCX CV and return extracted + cleaned text preview."""
    filename = file.filename
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file received.")

    try:
        cv_text = extract_text_auto(file_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

    if not cv_text.strip():
        raise HTTPException(status_code=500, detail="No text could be extracted from the CV.")

    # Preprocess text (Step 2)
    cleaned_lines = preprocess_text(cv_text)

    return JSONResponse(content={
        "status": "success",
        "filename": filename,
        "total_lines": len(cleaned_lines),
        "lines": cleaned_lines[:50]  # Only first 50 lines for preview
    })

# ----------------------------------------------------------
# RUN SERVER
# ----------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
