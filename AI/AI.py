
import os
import re
import io
import tempfile
from typing import List, Dict, Set

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

# ---- Text extraction libs ----
import fitz  # PyMuPDF
import pdfplumber
import docx  # python-docx

# ---- ML / NLP ----
from transformers import pipeline
import nltk
from nltk.corpus import stopwords

# ---- Plotting (optional endpoint) ----
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt

# ----------------------------
# Startup: NLTK stopwords safe-load
# ----------------------------
try:
    _ = stopwords.words("english")
except LookupError:
    nltk.download("stopwords")
STOPWORDS: Set[str] = set(stopwords.words("english"))

# ----------------------------
# Configurable labels & HF pipeline
# ----------------------------
ZSC_LABELS = [
    "Profile", "Education", "Skills", "Soft Skills", "Experience",
    "Projects", "Achievements", "Contact", "Other"
]
# Load once at process start
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# ----------------------------
# Keyword dictionaries (from your first script)
# ----------------------------
PROGRAMMING_LANGUAGES = {
    'python', 'java', 'javascript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
    'kotlin', 'typescript', 'scala', 'perl', 'r', 'matlab', 'c', 'objective-c'
}
FRAMEWORKS_LIBRARIES = {
    'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'bootstrap', 'jquery', 'tensorflow', 'pytorch', 'keras'
}
DATABASES = {
    'mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'redis', 'elasticsearch',
    'cassandra', 'dynamodb', 'firestore', 'sql', 'nosql'
}
CLOUD_TOOLS = {
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'gitlab', 'bitbucket', 'terraform', 'ansible'
}
WEB_TECHNOLOGIES = {
    'html', 'css', 'sass', 'scss', 'rest', 'api', 'graphql', 'json', 'xml', 'ajax'
}
SOFT_SKILLS = {
    'leadership', 'teamwork', 'communication', 'problem-solving', 'analytical',
    'creative', 'management', 'agile', 'scrum', 'planning', 'organization'
}
ROLES = {
    'developer', 'engineer', 'programmer', 'analyst', 'manager', 'designer',
    'architect', 'consultant', 'intern', 'senior', 'junior', 'lead', 'full-stack',
    'frontend', 'backend', 'devops', 'data-scientist', 'machine-learning'
}
ALL_SEARCHABLE_TERMS = (
    PROGRAMMING_LANGUAGES | FRAMEWORKS_LIBRARIES | DATABASES |
    CLOUD_TOOLS | WEB_TECHNOLOGIES | SOFT_SKILLS | ROLES
)

# ----------------------------
# Extraction helpers
# ----------------------------
def _extract_text_pdf_pymupdf(pdf_bytes: bytes) -> str:
    text = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text.append(page.get_text())
    return "\n".join(text).strip()

def _extract_text_pdf_pdfplumber(pdf_bytes: bytes) -> str:
    text = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()
        path = tmp.name
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                text.append(t)
    finally:
        os.unlink(path)
    return "\n".join(text).strip()

