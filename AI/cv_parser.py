import os
import re
import logging
import tempfile

import torch
import spacy
import docx
from pdfminer.high_level import extract_text as extract_pdf_text
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
    return extract_pdf_text(pdf_path)

def extract_text_from_docx(docx_path: str) -> str:
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

def extract_personal_info(text: str):
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    name = None

    logger.info(f"Starting name extraction, nlp available: {nlp is not None}")

    if nlp:
        try:
            name = extract_name_with_context(text)
            logger.info(f"Advanced name extraction result: {name}")
        except Exception as e:
            logger.warning(f"Advanced name extraction failed: {e}")

    if not name:
        try:
            name = extract_name_basic(text)
            logger.info(f"Basic name extraction result: {name}")
        except Exception as e:
            logger.warning(f"Basic name extraction failed: {e}")

    logger.info(f"Final name result: {name}")
    return {
        "name": name,
        "email": email.group(0) if email else None,
        "phone": phone.group(0) if phone else None
    }

def extract_name_basic(text: str):
    lines = text.split('\n')[:10]
    for line in lines:
        s = line.strip()
        if not s or '@' in s or PHONE_RE.search(s):
            continue
        if re.match(r'^[A-Z][A-Z\s]+[A-Z]$', s):
            words = s.split()
            if 2 <= len(words) <= 4 and all(2 <= len(w) <= 15 for w in words):
                if not any(k in s.lower() for k in ['computer','science','student','profile','resume','cv','education','experience']):
                    return s.title()
        if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$', s):
            if not any(k in s.lower() for k in ['computer','science','student','profile','resume','cv']):
                return s
    return None

def extract_name_with_context(text: str):
    candidates = []
    first_lines = text.split('\n')[:8]
    for i, line in enumerate(first_lines):
        s = line.strip()
        if not s or '@' in s or PHONE_RE.search(s):
            continue
        pats = [
            r'^([A-Z][A-Z\s]+[A-Z])$',
            r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$',
            r'^([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)$',
            r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$',
        ]
        for p in pats:
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

# ---------- Sections & skills ----------
def extract_sections(text: str):
    text_clean = re.sub(r'\s+', ' ', text)
    lines = text.split('\n')

    section_patterns = {
        "education": [
            r"(?i)\b(education|academic\s+background|qualifications|academics|educational\s+background|degrees?)\b",
            r"(?i)\b(bachelor|master|phd|doctorate|university|college)\b",
            r"(?i)\beducation\b"
        ],
        "experience": [
            r"(?i)\b(experience|work\s+history|employment|professional\s+background|work\s+experience|career|professional\s+experience|employment\s+history)\b",
            r"(?i)\b(worked|employment|professional|career)\b",
            r"(?i)\bexperience\b"
        ],
        "skills": [
            r"(?i)\b(skills|technical\s+skills|competencies|proficiencies|technologies|expertise|abilities|programming\s+languages)\b",
            r"(?i)\b(technical|programming|languages)\b",
            r"(?i)\bskills\b"
        ],
        "projects": [
            r"(?i)\b(projects|personal\s+projects|key\s+projects|project\s+experience|portfolio|notable\s+projects)\b",
            r"(?i)\bprojects?\b"
        ]
    }

    sections = {}
    sections.update(extract_sections_by_headers(lines, section_patterns))
    if not sections or len(sections) < 2:
        sections.update(extract_sections_by_content(text_clean))
    return sections

def extract_sections_by_headers(lines, section_patterns):
    sections = {}
    current_section = None
    current_content = []

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue

        found_section = None
        for section_name, patterns in section_patterns.items():
            for pattern in patterns:
                if re.search(pattern, line_clean) and len(line_clean) < 150:
                    if not re.search(r'\w+[.,:;]\s+\w+', line_clean):
                        found_section = section_name
                        break
            if found_section:
                break

        if found_section:
            if current_section and current_content:
                content = '\n'.join(current_content).strip()
                if content and len(content) > 10:
                    sections[current_section] = clean_section_content(content, current_section)
            current_section = found_section
            current_content = []
        elif current_section:
            current_content.append(line_clean)

    if current_section and current_content:
        content = '\n'.join(current_content).strip()
        if content and len(content) > 10:
            sections[current_section] = clean_section_content(content, current_section)

    return sections

