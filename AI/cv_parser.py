# cv_parser.py
import os
import re
import logging
import tempfile

import torch
import spacy
import docx
from pdfminer.high_level import extract_text as extract_pdf_text
from transformers import pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -------- spaCy (optional) --------
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model 'en_core_web_sm' not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

# -------- Summarizer (optional, lazy/controlled by env) --------
SUMMARIZER = None
def get_summarizer():
    global SUMMARIZER
    if SUMMARIZER is not None:
        return SUMMARIZER
    # enable only if explicitly requested (to avoid slow cold start)
    if os.environ.get("ENABLE_SUMMARIZER", "0") not in ("1", "true", "True"):
        logger.info("Summarizer disabled (set ENABLE_SUMMARIZER=1 to enable).")
        SUMMARIZER = None
        return SUMMARIZER
    try:
        device = 0 if torch.cuda.is_available() else -1
        SUMMARIZER = pipeline("summarization", model="facebook/bart-large-cnn", device=device)
        logger.info("Summarization model loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load summarization model: {e}")
        SUMMARIZER = None
    return SUMMARIZER

# --------- File text extractors ---------
def extract_text_from_pdf(pdf_path: str) -> str:
    return extract_pdf_text(pdf_path)

def extract_text_from_docx(docx_path: str) -> str:
    d = docx.Document(docx_path)
    return "\n".join(p.text for p in d.paragraphs)

def extract_text(file_path: str) -> str:
    lower = file_path.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    if lower.endswith(".docx"):
        return extract_text_from_docx(file_path)
    if lower.endswith(".txt"):
        with open(file_path, "rb") as f:
            return f.read().decode("utf-8", errors="ignore")
    raise ValueError(f"Unsupported file format: {file_path}")

