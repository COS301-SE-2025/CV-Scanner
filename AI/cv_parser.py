import os
import re
import logging
import tempfile

from typing import Dict
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
# removed top-level transformers import to avoid import-time failures
# transformers.pipeline will be imported lazily inside AIExtractor
from pydantic import BaseModel, Field
from typing import List, Dict, Optional


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


class Experience(BaseModel):
    company: str = Field(description="Company name")
    position: str = Field(description="Job title/position")
    duration: str = Field(description="Employment duration (e.g., '2020-2023', 'Jan 2020 - Present')")
    description: str = Field(description="Job responsibilities and achievements")
    location: Optional[str] = Field(default=None, description="Job location")

class Education(BaseModel):
    institution: str = Field(description="School/University name")
    degree: str = Field(description="Degree type and field (e.g., 'Bachelor of Science in Computer Science')")
    duration: str = Field(description="Study duration")
    gpa: Optional[str] = Field(default=None, description="GPA if mentioned")
    location: Optional[str] = Field(default=None, description="Institution location")

class PersonalInfo(BaseModel):
    name: str = Field(description="Full name")
    email: Optional[str] = Field(default=None, description="Email address")
    phone: Optional[str] = Field(default=None, description="Phone number")

class CVData(BaseModel):
    personal_info: PersonalInfo
    summary: Optional[str] = Field(default=None, description="Professional summary or objective")
    skills: List[str] = Field(description="List of technical and soft skills")
    experience: List[Experience] = Field(description="Work experience entries")
    education: List[Education] = Field(description="Educational background")
    certifications: List[str] = Field(default=[], description="Professional certifications")
    projects: List[Dict[str, str]] = Field(default=[], description="Notable projects")
    languages: List[str] = Field(default=[], description="Programming/spoken languages")

