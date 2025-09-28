import os
import re
import logging
import tempfile

from pyparsing import Dict
import torch
import spacy
try:
    import docx
    _HAS_PYDOCX = True
except Exception:
    docx = None
    _HAS_PYDOCX = False
try:
    from pdfminer.high_level import extract_text as extract_pdf_text
    _HAS_PDFMINER = True
except Exception:
    extract_pdf_text = None
    _HAS_PDFMINER = False
from transformers import pipeline

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- spaCy (optional) ----------
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model 'en_core_web_sm' not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

# ---------- Summarizer (optional) ----------
try:
    summarizer = pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
        device=0 if torch.cuda.is_available() else -1
    )
    logger.info("Summarization model loaded successfully")
except Exception as e:
    logger.warning(f"Could not load summarization model: {e}")
    summarizer = None

# ---------- File text extractors ----------
def extract_text_from_pdf(pdf_path: str) -> str:
    if not _HAS_PDFMINER:
        raise RuntimeError("pdfminer.six is not installed. Install with: pip install pdfminer.six")
    return extract_pdf_text(pdf_path)

def extract_text_from_docx(docx_path: str) -> str:
    if not _HAS_PYDOCX:
        raise RuntimeError("python-docx is not installed. Install with: pip install python-docx")
    d = docx.Document(docx_path)
    return "\n".join(p.text for p in d.paragraphs)

def extract_text(file_path: str) -> str:
    lower = file_path.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif lower.endswith(".docx"):
        return extract_text_from_docx(file_path)
    elif lower.endswith(".txt"):
        with open(file_path, "rb") as f:
            return f.read().decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file format: {file_path}")

# ---------- Personal info extraction ----------
EMAIL_RE = re.compile(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", re.I)
PHONE_RE = re.compile(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}")

#CODE---------------------------------------------------------------------------------------



def extract_with_ai_prompting(self, cv_text:str) -> Dict[str,any]:
    """
        Use AI prompting to extract structured data from CV text
        Focus on candidate qualifications, not project descriptions
    """
    clean_text = self._clean_text(cv_text)

def _clean_text (self,text:str) ->str:
    """Clean and normalize CV text"""
    text = re.sub(r'\n\s*\n', '\n\n',text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text

def parse_resume_from_bytes(file_bytes: bytes, filename: str):
    ext = os.path.splitext(filename or "upload.bin")[1].lower()
    if ext not in (".pdf", ".docx", ".txt"):
        # best-effort as text
        text_guess = file_bytes.decode("utf-8", errors="ignore")
        original = text_guess
    else:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        try:
            tmp.write(file_bytes); tmp.close()
            original = extract_text(tmp.name)
        finally:
            try: os.unlink(tmp.name)
            except Exception: pass

    # Use AI-driven extraction instead of regex-heavy approach
    try:
        from ai_cv_extractor import ai_extractor
        logger.info("Using AI-driven CV extraction")
        
        ai_result = ai_extractor.extract_with_ai_prompting(original)
        
        # Convert to expected format for compatibility
        return {
            "personal_info": ai_result["personal_info"],
            "sections": {
                "experience": str(ai_result.get("experience", [])),
                "education": str(ai_result.get("education", [])),
                "skills": ", ".join(ai_result.get("skills", [])),
                "projects": str(ai_result.get("projects", []))
            },
            "skills": ai_result.get("skills", []),
            "summary": ai_result.get("summary", "No summary available"),
            "ai_extracted": True,  # Flag to indicate AI extraction was used
            "certifications": ai_result.get("certifications", []),
            "languages": ai_result.get("languages", [])
        }
        
    except Exception as e:
        logger.warning(f"AI extraction failed, falling back to regex method: {e}")
        
        # Fallback to original method if AI extraction fails
        original_text = original
        norm_text = re.sub(r'\s+', ' ', original).strip()

        personal_info = extract_personal_info(original_text)
        sections = extract_sections(norm_text)
        skills = extract_skills(norm_text)
        summary = generate_cv_summary(norm_text, personal_info, sections, skills)

        return {
            "personal_info": personal_info,
            "sections": sections,
            "skills": skills,
            "summary": summary,
            "ai_extracted": False  # Flag to indicate fallback was used
        }