def _extract_text_docx(docx_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        tmp.write(docx_bytes)
        tmp.flush()
        path = tmp.name
    try:
        d = docx.Document(path)
        return "\n".join(p.text for p in d.paragraphs).strip()
    finally:
        os.unlink(path)

def extract_text_auto(file_bytes: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        # Prefer PyMuPDF for speed/accuracy; fallback to pdfplumber if needed
        try:
            txt = _extract_text_pdf_pymupdf(file_bytes)
            if txt.strip():
                return txt
        except Exception:
            pass
        txt = _extract_text_pdf_pdfplumber(file_bytes)
        return txt
    elif name.endswith(".docx"):
        return _extract_text_docx(file_bytes)
    else:
        raise ValueError("Unsupported file type. Only PDF and DOCX are supported.")

def preprocess_lines(text: str) -> List[str]:
    return [ln.strip() for ln in text.splitlines() if ln.strip()]

# ----------------------------
# Rule & ML logic
# ----------------------------
def extract_contact_info(text: str) -> Dict[str, List[str]]:
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text)
    phones = re.findall(r'(?:\+?\d{1,3})?[-.\s]?(?:\(?\d{2,3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}', text)
    urls   = re.findall(r'(?:https?://|www\.)[^\s]+', text)
    return {
        "emails": sorted(set(emails)),
        "phones": sorted(set(phones)),
        "urls":   sorted(set(urls))
    }

def detect_headings_and_group(lines: List[str]) -> Dict[str, List[str]]:
    headings = {
        "profile": ["profile", "summary", "objective"],
        "education": ["education", "qualifications"],
        "skills": ["skills", "technologies", "tech skills"],
        "soft skills": ["soft skills"],
        "experience": ["experience", "work history", "employment"],
        "projects": ["projects", "portfolio"],
        "achievements": ["achievements", "awards", "certifications"],
        "contact": ["contact", "details"],
        "languages": ["languages"],
    }
    sections = {k: [] for k in headings}
    sections["other"] = []
    current = "other"
    keys_by_lower = {kw: sec for sec, kws in headings.items() for kw in kws}
    for line in lines:
        l = line.strip().lower()
        if l in keys_by_lower:
            current = keys_by_lower[l]
            continue
        sections[current].append(line.strip())
    return sections

def ai_classify_remaining(sections: Dict[str, List[str]]) -> Dict[str, List[str]]:
    classified: Dict[str, List[str]] = {k: list(dict.fromkeys(v)) for k, v in sections.items() if k != "other"}
    for text in sections.get("other", []):
        if len(text.strip()) < 3:
            continue
        result = classifier(text, candidate_labels=ZSC_LABELS)
        top = result["labels"][0].lower()
        classified.setdefault(top, []).append(text.strip())
    # de-dup
    for k in list(classified.keys()):
        classified[k] = list(dict.fromkeys(classified[k]))
    return classified

def detect_experience_level(lines: List[str]) -> str:
    text = " ".join(lines).lower()
    years = re.findall(r'(\d+)\s+year', text)
    if years:
        y = max(int(v) for v in years)
        if y < 2: return "Beginner"
        if y <= 5: return "Intermediate"
        return "Advanced"
    if any(w in text for w in ["senior", "expert"]): return "Advanced"
    if any(w in text for w in ["junior", "entry"]):  return "Beginner"
    if "mid-level" in text:                           return "Intermediate"
    return "Not Specified"

def extract_skills(lines: List[str]) -> List[str]:
    known = [
        "python", "java", "javascript", "c++", "c#", "sql", "html", "css",
        "react", "node", "docker", "kubernetes", "aws", "azure", "git",
        "leadership", "communication", "management", "teamwork"
    ]
    text = " ".join(lines).lower()
    return list({k for k in known if k in text})[:5]

# ---- Keyword extraction from your first script ----
def extract_searchable_keywords(text: str) -> List[str]:
    text_lower = ' '.join(text.lower().split())
    found = set()

    # direct dictionary matches (support hyphen/space)
    for term in ALL_SEARCHABLE_TERMS:
        term_pat = term.replace('-', '[- ]')
        if re.search(r'\b' + term_pat + r'\b', text_lower):
            found.add(term)

    # special variations
    special = {
        r'\bc\+\+\b': 'c++',
        r'\bc#\b': 'c#',
        r'\bnode\.?js\b': 'nodejs',
        r'\bmachine learning\b': 'machine-learning',
        r'\bproblem solving\b': 'problem-solving',
        r'\bfull stack\b': 'full-stack',
        r'\bfront[- ]?end\b': 'frontend',
        r'\bback[- ]?end\b': 'backend',
        r'\bdev[- ]?ops\b': 'devops',
        r'\bdata scientist?\b': 'data-scientist',
        r'\bsql server\b': 'sql',
        r'\bmicrosoft sql\b': 'sql',
        r'\bmongo\b': 'mongodb',
        r'\bpostgres\b': 'postgresql',
    }
    for pat, kw in special.items():
        if re.search(pat, text_lower):
            found.add(kw)

    # Capitalized technical terms heuristic
    tech_pattern = r'\b[A-Z][a-zA-Z]*(?:\.[a-zA-Z]+)*\b'
    for term in re.findall(tech_pattern, text):
        tl = term.lower()
        if (len(term) >= 3 and tl not in STOPWORDS and
            tl not in {'education', 'experience', 'skills', 'projects', 'achievements'} and
            any(ch.isupper() for ch in term)):
            found.add(tl)

    # versions (Python 3.10, Java 8, etc.)
    for _ in re.findall(r'\b(python|java|node|php|mysql)\s*\d+(?:\.\d+)*\b', text_lower):
        found.add(_)

    return sorted(found)

def categorize_keywords(keywords: List[str]) -> Dict[str, List[str]]:
    out = {
        'Programming Languages': [],
        'Frameworks & Libraries': [],
        'Databases': [],
        'Cloud & Tools': [],
        'Web Technologies': [],
        'Soft Skills': [],
        'Roles & Positions': [],
        'Other Technical': []
    }
    for k in keywords:
        ( out['Programming Languages'] if k in PROGRAMMING_LANGUAGES else
          out['Frameworks & Libraries'] if k in FRAMEWORKS_LIBRARIES else
          out['Databases'] if k in DATABASES else
          out['Cloud & Tools'] if k in CLOUD_TOOLS else
          out['Web Technologies'] if k in WEB_TECHNOLOGIES else
          out['Soft Skills'] if k in SOFT_SKILLS else
          out['Roles & Positions'] if k in ROLES else
          out['Other Technical'] ).append(k)
    return out

def render_keywords_plot(cat: Dict[str, List[str]]) -> bytes:
    data = {k: v for k, v in cat.items() if v}
    if not data:
        fig = plt.figure(figsize=(6, 2))
        plt.text(0.5, 0.5, "No keywords found", ha="center", va="center")
    else:
        labels = list(data.keys())
        values = [len(v) for v in data.values()]
        plt.figure(figsize=(10, 6))
        bars = plt.bar(range(len(labels)), values)
        plt.xlabel("Keyword Categories")
        plt.ylabel("Count")
        plt.title("CV Keywords Distribution")
        plt.xticks(range(len(labels)), labels, rotation=45, ha="right")
        for b, val in zip(bars, values):
            h = b.get_height()
            plt.text(b.get_x() + b.get_width()/2.0, h + 0.1, f"{val}", ha="center", va="bottom")
        plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150)
    plt.close()
    buf.seek(0)
    return buf.read()