class AIExtractor:
    """
    Lazy-load transformers pipelines inside the constructor and continue working
    with heuristic extractors if transformers or torchvision are unavailable.
    """
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        logger.info(f"Using device: {'GPU' if self.device == 0 else 'CPU'}")
        self.extractor = None
        self.generator = None
        self.summerizer = None

        try:
            # import pipeline here to avoid heavy import at module load time
            from transformers import pipeline  # type: ignore

            # token classification (NER-like)
            try:
                self.extractor = pipeline(
                    "token-classification",
                    model="dslim/bert-base-NER",
                    device=self.device,
                    aggregation_strategy="simple",
                )
                logger.info("Text extraction model loaded successfully")
            except Exception as e:
                logger.warning(f"Token-classification pipeline init failed: {e}")
                self.extractor = None

            # text generation (optional)
            try:
                self.generator = pipeline(
                    "text-generation",
                    model="microsoft/DialoGPT-medium",
                    device=self.device,
                    max_length=512,
                    truncation=True,
                )
                logger.info("Text generation model loaded successfully")
            except Exception as e:
                logger.warning(f"Text-generation pipeline init failed: {e}")
                self.generator = None

            # summarization (optional)
            try:
                self.summerizer = pipeline(
                    "summarization",
                    model="facebook/bart-large-cnn",
                    device=self.device,
                    max_length=150,
                    min_length=30,
                    do_sample=False,
                )
                logger.info("Summarization model loaded successfully")
            except Exception as e:
                logger.warning(f"Summarization pipeline init failed: {e}")
                self.summerizer = None

        except Exception as imp_err:
            # Log transformer import failures (e.g. torchvision circular import)
            logger.warning("transformers.pipeline unavailable; continuing without ML pipelines: %s", imp_err)
            self.extractor = None
            self.generator = None
            self.summerizer = None

    def extract_with_ai_prompting(self, cv_text: str) -> Dict[str, any]:
        """Use AI prompting to extract structured data from CV text"""
        clean_text = self._clean_text(cv_text)

        personal_info = self._extract_personal_info(clean_text)
        skills = self._extract_skills(clean_text)
        experience = self._extract_experience(clean_text)
        education = self._extract_education(clean_text)

        summary = self._generate_professional_candidate_summary(
        personal_info, skills, experience, education, clean_text
    )

        return {
        "personal_info": personal_info,
        "skills": skills,
        "experience": experience,
        "education": education, 
        "summary": summary,
        "projects": self._extract_projects(clean_text),
        "languages": self._extract_languages(clean_text)
    } 

    def _generate_professional_candidate_summary(self, personal_info: Dict, skills: List, 
                                           experience: List, education: List, text: str) -> str:
        """Generate a fluid sentence describing the CV and the person using AI summarization."""
    
        if self.summerizer:
            try:
                clean_text = text[:2000] if len(text) > 2000 else text
                result = self.summerizer(clean_text, max_length=150, min_length=40, do_sample=False)
                summary = result[0]['summary_text'].strip()
                if not summary.endswith('.'):
                    summary += '.'
                return summary
            except Exception as e:
                logger.warning(f"Summarization failed: {e}")

        name = personal_info.get('name', 'The candidate')
        if name and name != 'Name not found' or name == 'Phone Number':
            name = 'The candidate'

        parts = []

        if name != 'The candidate':
            parts.append(f"{name} is")
        else:
            parts.append("The candidate is")

        text_lower = text.lower()
        professional_level = self._determine_professional_level(skills, experience, education, text)
        parts.append(professional_level)

        if education:
            highest_edu = education[0]
            parts.append(f"with education from {highest_edu}")

        if experience:
            exp_years = self._calculate_experience_years(experience)
            if exp_years > 0:
                parts.append(f"and over {exp_years} years of experience")

        specialization = self._determine_specialization(skills, text)
        if specialization:
            parts.append(f"specializing in {specialization}")

        summary = ' '.join(parts) + '.'
        summary = self._clean_sentence(summary)

        return summary


    def _extract_projects(self, text: str) -> list[str]:
        """
        Extract project entries from CV text.
        Returns a list of strings (each = one project).
        """

        projects = []

    
        blocks = re.split(r"(?:PROJECTS?|ACADEMIC\s+PROJECTS?|PERSONAL\s+PROJECTS?)[:\n]", text, flags=re.I)
        if len(blocks) <= 1:
            return []

        content = blocks[1:]

        for block in content:
            lines = [l.strip() for l in block.split("\n") if l.strip()]
            if not lines:
                continue

            project_text = " ".join(lines)
            projects.append(project_text)

        return projects


    def _find_duration(self, text: str) -> str:
        match = re.search(r"(\b\d+\s*(?:months?|years?)\b)", text, flags=re.I)
        return match.group(1) if match else ""

    def _find_technologies(self, text: str) -> List[str]:
        tech_keywords = ["python", "java", "c++", "node.js", "react", "flask", "django", "sql", "aws", "docker"]
        return [t for t in tech_keywords if re.search(rf"\b{re.escape(t)}\b", text, re.I)]

    def _extract_languages(self, text: str) -> List[str]:
        """Extract spoken languages from CV text"""
        spoken_languages = [
        'english', 'afrikaans', 'zulu', 'xhosa', 'sotho', 
        'french', 'german', 'spanish', 'portuguese', 'italian',
        'mandarin', 'hindi', 'arabic', 'swahili'
        ]
    
        text_lower = text.lower()
        found_languages = [lang.title() for lang in spoken_languages if lang in text_lower]
    
        return list(set(found_languages))


    def _determine_professional_level(self, skills: List[str], experience: List[str], education: List[str], text: str) -> str:
        text_lower = text.lower()

        senior_terms = ['senior', 'sr.', 'lead', 'principal', 'staff', 'head', 'director', 'manager']
        junior_terms = ['junior', 'entry level', 'graduate', 'associate', 'intern', 'trainee']

        if any(term in text_lower for term in senior_terms):
            return "Senior Professional"
        elif any(term in text_lower for term in junior_terms):
            return "Junior Professional"

        if experience:
            total_positions = len(experience)
            if total_positions >= 3:
                return "Experienced Professional"

        return "Professional"

    def _get_highest_education(self, education: List[str]) -> str:
        """Get highest education level from simple education array"""
        if not education:
            return ""
    
        return education[0] if education else ""

    def _calculate_experience_years(self, experience: List[str]) -> int:
        """Calculate approximate years of experience from experience entries"""
        try:
            return min(len(experience) * 2, 20)
        except:
            return 0

    def _determine_specialization(self, skills: List[str], text: str) -> str:
        skill_text_lower = text.lower()
    
    
        specializations_map = {
            "Frontend Development": ['react', 'angular', 'vue', 'frontend', 'javascript', 'html', 'css', 'typescript'],
            "Backend Development": ['python', 'java', 'c#', 'c++', 'node.js', 'backend', 'api', 'spring', 'django', 'flask'],
            "AI/ML / Data Science": ['machine learning', 'ai', 'tensorflow', 'pytorch', 'data science', 'nlp', 'deep learning', 'scikit-learn'],
            "Cloud / DevOps": ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'devops', 'cloud', 'terraform'],
            "Mobile Development": ['android', 'ios', 'react native', 'flutter', 'swift', 'kotlin'],
            "Cybersecurity": ['security', 'pentest', 'ethical hacking', 'network security', 'encryption'],
            "Business / Management": ['mba', 'business', 'management', 'finance', 'accounting', 'economics', 'marketing', 'strategy'],
            "Engineering": ['mechanical', 'civil', 'electrical', 'chemical', 'engineering', 'mechatronics', 'aerospace'],
            "Law": ['law', 'llb', 'legal', 'attorney', 'juris', 'lawyer'],
            "Medicine / Healthcare": ['medical', 'medicine', 'md', 'nursing', 'healthcare', 'pharmacy', 'doctor', 'clinical'],
            "Arts / Design": ['art', 'design', 'graphic', 'visual', 'painting', 'fashion', 'music', 'creative'],
            "Education / Research": ['phd', 'research', 'education', 'teaching', 'professor', 'academic', 'scholarship'],
        }

        specializations = []
        for specialization, keywords in specializations_map.items():
            if any(term in skill_text_lower for term in keywords):
                specializations.append(specialization)

        return specializations


    def _clean_sentence(self, s: str) -> str:
        s = s.strip()
        if not s:
            return s
        if not s.endswith('.'):
            s += '.'
        s = s.replace(' a a ', ' a ')
        s = s.replace(' is a an ', ' is an ')
        s = s.replace(' is an a ', ' is a ')
        s = re.sub(r'\s+', ' ', s)
        return s

    def _extract_education(self, text: str) -> List[str]:
        """Extract education information as simple array of strings"""
        education_entries = []
    
        # Find education section
        edu_section = self._find_section(text, ['education', 'academic background', 'qualifications', 'educational background', 'degrees'])
        if not edu_section:
            return education_entries
    
        # Split into potential entries
        entries = re.split(r'\n\s*\n', edu_section)

        for entry in entries:
            if len(entry.strip()) > 20:  # Minimum length for meaningful entry
                # Clean and extract the main education line
                lines = [line.strip() for line in entry.split('\n') if line.strip()]
                if lines:
                    # Take the most meaningful line (usually first line)
                    main_line = lines[0]
                
                    # Clean up the line
                    clean_entry = self._clean_education_entry(main_line)
                    if clean_entry and len(clean_entry) > 10:  # Ensure it's meaningful
                        education_entries.append(clean_entry)
    
        return education_entries[:10]  # Limit to 10 entries

    def _clean_education_entry(self, entry: str) -> str:
        """Clean and format education entry"""

        entry = re.sub(r'^(?:•|\-|\*|\d+\.?)\s*', '', entry)
        entry = re.sub(r'\s*[\(\[].*?[\)\]]', '', entry)  
        entry = re.sub(r'\b(?:Duration|Dates?|Year):.*$', '', entry, flags=re.IGNORECASE)
        entry = re.sub(r'\bGPA:.*$', '', entry, flags=re.IGNORECASE)

        entry = re.sub(r'\s+', ' ', entry).strip()

        words = entry.split()
        filtered_words = []
        for word in words:
            if not (re.match(r'^\d{4}$', word) or 
                re.match(r'^\d{4}[-–]\d{4}$', word) or
                word.lower() in ['present', 'current']):
                filtered_words.append(word)
    
        clean_entry = ' '.join(filtered_words).strip()
    

        clean_entry = re.sub(r',\s*,', ',', clean_entry)  
        clean_entry = re.sub(r'\s+$', '', clean_entry)  
    
        return clean_entry if len(clean_entry) > 5 else None

    def _parse_education_entry(self, entry: str) -> Dict[str, str]:
        """Parse individual education entry"""
        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if not lines:
            return None
        
        date_pattern = (
        r'\b(?:' 
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}'  
            r'|\d{4}'                                                            
        r')\b'
        r'\s*[-——to]+\s*'                                                        
        r'\b(?:'
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}'  
            r'|\d{4}'                                                            
            r'|Present|Current'                                                  
        r')\b'
        )

        dates = re.findall(date_pattern, entry, re.IGNORECASE)
        duration = " - ".join(dates) if len(dates) >= 2 else "Duration not found"

        first_line = lines[0]
        institution, degree = self._extract_institution_degree(first_line, lines)

        return {
                'institution': institution or 'Educational institution',
                'degree': degree or first_line[:80],
                'duration': duration,
                'location': None
        }

    def _extract_institution_degree(self, first_line: str, all_lines: List[str]) -> tuple[str, str]:
        """Extract institution and degree from education entry"""

        if ' at ' in first_line:
            parts = first_line.split(' at ', 1)
            return parts[1].strip(), parts[0].strip()
        elif ', ' in first_line:
            parts = first_line.split(', ', 1)
            return parts[1].strip(), parts[0].strip()

        institution_keywords = ['University', 'College', 'School', 'Institute', 'Academy']
        for line in all_lines:
            for keyword in institution_keywords:
                if keyword in line:
                    return line.strip(), first_line.strip()
        
        return None, first_line.strip()

    def _extract_experience(self, text: str) -> List[str]:
        """
        Extract experience entries from CV text.
        Returns a list of strings (each = one experience).
        """
        import re

        experiences = []

        # Look for sections that mention work/experience
        blocks = re.split(r"(?:EXPERIENCE|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EMPLOYMENT\s+HISTORY)[:\n]", text, flags=re.I)
        if len(blocks) <= 1:
            return []

        content = blocks[1:]

        for block in content:
            # Split into lines, keep non-empty
            lines = [l.strip() for l in block.split("\n") if l.strip()]
            if not lines:
                continue

            # Treat contiguous lines as one experience entry
            exp_text = " ".join(lines)

            # Optional cleanup: stop if another section starts (like "Education" or "Skills")
            exp_text = re.split(r"(EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)[:\n]", exp_text, flags=re.I)[0].strip()

            if exp_text:
                # Break into smaller entries if bullet points or dashes are used
                entries = re.split(r"(?:•|-|\*)\s+", exp_text)
                for e in entries:
                    e = e.strip()
                    if e:
                        experiences.append(e)

        return experiences

    def _clean_experience_entry(self, entry: str) -> str:
        """Clean and format experience entry"""
        entry = re.sub(r'^(?:•|\-|\*|\d+\.?)\s*', '', entry) 
        entry = re.sub(r'\s*[\(\[].*?[\)\]]', '', entry) 
    
        entry = re.sub(r'\s+', ' ', entry).strip()
    
        words = entry.split()
        filtered_words = []
        for word in words:
            if not (re.match(r'^\d{4}$', word) or 
                re.match(r'^\d{4}[-–]\d{4}$', word) or
                word.lower() in ['present', 'current', 'duration', 'dates']):
                filtered_words.append(word)
    
        clean_entry = ' '.join(filtered_words).strip()
    
        clean_entry = re.sub(r',\s*,', ',', clean_entry) 
        clean_entry = re.sub(r'\s+$', '', clean_entry)  
    
        return clean_entry if len(clean_entry) > 10 else None 

    def _parse_experience_entry(self, entry: str) -> Dict[str, str]:

        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if len(lines) < 2:
            return None
        
        date_pattern = (
        r'\b(?:' 
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}'  
            r'|\d{4}'                                                            
        r')\b'
        r'\s*[-–—to]+\s*'                                                        
        r'\b(?:'
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}'  
            r'|\d{4}'                                                            
            r'|Present|Current'                                                  
        r')\b'
        )
        dates = re.findall(date_pattern, entry, re.IGNORECASE)
        duration = " - ".join(dates) if len(dates) > 2 else "Duration not found"

        first_line = lines[0]
        company, position  = self._extract_company_position(first_line)

        description = ' '.join(lines[1:])[:500]

        return {
            'company': company or 'Company information',
                'position': position or first_line[:60],
                'duration': duration,
                'description': description
        }

    def _extract_company_position(self, line: str) -> tuple[str, str]:
        """Extract company name and position from a line"""
        if ' at ' in line:
            parts = line.split(' at ', 1)
            return parts[1].strip(), parts[0].strip()
        elif ' - ' in line:
            parts = line.split(' - ', 1)
            return parts[0].strip(), parts[1].strip()
        elif ', ' in line and len(line.split(', ')) == 2:
            parts = line.split(', ', 1)
            return parts[1].strip(), parts[0].strip()
        
        return None, line.strip()

    def _clean_text(self,text:str) ->str:
        """Clean and normalize CV text"""
        text = re.sub(r'\n\s*\n', '\n\n',text)
        text = re.sub(r'[ \t]+', ' ', text)
        return text

    def _extract_personal_info(self, text: str) -> Dict[str, str]:
        """Extract personal information with improved name detection"""

        info = {
            'name':'Name not found',
            'email': None,
            'phone': None,
        }

        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_match = re.search(email_pattern, text)
        if email_match:
            info['email'] = email_match.group()
        
        phone_pattern = r'(\+?27|0)[\s-]?(\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4}|\d{2,3}[\s-]?\d{3,4}[\s-]?\d{4})'
        phone_match = re.search(phone_pattern, text)
        if phone_match:
            info['phone'] = phone_match.group().strip()
        
        lines  = text.split('\n')
        candidate_names = []
        for i, line in enumerate(lines[:10]):
            if len(line) > 3 and len(line) <50:
                if any(indicator in line.lower() for indicator in[
                    '@', 'http', 'linkedin', 'github', 'phone', 'mobile', 'tel:', 'email', 'resume', 'cv'
                ]):
                    continue
                words=line.split()
                if 2<=len(words) <=4:
                    capital_words = sum(1 for w in words if w and w[0].isupper())
                    if capital_words >=len(words) *0.8:
                        exclude_keywords = [
                            'experience', 'education', 'skills', 'projects', 'certifications',
                                'summary', 'objective', 'references', 'awards', 'publications'
                        ]
                        if not any(kw in line.lower() for kw in exclude_keywords):
                            candidate_names.append(line.strip())
        if candidate_names:
            info['name'] = candidate_names[0]

        if info['name'] and info['name'] != 'Name not found':
            info['name'] = self._capitalize_name(info['name'])

        if info['name'] in ['Name not found', 'Phone Number'] and info['email']:
                email_name = info['email'].split('@')[0]
                clean_name = re.sub(r'[0-9._+-]+', ' ', email_name).title().strip()
                if len(clean_name) > 3:
                    info['name'] = clean_name

        if info['name'] and info['name'] not in ['Name not found', 'Phone Number']:
            info['name'] = self._capitalize_name(info['name'])

        return info


    def _capitalize_name(self, name: str) -> str:
        """Capitalize name properly: first letter of each word uppercase, rest lowercase"""
        if not name:
            return name
        words = name.split()
        capitalized_words = []
        for word in words:
            if word:
                capitalized_words.append(word[0].upper() + word[1:].lower())
        return ' '.join(capitalized_words)

    def _extract_skills(self, text: str) -> List[str]:
            """Extract skills using keyword matching and context"""
            text_lower = text.lower()

            skills_dict = {
                "tech": [
                    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
                    'node.js', 'express', 'django', 'flask', 'spring', 'c++', 'c#', 'go', 'rust',
                    'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'jquery',
                    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle',
                    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
                    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy'
                ],
                "design": [
                    'figma', 'adobe xd', 'sketch', 'photoshop', 'illustrator', 'indesign',
                    'after effects', 'premiere pro', '3ds max', 'autocad', 'solidworks'
                ],
                "business": [
                    'business analysis', 'data analysis', 'financial modeling', 'accounting',
                    'bookkeeping', 'budgeting', 'forecasting', 'erp', 'sap', 'crm',
                    'excel', 'power bi', 'tableau', 'ms office'
                ],
                "healthcare": [
                    'patient care', 'first aid', 'cpr', 'emr', 'surgery assistance', 'nursing',
                    'phlebotomy', 'medication administration', 'medical coding', 'hipaa compliance'
                ],
                "education": [
                    'curriculum development', 'lesson planning', 'teaching', 'mentoring',
                    'tutoring', 'classroom management', 'educational technology'
                ],
                "sales_marketing": [
                    'seo', 'sem', 'social media', 'digital marketing', 'content creation',
                    'copywriting', 'salesforce', 'lead generation', 'market research',
                    'customer relationship management'
                ],
                "soft": [
                    'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
                    'time management', 'project management', 'agile', 'scrum', 'kanban',
                    'analytical skills', 'creativity', 'adaptability', 'collaboration', 'mentoring',
                    'public speaking', 'presentation', 'negotiation', 'strategic planning'
                ],
                "trades": [
                    'plumbing', 'electrical wiring', 'carpentry', 'welding', 'machining',
                    'hvac', 'blueprint reading', 'forklift operation', 'osha compliance'
                ]
            }

            all_skills = [skill for group in skills_dict.values() for skill in group]

            found_skills = []

            skill_sections = self._find_section(text, ['skills', 'technical skills', 'competencies', 'strengths'])
            if skill_sections:
                section_lower = skill_sections.lower()
                for skill in all_skills:
                    if skill in section_lower:
                        found_skills.append(skill)

            context_patterns = ["proficient in", "expertise in", "skilled in",
                "experience with", "knowledge of", "familiar with"]
            
            for skill in all_skills:
                if skill in text_lower:
                    if any(f"{ctx} {skill}" in text_lower for ctx in context_patterns) \
                        or any(symbol in text_lower for symbol in [f" {skill},", f" {skill}.", f" {skill};", f" {skill}."]):
                        found_skills.append(skill.title())
            
            seen = set()
            unique_skills = []
            for skill in found_skills:
                if skill not in seen:
                    seen.add(skill)
                    unique_skills.append(skill)

            return unique_skills[:20]

    def _find_section(self, text:str, keywords:List[str]) -> str:
        """Find and extract a specific section from CV text"""
        lines = text.split('\n')
        start_section = -1

        for i, line in enumerate(lines):
            line_lower = line.strip().lower()
            if any(kw in line_lower for kw in keywords) and len(line.strip()) <100:
                start_section = i
                break

        if start_section == -1:
            return ""
        
        common_headers = ['experience', 'education', 'skills', 'projects', 'contact', 
                             'summary', 'objective', 'certifications', 'languages', 'references']
        section_end = len(lines)

        for i in range(start_section + 1, len(lines)):
            line_lower = lines[i].strip().lower()
            if any(header in line_lower for header in common_headers) and len(lines[i].strip()) <100:
                section_end = i
                break

        return "\n".join(lines[start_section + 1:section_end]) if start_section != -1 else ""

# def extract_personal_info(text: str):

# def extract_sections(text: str) -> Dict[str, str]:

def parse_resume_from_bytes(file_bytes: bytes, filename: str):
    ext = os.path.splitext(filename or "upload.bin")[1].lower()
    if ext not in (".pdf", ".docx", ".txt"):
        original = file_bytes.decode("utf-8", errors="ignore")
    else:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            tmp.close()
            original = extract_text(tmp.name)
        try: os.unlink(tmp.name)
        except: pass

    extractor = AIExtractor()
    ai_result = extractor.extract_with_ai_prompting(original)

    return {
        "personal_info": ai_result["personal_info"],
        "sections": {
            "experience": str(ai_result.get("experience", [])),
            "education": str(ai_result.get("education", [])),
            "projects": str(ai_result.get("projects", []))
        },
        "skills": ai_result.get("skills", []),
        "summary": ai_result.get("summary", "No summary available"),
        "ai_extracted": True,
        "certifications": ai_result.get("certifications", []),
        "languages": ai_result.get("languages", [])
    }