def extract_sections_by_content(text: str):
    sections = {}

    education_patterns = [
        r'(bachelor|master|phd|doctorate|degree|university|college|school|graduated|studied|diploma|certificate).*?(?=\n|\.|$)',
        r'(b\.?[as]\.?|m\.?[as]\.?|ph\.?d\.?|mba).*?(?=\n|\.|$)',
        r'(19|20)\d{2}[-–](19|20)\d{2}.*?(university|college|school)',
    ]
    education_content = []
    for pattern in education_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            education_content.append(match.group(0).strip())
    if education_content:
        sections['education'] = '. '.join(education_content[:3])

    experience_patterns = [
        r'(worked|employed|position|role|job|company|organization|firm|experience).*?(?=\n|\.|$)',
        r'(developed|managed|led|created|implemented|designed|built|responsible).*?(?=\n|\.|$)',
        r'(19|20)\d{2}[-–](19|20)\d{2}.*?(company|organization|firm|corp)',
    ]
    experience_content = []
    for pattern in experience_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            content = match.group(0).strip()
            if len(content) > 20:
                experience_content.append(content)
    if experience_content:
        sections['experience'] = '. '.join(experience_content[:5])

    project_patterns = [
        r'(project|built|developed|created|designed).*?(?=\n|\.|$)',
        r'(application|website|system|platform|tool).*?(?=\n|\.|$)',
    ]
    project_content = []
    for pattern in project_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            content = match.group(0).strip()
            if len(content) > 30:
                project_content.append(content)
    if project_content:
        sections['projects'] = '. '.join(project_content[:3])

    return sections

def clean_section_content(content: str, section_type: str):
    content = re.sub(r'\s+', ' ', content)
    content = re.sub(r'[-•▪▫]+\s*', '• ', content)
    content = re.sub(r'\|\s*', ', ', content)

    if section_type == "skills":
        return content[:300] + "..." if len(content) > 300 else content
    elif section_type in ["experience", "projects"]:
        if summarizer and len(content) > 400:
            try:
                summary = summarizer(
                    content, max_length=200, min_length=50, do_sample=False, truncation=True
                )
                return summary[0]['summary_text']
            except Exception as e:
                logger.warning(f"Summarization failed: {e}")
                return content[:400] + "..."
        return content
    else:
        return content

# ---------- Skills extraction ----------
def extract_skills(text: str):
    sections = extract_sections(text)
    skills_section = sections.get("skills", "")
    search_text = skills_section if len(skills_section) > 30 else text

    skills = set()
    skills.update(extract_known_technologies(search_text))
    if skills_section:
        skills.update(extract_from_skills_section(skills_section))
    skills.update(extract_programming_languages(search_text))

    cleaned = []
    for s in skills:
        c = clean_skill_text(s)
        if is_legitimate_skill(c):
            cleaned.append(c)
    return sorted(list(set(cleaned)))

def extract_known_technologies(text: str):
    skills = set()
    technologies = {
        'languages': [
            'python','java','javascript','typescript','c++','c#','c','php','ruby','go','rust',
            'kotlin','swift','scala','r','matlab','perl','lua','dart','objective-c','visual basic',
            'fortran','cobol','assembly','bash','powershell','sql','plsql','tsql'
        ],
        'web': [
            'html','css','react','angular','vue','vue.js','node.js','nodejs','express','django','flask','spring',
            'laravel','rails','asp.net','jquery','bootstrap','tailwind','sass','less','webpack','babel',
            'next.js','nuxt.js','svelte','ember','backbone','redux','graphql'
        ],
        'databases': [
            'mysql','postgresql','mongodb','redis','cassandra','oracle','sql server','sqlite','dynamodb',
            'elasticsearch','neo4j','couchdb','mariadb','firebase','supabase','planetscale','cockroachdb'
        ],
        'cloud': [
            'aws','azure','gcp','google cloud','docker','kubernetes','terraform','jenkins','git',
            'github','gitlab','bitbucket','ci/cd','ansible','puppet','chef','vagrant','helm','istio',
            'prometheus','grafana'
        ],
        'data_ai': [
            'tensorflow','pytorch','scikit-learn','pandas','numpy','matplotlib','seaborn','jupyter',
            'anaconda','spark','hadoop','tableau','power bi','plotly','keras','opencv','nltk','spacy','huggingface'
        ],
        'mobile': [
            'android','ios','react native','flutter','xamarin','ionic','cordova','phonegap','swift ui','kotlin multiplatform'
        ],
        'tools': [
            'vscode','intellij','eclipse','xcode','android studio','sublime','vim','emacs','atom',
            'pycharm','webstorm','postman','figma','sketch','photoshop','illustrator','jira','confluence','slack'
        ],
        'testing': [
            'jest','mocha','cypress','selenium','pytest','junit','testng','cucumber','jasmine','karma',
            'enzyme','react testing library'
        ]
    }
    all_techs = []
    for cat in technologies.values():
        all_techs.extend(cat)
    all_techs.sort(key=len, reverse=True)

    for tech in all_techs:
        escaped = re.escape(tech).replace(r'\.', r'\.?')
        pattern = rf'\b{escaped}\b'
        for m in re.finditer(pattern, text, re.IGNORECASE):
            ctx = text[max(0, m.start()-30):min(len(text), m.end()+30)]
            if '@' in ctx or 'http' in ctx.lower() or 'www.' in ctx.lower():
                continue
            if any(ext in ctx.lower() for ext in ['.com', '.org', '.net', '.edu', '.gov']):
                continue
            skills.add(tech.lower())
    return skills