# ----------------------------
# FastAPI app
# ----------------------------
app = FastAPI(title="CV Processing API (combined)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

@app.get("/", response_class=PlainTextResponse)
async def root():
    return "CV Processing API: POST /upload_cv (PDF/DOCX). Optional: GET /health, POST /keywords_plot."

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/upload_cv/")
async def upload_cv(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    try:
        cv_text = extract_text_auto(data, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {e}")

    if not cv_text.strip():
        raise HTTPException(status_code=422, detail="No extractable text in file.")

    lines = preprocess_lines(cv_text)

    # 1) Rule-based headings + HF fallback for 'other'
    sections_rb = detect_headings_and_group(lines)
    sections = ai_classify_remaining(sections_rb)

    # 2) Contact info (global)
    contact = extract_contact_info(cv_text)
    sections.setdefault("contact", [])
    sections["contact"].extend([f"Email: {e}" for e in contact["emails"]])
    sections["contact"].extend([f"Phone: {p}" for p in contact["phones"]])
    sections["contact"].extend([f"Link: {u}" for u in contact["urls"]])

    # 3) Experience level + quick skills
    experience_level = detect_experience_level(lines)
    quick_skills = extract_skills(lines)

    # 4) Keyword extraction + categorization
    all_keywords = extract_searchable_keywords(cv_text)
    categorized = categorize_keywords(all_keywords)

    return JSONResponse(content={
        "status": "success",
        "filename": filename,
        "experience_level": experience_level,
        "skills_sample": quick_skills,
        "contact_info": contact,
        "sections": sections,
        "keywords": {
            "all": all_keywords,
            "by_category": categorized
        }
    })

@app.post("/keywords_plot")
async def keywords_plot(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    try:
        text = extract_text_auto(data, file.filename or "upload")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")
    categorized = categorize_keywords(extract_searchable_keywords(text))
    png_bytes = render_keywords_plot(categorized)
    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8081"))
    uvicorn.run("AI:app", host="0.0.0.0", port=port, reload=False)