# --------- CV parsing (personal info / sections / skills / summary) ---------
EMAIL_RE = re.compile(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", re.I)
PHONE_RE = re.compile(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}")

def extract_personal_info(text: str):
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    name = None
    try:
        name = extract_name_with_context(text)
    except Exception as e:
        logger.warning(f"Advanced name extraction failed: {e}")
    if not name:
        try:
            name = extract_name_basic(text)
        except Exception as e:
            logger.warning(f"Basic name extraction failed: {e}")
    return {
        "name": name,
        "email": email.group(0) if email else None,
        "phone": phone.group(0) if phone else None
    }

def extract_name_basic(text: str):
    lines = text.splitlines()[:10]
    for line in lines:
        s = line.strip()
        if not s or "@" in s or PHONE_RE.search(s):
            continue
        # ALL CAPS
        if re.match(r'^[A-Z][A-Z\s]+[A-Z]$', s):
            words = s.split()
            if 2 <= len(words) <= 4 and all(2 <= len(w) <= 15 for w in words):
                if not any(k in s.lower() for k in ['computer','science','student','profile','resume','cv','education','experience']):
                    return s.title()
        # Title case
        if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$', s):
            if not any(k in s.lower() for k in ['computer','science','student','profile','resume','cv']):
                return s
    return None

def extract_name_with_context(text: str):
    candidates = []
    first_lines = text.splitlines()[:8]
    for i, line in enumerate(first_lines):
        s = line.strip()
        if not s or "@" in s or PHONE_RE.search(s):
            continue
        name_patterns = [
            r'^([A-Z][A-Z\s]+[A-Z])$',
            r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$',
            r'^([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)$',
            r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$'
        ]
        for p in name_patterns:
            m = re.search(p, s)
            if not m:
                continue
            cand = m.group(1).strip()
            if cand.isupper():
                t = cand.title()
                words = t.split()
                if 2 <= len(words) <= 4 and all(2 <= len(w) <= 15 for w in words):
                    if not any(k in t.lower() for k in ["curriculum","resume","cv","contact","about","education","experience","skills","computer","science","student","profile"]):
                        candidates.append((t, 5.0 - i*0.3))
            else:
                if not any(k in cand.lower() for k in ["curriculum","resume","cv","contact","about","education","experience","skills"]):
                    candidates.append((cand, 4.0 - i*0.5))
    if nlp:
        doc = nlp(text[:2000])
        blacklist = {"api","http","aws","docker","kubernetes","javascript","university","resume","cv","contact"}
        for ent in doc.ents:
            if ent.label_ != "PERSON":
                continue
            t = ent.text.strip()
            if " " not in t or re.search(r'\b[A-Z]{2,}\b', t):
                continue
            if any(b in t.lower() for b in blacklist):
                continue
            score = 2.0 - (ent.start_char/1000)
            context = text[max(0, ent.start_char-150):ent.end_char+150].lower()
            if any(k in context for k in ["resume","cv","curriculum vitae"]):
                score += 1.0
            if any(k in context for k in ["contact","personal","about"]):
                score += 0.5
            candidates.append((t, score))
    if candidates:
        d = {}
        for nm, sc in candidates:
            d[nm] = max(d.get(nm, -1e9), sc)
        best = sorted(d.items(), key=lambda x: x[1], reverse=True)[0][0]
        if len(best.split()) >= 2 and len(best) < 50 and not re.search(r'\d', best):
            return best
    return None

# ---- Sections & skills (condensed from your original; unchanged logic) ----
def extract_sections(text: str):
    text_norm = re.sub(r'\s+', ' ', text).strip()
    lines = text.splitlines()
    section_patterns = {
        "education": [r"(?i)\b(education|academic\s+background|qualifications|educational\s+background|degrees?)\b",
                      r"(?i)\b(bachelor|master|phd|doctorate|university|college)\b"],
        "experience": [r"(?i)\b(experience|work\s+history|employment|professional\s+experience|employment\s+history)\b"],
        "skills": [r"(?i)\b(skills|technical\s+skills|competencies|proficiencies|technologies|programming\s+languages)\b"],
        "projects": [r"(?i)\b(projects|project\s+experience|portfolio|notable\s+projects)\b"]
    }
    sections = {}
    sections.update(_extract_sections_by_headers(lines, section_patterns))
    if len(sections) < 2:
        sections.update(_extract_sections_by_content(text_norm))
    return sections

def _extract_sections_by_headers(lines, patterns):
    sections, current, buf = {}, None, []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        found = None
        for sec, pats in patterns.items():
            for p in pats:
                if re.search(p, s) and len(s) < 150 and not re.search(r'\w+[.,:;]\s+\w+', s):
                    found = sec; break
            if found: break
        if found:
            if current and buf:
                content = "\n".join(buf).strip()
                if len(content) > 10:
                    sections[current] = _clean_section(content, current)
            current, buf = found, []
        elif current:
            buf.append(s)
    if current and buf:
        content = "\n".join(buf).strip()
        if len(content) > 10:
            sections[current] = _clean_section(content, current)
    return sections

def _extract_sections_by_content(text):
    sections = {}
    edu_pat = [r'(bachelor|master|phd|doctorate|degree|university|college|diploma|certificate).*?(?=\.|\n|$)',
               r'(b\.?[as]\.?|m\.?[as]\.?|ph\.?d\.?|mba).*?(?=\.|\n|$)']
    edu_hits = []
    for p in edu_pat:
        for m in re.finditer(p, text, re.I|re.DOTALL):
            edu_hits.append(m.group(0).strip())
    if edu_hits:
        sections['education'] = '. '.join(edu_hits[:3])
    exp_pat = [r'(worked|employed|position|role|experience).*?(?=\.|\n|$)',
               r'(developed|managed|led|created|implemented|designed|built|responsible).*?(?=\.|\n|$)']
    exp_hits = []
    for p in exp_pat:
        for m in re.finditer(p, text, re.I|re.DOTALL):
            s = m.group(0).strip()
            if len(s) > 20:
                exp_hits.append(s)
    if exp_hits:
        sections['experience'] = '. '.join(exp_hits[:5])
    proj_pat = [r'(project|built|developed|created|designed).*?(?=\.|\n|$)']
    proj_hits = []
    for p in proj_pat:
        for m in re.finditer(p, text, re.I|re.DOTALL):
            s = m.group(0).strip()
            if len(s) > 30:
                proj_hits.append(s)
    if proj_hits:
        sections['projects'] = '. '.join(proj_hits[:3])
    return sections

def _clean_section(content, section_type):
    content = re.sub(r'\s+', ' ', content)
    content = re.sub(r'[-•▪▫]+\s*', '• ', content)
    content = re.sub(r'\|\s*', ', ', content)
    if section_type in ("experience","projects"):
        summ = get_summarizer()
        if summ and len(content) > 400:
            try:
                out = summ(content, max_length=200, min_length=50, do_sample=False, truncation=True)
                return out[0]['summary_text']
            except Exception as e:
                logger.warning(f"Summarization failed: {e}")
                return content[:400] + "..."
    if section_type == "skills":
        return content[:300] + "..." if len(content) > 300 else content
    return content

# --- skills extraction (shortened pass-through to your previous helpers) ---
def extract_skills(text: str):
    skills = set()
    skills |= _extract_known_techs(text)
    skills |= _extract_from_skills_section(text)
    skills |= _extract_programming_languages(text)
    cleaned = []
    for s in skills:
        c = _clean_skill(s)
        if _is_legit_skill(c):
            cleaned.append(c)
    return sorted(set(cleaned))

def _extract_known_techs(text: str):
    techs = [
        # long → short order helps matching
        'typescript','javascript','python','java','c++','c#','c','php','ruby','go','rust','kotlin','swift','scala','r',
        'matlab','sql','plsql','tsql','html','css','react','angular','vue','node.js','express','django','flask',
        'spring','laravel','rails','asp.net','bootstrap','tailwind','jquery','next.js','graphql',
        'mysql','postgresql','mongodb','redis','sqlite','oracle','dynamodb','elasticsearch',
        'aws','azure','gcp','docker','kubernetes','terraform','jenkins','git','github','gitlab','bitbucket','ansible',
        'tensorflow','pytorch','scikit-learn','pandas','numpy','matplotlib','seaborn','tableau','power bi','keras','opencv',
    ]
    techs.sort(key=len, reverse=True)
    found = set()
    for t in techs:
        pat = re.escape(t).replace(r'\.', r'\.?')
        for m in re.finditer(rf'\b{pat}\b', text, re.I):
            ctx = text[max(0, m.start()-30):min(len(text), m.end()+30)].lower()
            if '@' in ctx or 'http' in ctx or 'www.' in ctx:
                continue
            found.add(t.lower())
    return found

def _extract_from_skills_section(text: str):
    # look for a skills block heuristically
    m = re.search(r'(?is)skills\s*[:\-\n]+(.{0,1500})', text)
    if not m:
        return set()
    block = m.group(1)
    parts = re.split(r'[,\|\n;•\-\*]+', block)
    return {p.strip().lower() for p in parts if 2 <= len(p.strip()) <= 30}

def _extract_programming_languages(text: str):
    langs = set()
    for p in [r'programming\s+languages?:?\s*([^.]+)', r'languages?:?\s*([^.]+)',
              r'proficient\s+in:?\s*([^.]+)', r'experienced\s+with:?\s*([^.]+)']:
        for m in re.finditer(p, text, re.I):
            for tok in re.split(r'[,;|]', m.group(1)):
                t = tok.strip().lower()
                if t in {'python','java','javascript','typescript','c++','c#','c','php','ruby','go','rust','kotlin','swift','r','sql','html','css'}:
                    langs.add(t)
    return langs

def _contains_personal(text: str):
    if EMAIL_RE.search(text) or PHONE_RE.search(text):
        return True
    if re.search(r'\b(street|avenue|road|drive|lane)\b', text, re.I):
        return True
    return False

def _clean_skill(s: str):
    s = re.sub(r'^(the\s+|a\s+|an\s+)', '', s, flags=re.I)
    s = re.sub(r'[^\w\s\-\+\.#]', '', s).strip().lower()
    norm = {'js': 'javascript', 'ts':'typescript', 'reactjs':'react', 'nodejs':'node.js', 'c++':'cpp', 'c#':'csharp'}
    return norm.get(s, s)

def _is_legit_skill(s: str):
    if not s or len(s) < 2 or len(s) > 25: return False
    if _contains_personal(s): return False
    if not re.search(r'[a-zA-Z]', s): return False
    bad = {'and','or','with','the','a','in','on','at','to','for','of','contact','phone','email','address'}
    return s not in bad

# ---- summary helpers (lightweight) ----
def generate_cv_summary(text: str, personal: dict, sections: dict, skills: list):
    bits = []
    if personal.get('name'):
        bits.append(f"{personal['name']} is a")
    else:
        bits.append("This candidate is a")
    edu_level = "professional"
    edu = sections.get("education", "") or ""
    e = edu.lower()
    if "master" in e: edu_level = "master's degree holder"
    elif "phd" in e or "doctorate" in e: edu_level = "PhD holder"
    elif "bachelor" in e: edu_level = "bachelor's graduate"
    elif "student" in e: edu_level = "student"
    if skills:
        bits.append(f"{edu_level} with skills in {', '.join(skills[:5])}")
    else:
        bits.append(edu_level)
    if sections.get('experience'):
        bits.append("with relevant work experience")
    if sections.get('projects'):
        bits.append("and notable projects")
    base = ". ".join(bits).rstrip(".") + "."
    # refine with summarizer if enabled
    summ = get_summarizer()
    if summ:
        try:
            prompt = f"Professional Summary: {base}\nExperience: {sections.get('experience','')[:200]}"
            out = summ(prompt, max_length=80, min_length=30, do_sample=False, truncation=True)
            txt = out[0]['summary_text'].strip()
            if len(txt) > 20:
                return txt
        except Exception as e:
            logger.warning(f"AI summary failed: {e}")
    return base

def parse_resume_from_bytes(file_bytes: bytes, filename: str):
    # write to temp with correct suffix to reuse extractors
    ext = os.path.splitext(filename or "upload.bin")[1].lower()
    if ext not in (".pdf", ".docx", ".txt"):
        # Try to decode as text as best-effort
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

    # Keep original for name extraction; make normalized for other passes
    original_text = original
    normalized = re.sub(r'\s+', ' ', original).strip()

    personal = extract_personal_info(original_text)
    sections = extract_sections(normalized)
    skills = extract_skills(normalized)
    summary = generate_cv_summary(normalized, personal, sections, skills)

    return {
        "personal_info": personal,
        "sections": sections,
        "skills": skills,
        "summary": summary
    }