def extract_from_skills_section(skills_text: str):
    skills = set()
    separators = [',',';','|','\n','•','-','*']
    items = [skills_text]
    for sep in separators:
        new_items = []
        for item in items:
            new_items.extend(item.split(sep))
        items = new_items
    for item in items:
        item = item.strip()
        if item and 2 <= len(item) <= 30:
            item = re.sub(r'^(programming\s+)?(languages?:?\s*)', '', item, flags=re.I)
            item = re.sub(r'^(technologies?:?\s*)', '', item, flags=re.I)
            item = item.strip()
            if item and not contains_personal_info(item):
                skills.add(item.lower())
    return skills

def extract_programming_languages(text: str):
    languages = set()
    patterns = [
        r'programming\s+languages?:?\s*([^.]+)',
        r'languages?:?\s*([^.]+)',
        r'proficient\s+in:?\s*([^.]+)',
        r'experienced\s+with:?\s*([^.]+)'
    ]
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.I)
        for match in matches:
            lang_text = match.group(1)
            for lang in re.split(r'[,;|]', lang_text):
                t = lang.strip().lower()
                if t in {'python','java','javascript','typescript','c++','c#','c','php','ruby','go','rust','kotlin','swift','scala','r','matlab','perl','lua','dart','html','css','sql'}:
                    languages.add(t)
    return languages

