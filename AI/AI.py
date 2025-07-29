from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF for PDFs
import docx  # python-docx for DOCX
import tempfile
import os
import re
from transformers import pipeline

# ----------------------------------------------------------
# FastAPI app initialization
# ----------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# Hugging Face Zero-Shot Classifier (AI Model)
# ----------------------------------------------------------
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
labels = ["Profile", "Education", "Skills", "Experience", "Projects", "Achievements", "Contact", "Other"]

# ----------------------------------------------------------
# TEXT EXTRACTION FUNCTIONS
# ----------------------------------------------------------
def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
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
    lines = cv_text.splitlines()
    return [line.strip() for line in lines if line.strip()]

# ----------------------------------------------------------
# CONTACT EXTRACTION
# ----------------------------------------------------------
def extract_contact_info(text: str) -> dict:
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    phones = re.findall(r'(?:\+?\d{1,3})?[-.\s]?(?:\(?\d{2,3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}', text)
    urls = re.findall(r'(?:https?://|www\.)[^\s]+', text)
    return {"emails": list(set(emails)), "phones": list(set(phones)), "urls": list(set(urls))}

# ----------------------------------------------------------
# HEADING DETECTION + AI FALLBACK
# ----------------------------------------------------------
def detect_headings_and_group(lines):
    headings = {
        "profile": ["profile", "summary", "objective"],
        "education": ["education", "qualifications"],
        "skills": ["skills", "technologies", "tech skills"],
        "experience": ["experience", "work history", "employment"],
        "projects": ["projects", "portfolio"],
        "achievements": ["achievements", "awards", "certifications"],
        "contact": ["contact", "details"],
        "languages": ["languages"]
    }
    
    sections = {label: [] for label in headings.keys()}
    sections["other"] = []
    
    current_section = "other"
    for line in lines:
        l = line.strip().lower()
        found_header = None
        for section, keys in headings.items():
            if l in keys:
                found_header = section
                break
        if found_header:
            current_section = found_header
            continue
        sections[current_section].append(line.strip())

    return sections

def ai_classify_remaining(sections):
    """Use AI classification only for content in 'other' section."""
    classified = {key: list(dict.fromkeys(val)) for key, val in sections.items() if key != "other"}
    other_texts = sections.get("other", [])

    for text in other_texts:
        if len(text.strip()) < 3:
            continue
        result = classifier(text, candidate_labels=labels)
        top_label = result["labels"][0].lower()
        classified.setdefault(top_label, []).append(text.strip())

    # Deduplicate
    for key in classified:
        classified[key] = list(dict.fromkeys(classified[key]))

    return classified

# ----------------------------------------------------------
# EXPERIENCE & SKILL DETECTION
# ----------------------------------------------------------
def detect_experience_level(lines: list) -> str:
    text = " ".join(lines).lower()
    match = re.findall(r'(\d+)\s+year', text)
    if match:
        years = max([int(y) for y in match])
        if years < 2:
            return "Beginner"
        elif 2 <= years <= 5:
            return "Intermediate"
        else:
            return "Advanced"
    if "senior" in text or "expert" in text:
        return "Advanced"
    elif "junior" in text or "entry" in text:
        return "Beginner"
    elif "mid-level" in text:
        return "Intermediate"
    return "Not Specified"

def extract_skills(lines: list) -> list:
    known_skills = [
        "python", "java", "javascript", "c++", "c#", "sql", "html", "css",
        "react", "node", "docker", "kubernetes", "aws", "azure", "git",
        "leadership", "communication", "management", "teamwork"
    ]
    text = " ".join(lines).lower()
    found = [skill for skill in known_skills if skill in text]
    return list(set(found))[:5]

# ----------------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "CV Processing API is running (Heading detection + AI fallback)"}

@app.post("/upload_cv/")
async def upload_cv(file: UploadFile = File(...)):
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

    cleaned_lines = preprocess_text(cv_text)
    # 1. Detect headings and group content
    sections = detect_headings_and_group(cleaned_lines)
    # 2. Use AI fallback for unclassified content
    categorized = ai_classify_remaining(sections)

    # Add contact info
    contact_info = extract_contact_info(cv_text)
    categorized.setdefault("contact", [])
    categorized["contact"].extend([f"Email: {email}" for email in contact_info["emails"]])
    categorized["contact"].extend([f"Phone: {phone}" for phone in contact_info["phones"]])
    categorized["contact"].extend([f"Link: {url}" for url in contact_info["urls"]])

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
