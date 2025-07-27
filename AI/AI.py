# app.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  
import docx  
import tempfile
import os


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



@app.get("/")
async def root():
    return {"message": "CV Processing API is running (Step 1 - Extraction)"}

@app.post("/upload_cv/")
async def upload_cv(file: UploadFile = File(...)):
    """Upload PDF or DOCX CV and return extracted text preview."""
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

    return JSONResponse(content={
        "status": "success",
        "filename": filename,
        "preview": cv_text[:2000] 
    })


if _name_ == "_main_":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)