def contains_personal_info(text: str):
    if PHONE_RE.search(text) or EMAIL_RE.search(text):
        return True
    if re.search(r'\b(street|avenue|road|drive|lane)\b', text, re.I):
        return True
    if re.search(r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\b', text, re.I):
        return False
    return False

def clean_skill_text(skill: str):
    skill = re.sub(r'^(the\s+|a\s+|an\s+)', '', skill, flags=re.I)
    skill = re.sub(r'(ing|ed|er|ly)$', '', skill)
    skill = re.sub(r'[^\w\s\-\+\.#]', '', skill)
    skill = skill.strip().lower()
    normalizations = {'js':'javascript','ts':'typescript','nodejs':'node.js','reactjs':'react','c++':'cpp','c#':'csharp'}
    return normalizations.get(skill, skill)

def is_legitimate_skill(skill: str):
    if not skill or len(skill) < 2 or len(skill) > 25:
        return False
    if contains_personal_info(skill):
        return False
    if not re.search(r'[a-zA-Z]', skill):
        return False
    non_skills = {
        'and','or','with','the','a','an','in','on','at','to','for','of','as',
        'this','that','these','those','my','me','i','you','he','she','it',
        'we','they','am','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','could','should',
        'contact','phone','email','address','street','city','state','country',
        'university','college','school','student','bachelor','master','degree',
        'years','year','month','day','time','work','job','position','role'
    }
    return skill not in non_skills

# ---------- Summary helpers ----------
def categorize_skills(skills):
    categories = {'programming_languages': [], 'web_technologies': [], 'databases': [], 'tools_frameworks': [], 'other': []}
    programming_langs = {'python','java','javascript','typescript','c++','c#','php','ruby','go','rust','kotlin','swift','c','sql'}
    web_techs = {'html','css','react','angular','vue','node.js','express','django','flask','bootstrap','jquery'}
    databases = {'mysql','postgresql','mongodb','redis','sqlite','oracle'}
    tools = {'git','github','docker','kubernetes','aws','azure','jenkins','webpack','babel'}
    for skill in skills:
        s = skill.lower()
        if s in programming_langs:
            categories['programming_languages'].append(skill)
        elif s in web_techs:
            categories['web_technologies'].append(skill)
        elif s in databases:
            categories['databases'].append(skill)
        elif s in tools:
            categories['tools_frameworks'].append(skill)
        else:
            categories['other'].append(skill)
    return categories

def create_skill_summary(skill_categories):
    parts = []
    if skill_categories['programming_languages']:
        parts.append(f"programming languages including {', '.join(skill_categories['programming_languages'][:3])}")
    if skill_categories['web_technologies']:
        parts.append(f"web technologies such as {', '.join(skill_categories['web_technologies'][:3])}")
    if skill_categories['databases']:
        parts.append(f"database systems like {', '.join(skill_categories['databases'][:2])}")
    if skill_categories['tools_frameworks']:
        parts.append(f"development tools including {', '.join(skill_categories['tools_frameworks'][:2])}")
    if not parts and skill_categories['other']:
        parts.append(f"various technologies including {', '.join(skill_categories['other'][:5])}")
    return (', '.join(parts[:-1]) + f", and {parts[-1]}") if len(parts) > 1 else (parts[0] if parts else "multiple technical areas")

def extract_experience_highlights(experience_text):
    if not experience_text or len(experience_text) < 20: return None
    action_verbs = ['developed','created','implemented','designed','built','managed','led','worked']
    for sentence in experience_text.split('.'):
        s = sentence.strip()
        if any(v in s.lower() for v in action_verbs) and len(s) > 20:
            return (s[:100] + '...').lower() if len(s) > 100 else s.lower()
    tech_mentions = []
    for k in ['web application','full-stack','ai algorithms','software engineering','database','api']:
        if k in experience_text.lower():
            tech_mentions.append(k)
    if tech_mentions:
        return f"work with {', '.join(tech_mentions[:3])}"
    return "software development and technical projects"

def extract_project_highlights(projects_text):
    if not projects_text or len(projects_text) < 20: return None
    project_keywords = ['simulation','web application','application','system','platform','tool']
    tech_keywords = ['city environment','streaming service','resource management','efficiency','simplicity']
    found_projects = [k for k in project_keywords if k in projects_text.lower()]
    found_techs = [k for k in tech_keywords if k in projects_text.lower()]
    if found_projects and found_techs:
        return f"{found_projects[0]} development with focus on {found_techs[0]}"
    elif found_projects:
        return f"{found_projects[0]} development"
    elif found_techs:
        return f"projects focusing on {found_techs[0]}"
    return "software development projects"

def create_fallback_summary(personal_info, skills, sections):
    parts = []
    if personal_info.get('name'):
        parts.append(f"{personal_info['name']} is a software professional")
    else:
        parts.append("Software professional")
    if skills:
        parts.append(f"skilled in {', '.join(skills[:3])}" if len(skills) < 5 else f"with expertise in {len(skills)} technologies including {', '.join(skills[:3])}")
    if sections.get('education'):
        parts.append("with relevant educational background")
    if sections.get('experience'):
        parts.append("and practical work experience")
    return ". ".join(parts) + "."

def generate_cv_summary(text: str, personal_info: dict, sections: dict, skills: list):
    try:
        bits = []
        if personal_info.get('name'):
            bits.append(f"{personal_info['name']} is a")
        else:
            bits.append("This candidate is a")

        education_level = "professional"
        if sections.get('education'):
            edu = sections['education'].lower()
            if 'bachelor' in edu or 'computer science' in edu:
                education_level = "computer science graduate"
            elif 'master' in edu:
                education_level = "master's degree holder"
            elif 'phd' in edu or 'doctorate' in edu:
                education_level = "PhD holder"
            elif 'student' in edu:
                education_level = "computer science student"

        if skills:
            cats = categorize_skills(skills)
            bits.append(f"{education_level} with expertise in {create_skill_summary(cats)}")
        else:
            bits.append(education_level)

        if sections.get('experience'):
            h = extract_experience_highlights(sections['experience'])
            if h:
                bits.append(f"Experience includes {h}")
        if sections.get('projects'):
            p = extract_project_highlights(sections['projects'])
            if p:
                bits.append(f"Notable projects involve {p}")

        base = ". ".join(bits)
        base = re.sub(r'\.+', '.', base)
        if not base.endswith('.'):
            base += '.'

        if summarizer and len(base) > 50:
            try:
                detailed = (
                    f"Professional Summary: {base}\n"
                    f"Technical Skills: {', '.join(skills[:10])}\n"
                    f"Background: {sections.get('education','')[:200]}\n"
                    f"Experience: {sections.get('experience','')[:200]}"
                )
                out = summarizer(detailed, max_length=80, min_length=30, do_sample=False, truncation=True)
                ai_text = out[0]['summary_text'].strip()
                if len(ai_text) > 20 and not ai_text.startswith('Professional Summary'):
                    return ai_text
            except Exception as e:
                logger.warning(f"AI summary generation failed: {e}")

        return base
    except Exception as e:
        logger.warning(f"Error generating summary: {e}")
        return create_fallback_summary(personal_info, skills, sections)

# ---------- Public API ----------
def parse_resume(file_path: str):
    try:
        text = extract_text(file_path)
        original_text = text
        norm_text = re.sub(r'\s+', ' ', text).strip()

        logger.info(f"Extracted text length: {len(norm_text)} characters")
        logger.info(f"First 100 chars: {repr(norm_text[:100])}")

        personal_info = extract_personal_info(original_text)
        sections = extract_sections(norm_text)
        skills = extract_skills(norm_text)
        summary = generate_cv_summary(norm_text, personal_info, sections, skills)

        return {
            "personal_info": personal_info,
            "sections": sections,
            "skills": skills,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise

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
        "summary": summary
    }
