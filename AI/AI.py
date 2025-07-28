from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF for PDFs
import docx  # python-docx for DOCX
import tempfile
import os
import re

# ----------------------------------------------------------
# FastAPI app initialization
# ----------------------------------------------------------
app = FastAPI()

# Allow all CORS for testing (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# TEXT EXTRACTION FUNCTIONS
# ----------------------------------------------------------
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

# ----------------------------------------------------------
# PREPROCESSING FUNCTION
# ----------------------------------------------------------
def preprocess_text(cv_text: str) -> list:
    """
    Clean and normalize CV text.
    Returns a list of cleaned non-empty lines.
    """
    # Convert to lowercase for uniformity
    text = cv_text.lower()

    # Remove special characters (except @, ., +, - which are common in emails and URLs)
    text = re.sub(r"[^a-z0-9@\.\+\-\s]", " ", text)

    # Replace multiple spaces/newlines with single space
    text = re.sub(r"\s+", " ", text)

    # Split original text into lines (to keep some structure)
    lines = cv_text.splitlines()

    # Remove empty lines and strip whitespace
    cleaned_lines = [line.strip() for line in lines if line.strip()]

    return cleaned_lines

# ----------------------------------------------------------
# CONTACT & SECTION TAGGING FUNCTIONS
# ----------------------------------------------------------
def extract_contact_info(text: str) -> dict:
    """Extract common contact details from text."""
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    phones = re.findall(r'(?:\+?\d{1,3})?[-.\s]?(?:\(?\d{2,3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}', text)
    urls = re.findall(r'(?:https?://|www\.)[^\s]+', text)
    return {"emails": list(set(emails)), "phones": list(set(phones)), "urls": list(set(urls))}

def categorize_cv_lines(lines: list) -> dict:
    """Categorize CV lines into sections using simple keyword matching."""
    categories = {
        "profile": [],
        "education": [],
        "skills": [],
        "experience": [],
        "projects": [],
        "achievements": [],
        "contact": [],
        "other": []
    }

    for line in lines:
        line_lower = line.lower()
        if any(word in line_lower for word in ["education", "bachelor", "degree", "diploma", "university", "college"]):
            categories["education"].append(line)
        elif any(word in line_lower for word in ["skill", "technologies", "proficient", "languages:"]):
            categories["skills"].append(line)
        elif any(word in line_lower for word in ["experience", "employment", "work", "career", "intern"]):
            categories["experience"].append(line)
        elif any(word in line_lower for word in ["project", "developed", "created", "designed"]):
            categories["projects"].append(line)
        elif any(word in line_lower for word in ["award", "achievement", "certification", "certified"]):
            categories["achievements"].append(line)
        elif any(word in line_lower for word in ["profile", "summary", "objective", "about"]):
            categories["profile"].append(line)
        elif any(word in line_lower for word in ["phone", "email", "contact", "@", "linkedin", "github"]):
            categories["contact"].append(line)
        else:
            categories["other"].append(line)

    return categories

# ----------------------------------------------------------
# EXPERIENCE & SKILL DETECTION (Step 4)
# ----------------------------------------------------------
def detect_experience_level(lines: list) -> str:
    """Determine overall experience level from CV lines."""
    text = " ".join(lines).lower()

    # Look for explicit years of experience
    match = re.findall(r'(\d+)\s+year', text)
    if match:
        years = max([int(y) for y in match])
        if years < 2:
            return "Beginner"
        elif 2 <= years <= 5:
            return "Intermediate"
        else:
            return "Advanced"

    # Use keywords if no explicit year count
    if "senior" in text or "expert" in text:
        return "Advanced"
    elif "junior" in text or "entry" in text:
        return "Beginner"
    elif "mid-level" in text:
        return "Intermediate"

    return "Not Specified"

def extract_skills(lines: list) -> list:
    """Extract top 5 skills from CV text based on a predefined dictionary."""
    known_skills = [
        "python", "java", "javascript", "c++", "c#", "sql", "html", "css",
        "react", "node", "docker", "kubernetes", "aws", "azure", "git",
        "leadership", "communication", "management", "teamwork"
    ]
    text = " ".join(lines).lower()
    found = [skill for skill in known_skills if skill in text]
    return list(set(found))[:5]  # return unique top 5

# ----------------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "CV Processing API is running (Steps 1-4)"}

@app.post("/upload_cv/")
async def upload_cv(file: UploadFile = File(...)):
    """Upload PDF or DOCX CV and return structured analysis."""
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

    # Preprocess text
    cleaned_lines = preprocess_text(cv_text)

    # Categorize sections
    categorized = categorize_cv_lines(cleaned_lines)

    # Extract contact info and merge into contact section
    contact_info = extract_contact_info(cv_text)
    categorized["contact"].extend([f"Email: {email}" for email in contact_info["emails"]])
    categorized["contact"].extend([f"Phone: {phone}" for phone in contact_info["phones"]])
    categorized["contact"].extend([f"Link: {url}" for url in contact_info["urls"]])

    # Detect experience level & skills
    experience_level = detect_experience_level(cleaned_lines)
    skills = extract_skills(cleaned_lines)

    return JSONResponse(content={
        "status": "success",
        "filename": filename,
        "experience_level": experience_level,
        "skills": skills,
        "sections": categorized
    })

# ----------------------------------------------------------
# RUN SERVER
# ----------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
