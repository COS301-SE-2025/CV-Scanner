import os
import re
import logging
import tempfile
from transformers import pipeline
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
    summarizerPipeline = pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
        device=0 if torch.cuda.is_available() else -1
    )
    logger.info("Summarization model loaded successfully")
except Exception as e:
    logger.warning(f"Could not load summarization model: {e}")
    summarizerPipeline = None

try:
    extractor = pipeline(
        "text2text-generation",
        model="facebook/bart-large-cnn",
        device=0 if torch.cuda.is_available() else -1
    )
    logger.info("Text extraction model loaded successfully")
except Exception as e:
    logger.warning(f"Could not load text extraction model: {e}")
    extractor = None

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
# Enhanced phone regex to capture more formats including (xxx) xxx-xxxx, +xx xxx xxx xxxx, etc.
PHONE_RE = re.compile(r"(?:\+?\d{1,4}[\s\-\.]?)?(?:\(?\d{2,4}\)?[\s\-\.]?)?\d{2,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{0,4}", re.I)

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

        self.extractor = extractor
        self.summerizer = summarizerPipeline

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
        "languages": self._extract_languages(clean_text),
        "personality_traits": self._extract_personality_traits(clean_text)
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
        Extract project entries using regex-based heuristic approach.
        Returns a list of strings (each = one project).
        """
        
        logger.info("=== Starting regex-based project extraction ===")
        logger.info(f"Text length: {len(text)}")
        
        projects = []
        
        # First, look for dedicated project sections
        project_sections = self._find_section(text, [
            'projects', 'personal projects', 'academic projects', 'undergraduate projects',
            'technical projects', 'project experience', 'project work', 'major projects',
            'key projects', 'significant projects', 'notable projects'
        ])
        
        if project_sections:
            logger.info(f"Found project section: {project_sections[:200]}...")
            
            # Split projects by common delimiters
            potential_projects = re.split(r'\n\s*(?:•|-|\*|\d+\.|\d+\))\s*', project_sections)
            
            for proj in potential_projects:
                proj = proj.strip()
                if len(proj) > 20 and len(proj) < 500:  # Reasonable project description length
                    # Clean up the project entry
                    proj = re.sub(r'\s+', ' ', proj)
                    # Remove common section headers that might leak in
                    if not any(header in proj.lower() for header in ['project', 'experience', 'education', 'skills']):
                        projects.append(proj)
            
            if projects:
                logger.info(f"Found {len(projects)} projects in dedicated section")
                return projects[:8]
        
        # Look for project-like descriptions in experience section
        experience_text = self._find_section(text, ['experience', 'work experience', 'professional experience'])
        if experience_text:
            # Look for lines that describe specific projects or implementations
            lines = experience_text.split('\n')
            
            for line in lines:
                line = line.strip()
                # Look for lines that describe specific technical work/projects
                project_patterns = [
                    r'(?:developed|built|created|implemented|designed|architected|led)\s+.{20,200}',
                    r'(?:project|system|application|platform|solution)\s+.{20,200}',
                    r'(?:worked on|responsible for|managed)\s+.{20,200}(?:project|system|development)',
                    r'.{0,50}(?:migration|upgrade|implementation|deployment|integration).{20,200}'
                ]
                
                for pattern in project_patterns:
                    matches = re.findall(pattern, line, re.IGNORECASE)
                    for match in matches:
                        clean_match = re.sub(r'\s+', ' ', match).strip()
                        if (len(clean_match) > 30 and len(clean_match) < 300 and
                            not any(bad_word in clean_match.lower() for bad_word in ['education', 'school', 'university', 'degree'])):
                            projects.append(clean_match)
        
        # Look for project descriptions throughout the CV
        # Split by paragraphs and sentences to find project-like content
        paragraphs = re.split(r'\n\s*\n', text)
        
        for paragraph in paragraphs:
            # Skip if it's clearly not a project section
            if any(section in paragraph.lower() for section in ['education', 'contact', 'reference', 'skill']):
                continue
                
            # Look for sentences that describe projects
            sentences = re.split(r'[.!?]+', paragraph)
            
            for sentence in sentences:
                sentence = sentence.strip()
                
                # Check if sentence describes a project
                if (len(sentence) > 40 and len(sentence) < 300 and
                    any(keyword in sentence.lower() for keyword in [
                        'developed', 'built', 'created', 'implemented', 'designed',
                        'project', 'system', 'application', 'platform', 'solution'
                    ]) and
                    not any(bad_word in sentence.lower() for bad_word in [
                        'education', 'school', 'university', 'degree', 'bachelor', 'master'
                    ])):
                    
                    clean_sentence = re.sub(r'\s+', ' ', sentence).strip()
                    projects.append(clean_sentence)
        
        # Remove duplicates and similar entries
        unique_projects = []
        for project in projects:
            is_duplicate = False
            for existing in unique_projects:
                # Check if projects are too similar (simple similarity check)
                if len(set(project.lower().split()) & set(existing.lower().split())) > len(project.split()) * 0.7:
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_projects.append(project)
        
        if unique_projects:
            logger.info(f"Found {len(unique_projects)} unique project entries")
            return unique_projects[:6]  # Limit to 6 most relevant projects
        
        logger.info("No projects found")
        return []




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
        Extract experience entries using AI first, then heuristic fallback.
        Returns a list of strings (each = one experience).
        """
        import re

        # Try AI-based extraction first
        logger.info(f"Experience extraction - AI extractor available: {self.extractor is not None}")
        if self.extractor:
            try:
                logger.info("Attempting AI experience extraction...")
                ai_experience_text = self.extract_experience_from_text(text)
                logger.info(f"AI raw response: {ai_experience_text[:200]}...")
                
                if ai_experience_text:
                    # Parse the AI response into individual experience entries
                    ai_experiences = self._parse_experience_from_ai_response(ai_experience_text)
                    logger.info(f"Parsed AI experiences: {ai_experiences}")
                    
                    # Filter out null values and validate experiences
                    valid_experiences = []
                    for exp in ai_experiences:
                        if exp and str(exp).strip() and len(str(exp).strip()) > 15:
                            # Additional check for prompt leakage
                            exp_str = str(exp).strip()
                            if not any(bad_phrase in exp_str.lower() for bad_phrase in [
                                'extract only professional work experience',
                                'from this site', 'jobs, internships, employment'
                            ]):
                                valid_experiences.append(exp_str)
                    
                    if valid_experiences and len(valid_experiences) > 0:
                        logger.info(f"AI extracted {len(valid_experiences)} valid experience entries")
                        return valid_experiences
                    else:
                        logger.warning("AI parsing returned no valid results")
                else:
                    logger.warning("AI returned empty experience text")
            except Exception as e:
                logger.warning(f"AI experience extraction failed: {e}")
                import traceback
                logger.warning(traceback.format_exc())

        # Fallback to heuristic method
        logger.info("Using heuristic experience extraction")
        experiences = []

        # Look for sections that mention work/experience
        blocks = re.split(r"(?:EXPERIENCE|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EMPLOYMENT\s+HISTORY|EMPLOYMENT|WORK\s+HISTORY|CAREER)[:\n]", text, flags=re.I)
        if len(blocks) <= 1:
            # No experience section found - this person might be a student/recent graduate
            logger.info("No work experience section found in CV")
            return ["No professional work experience listed"]

        content = blocks[1:]

        for block in content:
            # Split into lines, keep non-empty
            lines = [l.strip() for l in block.split("\n") if l.strip()]
            if not lines:
                continue

            # Treat contiguous lines as one experience entry
            exp_text = " ".join(lines)

            # Filter out blocks that are clearly projects, not work experience
            project_indicators = [
                'undergraduate projects', 'car blinker', 'tetris', 'simulation', 'xilinx', 'fpga',
                'rshell', 'xv6', 'facebook friends', 'paint shooter', 'unity game', 'tcp',
                'programming languages', 'languages and technologies', 'applications', 'operating systems',
                'activities and interests'
            ]
            
            if any(indicator in exp_text.lower() for indicator in project_indicators):
                logger.info(f"Skipping block that appears to be projects/skills: {exp_text[:100]}...")
                continue

            # Optional cleanup: stop if another section starts (like "Education" or "Skills")
            exp_text = re.split(r"(EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)[:\n]", exp_text, flags=re.I)[0].strip()

            if exp_text and len(exp_text) > 30:
                # Look for work-related indicators (expanded list)
                work_indicators = [
                    'company', 'employer', 'job', 'position', 'intern', 'work', 'employment', 
                    'corporation', 'inc', 'ltd', 'specialist', 'support', 'assistant', 'research', 
                    'technical', 'teacher', 'attorney', 'engineer', 'developer', 'analyst', 
                    'manager', 'consultant', 'administrator', 'coordinator', 'supervisor',
                    'present', 'years', 'experience', 'responsibilities', 'duties', 'role'
                ]
                
                # Also check for date patterns (indicating work periods)
                has_dates = bool(re.search(r'\b(19|20)\d{2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b', exp_text, re.IGNORECASE))
                
                if any(indicator in exp_text.lower() for indicator in work_indicators) or has_dates:
                    # Break into smaller entries if bullet points or dashes are used
                    entries = re.split(r"(?:•|-|\*|\n)\s*", exp_text)
                    for e in entries:
                        e = e.strip()
                        if e and len(e) > 25:  # Lower threshold
                            # Additional cleaning
                            clean_e = re.sub(r'\s+', ' ', e)
                            if clean_e:
                                experiences.append(clean_e)
                else:
                    logger.info(f"Block doesn't contain work indicators: {exp_text[:100]}...")

        # Final cleanup - remove any null/None/empty values
        clean_experiences = []
        for exp in experiences:
            if exp and str(exp).strip() and len(str(exp).strip()) > 10:
                clean_exp = str(exp).strip()
                # Final check for problematic content
                if not any(bad in clean_exp.lower() for bad in [
                    'extract only professional', 'from this site', 'generated for testing'
                ]):
                    clean_experiences.append(clean_exp)
        
        # If we found no valid work experiences, return appropriate message
        if not clean_experiences:
            logger.info("No valid work experience found after filtering")
            return ["No professional work experience found"]
            
        return clean_experiences

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
        
        # Try multiple phone patterns for better detection
        phone_patterns = [
            r'(\+?27|0)[\s-]?(\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4}|\d{2,3}[\s-]?\d{3,4}[\s-]?\d{4})',  # SA format
            r'\(\d{3}\)\s?\d{3}[-\.\s]?\d{4}',  # (951) 284-8744 format
            r'\+?\d{1,4}[\s\-\.]?\(?\d{2,4}\)?[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{0,4}',  # General international
            r'\b\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}\b',  # xxx-xxx-xxxx format
            r'\+?\d{1,4}\s?\d{2,4}\s?\d{2,4}\s?\d{2,4}',  # Spaced format
        ]
        
        phone_found = None
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                candidate = phone_match.group().strip()
                # Validate that it's actually a phone number (has enough digits)
                digit_count = sum(1 for c in candidate if c.isdigit())
                if 7 <= digit_count <= 15:  # Valid phone number digit range
                    phone_found = candidate
                    break
        
        if phone_found:
            info['phone'] = phone_found
        
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

    def extract_skills_from_text(self, text: str) -> str:
        """Extract all technical and professional skills from CV using AI - Simple approach"""
        try:
            if self.extractor:
                # Use a very simple, direct prompt
                prompt = f"Skills: {text[:800]}"
                result = self.extractor(prompt, max_length=80, min_length=5, num_return_sequences=1, do_sample=False)
                response = result[0]['generated_text'].strip()
                return response
            else:
                logger.warning("AI extractor not available, falling back to heuristic method")
                return ""
        except Exception as e:
            logger.warning(f"[Error extracting skills with AI] {e}")
            return ""

    def extract_experience_from_text(self, text: str) -> str:
        """Extract all professional experience entries from CV using AI"""
        # Find and extract just the experience section first
        experience_section = self._find_section(text, ['experience', 'work experience', 'professional experience', 'employment history', 'employment', 'work history', 'career'])
        
        # If no experience section found, this CV might not have work experience
        if not experience_section or len(experience_section.strip()) < 30:
            logger.info("No work experience section found or section too small")
            return ""
        
        logger.info(f"Found experience section: {experience_section[:200]}...")
        
        # Check if the section contains ONLY projects/academic content (not mixed with real work)
        project_indicators = ['undergraduate projects', 'academic projects', 'coursework projects']
        work_indicators = ['inc.', 'corp.', 'company', 'specialist', 'assistant', 'support', 'intern', 'employee']
        
        has_projects = any(indicator in experience_section.lower() for indicator in project_indicators)
        has_work = any(indicator in experience_section.lower() for indicator in work_indicators)
        
        if has_projects and not has_work:
            logger.info("Section appears to contain only projects/academic work, not professional experience")
            return ""
        
        experience_section = experience_section[:1000]  # Limit section size
        
        # Use a more specific prompt to get actual work experience
        prompt = f"Extract only professional work experience (jobs, internships, employment) from: {experience_section}"
        
        try:
            if self.extractor:
                logger.info(f"Using prompt: {prompt[:100]}...")
                result = self.extractor(prompt, max_length=200, min_length=20, num_return_sequences=1, do_sample=False)
                experience = result[0]['generated_text'].strip()
                logger.info(f"Raw AI experience response: {experience}")
                
                # Filter out responses that are just instruction echoes or completely unrelated
                bad_phrases = [
                    'for each experience', 'include company name', 'job title', 'duration',
                    'graduate of', 'bachelor degree', 'master degree', 'phd',
                    'car blinker system', 'tetris led game', 'rshell', 'xv6', 'paint shooter'
                ]
                
                # Only filter if response contains these specific project names or instruction echoes
                if any(bad_phrase in experience.lower() for bad_phrase in bad_phrases):
                    logger.warning(f"AI response contains instruction echo or specific project names, filtered out")
                    return ""
                
                # More lenient work-related validation - accept technical/professional content
                work_indicators = [
                    'company', 'employer', 'job', 'position', 'intern', 'work', 'employment', 'corporation', 'inc', 'ltd', 
                    'specialist', 'support', 'assistant', 'research', 'database', 'administrator', 'engineer', 'developer',
                    'analyst', 'consultant', 'manager', 'technician', 'coordinator', 'supervisor', 'lead', 'senior',
                    'installing', 'configuring', 'maintaining', 'managing', 'developing', 'implementing', 'designing',
                    'administering', 'monitoring', 'troubleshooting', 'optimizing', 'creating', 'building', 'deploying',
                    'oracle', 'sql', 'database', 'server', 'network', 'system', 'application', 'software', 'hardware',
                    'client', 'customer', 'project', 'team', 'responsibility', 'experience', 'skills', 'knowledge'
                ]
                
                # Only filter if response is clearly not work experience (education/projects/gibberish)
                non_work_indicators = [
                    'bachelor degree', 'master degree', 'phd', 'university', 'college', 'school', 'graduation',
                    'car blinker', 'tetris', 'paint shooter', 'rshell', 'xv6', 'undergraduate project'
                ]
                
                # Accept if it contains work indicators OR if it's substantial professional content
                has_work_terms = any(indicator in experience.lower() for indicator in work_indicators)
                has_non_work = any(indicator in experience.lower() for indicator in non_work_indicators)
                is_substantial = len(experience.split()) > 8  # Has enough content
                
                if has_non_work:
                    logger.warning(f"AI response contains education/project content, filtered out: {experience}")
                    return ""
                elif not has_work_terms and not is_substantial:
                    logger.warning(f"AI response doesn't contain recognizable work content, filtered out: {experience}")
                    return ""
                
                return experience
            else:
                logger.warning("AI extractor not available, falling back to heuristic method")
                return ""
        except Exception as e:
            logger.warning(f"[Error extracting experience] {e}")
            import traceback
            logger.warning(traceback.format_exc())
            return ""

    def extract_projects_from_text(self, text: str) -> str:
        """Extract all project information from CV using AI"""
        try:
            if self.extractor:
                logger.info("Attempting AI project extraction...")
                
                # Create a focused prompt for project extraction
                prompt = f"""Find and list specific projects from this CV. Look for:
- Database migration or upgrade projects
- System implementations  
- Technical installations or configurations
- Application development
- Infrastructure setup projects
- Any work involving Oracle, databases, or systems

For each project found, include:
1. Project name/type
2. Brief description of what was done
3. Technologies used (if mentioned)

Format as separate bullet points, one project per line.

CV Text: {text[:2000]}

List of specific projects:
•"""
                
                result = self.extractor(prompt, max_length=300, min_length=20, num_return_sequences=1, do_sample=False)
                
                # Safe access to result
                if result and len(result) > 0 and 'generated_text' in result[0]:
                    projects = result[0]['generated_text'].strip()
                    logger.info(f"Raw AI projects response: {projects[:200]}...")
                    return projects
                else:
                    logger.warning("AI returned unexpected result format")
                    return ""
            else:
                logger.warning("AI extractor not available, falling back to heuristic method")
                return ""
        except Exception as e:
            logger.warning(f"[Error extracting projects] {e}")
            import traceback
            logger.warning(traceback.format_exc())
            return ""

    def extract_personality_traits_from_text(self, text: str) -> List[str]:
        """Extract personality traits from CV text - public API method"""
        logger.info("Starting personality traits extraction (public API)")
        return self._extract_personality_traits(text)

    def _extract_personality_traits(self, text: str) -> List[str]:
        """Extract personality traits from CV text using AI analysis with heuristic fallback"""
        logger.info("Starting personality traits extraction")
        
        # Try AI extraction first
        ai_traits = []
        try:
            if self.extractor:
                logger.info("Using AI for personality traits extraction")
                
                # More specific AI prompt that asks for diverse, specific traits
                traits_prompt = f"""Analyze this CV and identify 2-4 specific personality traits that make this person unique based on their actual experiences and roles.

Look for evidence of:
- Specific leadership experiences (not just any teamwork)
- Creative/design work or innovative projects
- Analytical work with data, research, or complex problem-solving  
- Strong communication through teaching, presenting, or client work
- Technical expertise in specialized fields
- Customer service or people-focused roles
- Detail-oriented work like testing, quality assurance, or compliance
- Entrepreneurial activities or initiative-taking

Return ONLY 2-4 personality traits separated by commas. Be specific and avoid generic traits.
Examples: "Creative", "Data-driven", "Technical leadership", "Customer-focused", "Detail-oriented", "Innovative", "Mentoring", "Strategic thinking"

CV Text: {text[:2000]}

Specific personality traits:"""
                
                result = self.extractor(traits_prompt, max_length=80, num_return_sequences=1, do_sample=True, temperature=0.7)
                ai_response = result[0]['generated_text'].strip()
                logger.info(f"AI traits response: {ai_response}")
                
                # Parse AI response
                ai_traits = self._parse_personality_traits_from_ai_response(ai_response)
                logger.info(f"Parsed AI traits: {ai_traits}")
                
                if ai_traits and len(ai_traits) >= 2:
                    return ai_traits[:4]  # Return AI results if we got good ones
                    
        except Exception as e:
            logger.warning(f"AI personality traits extraction failed: {e}")
        
        # Fallback to selective heuristics if AI failed or gave poor results
        logger.info("Using heuristic fallback for personality traits")
        heuristic_traits = self._extract_personality_traits_heuristic(text)
        
        # Return heuristic results or empty array
        return heuristic_traits[:3] if heuristic_traits else []

    def _parse_personality_traits_from_ai_response(self, ai_response: str) -> List[str]:
        """Parse personality traits from AI response"""
        try:
            # Clean the response
            traits_text = ai_response.replace("Personality Traits:", "").strip()
            
            # Split by comma and clean each trait
            traits = [trait.strip() for trait in traits_text.split(",") if trait.strip()]
            
            # Comprehensive filtering for technical terms and non-personality traits
            technical_terms = [
                'cv', 'resume', 'text', 'none', 'n/a', 'rtos', 'freertos', 'linux', 'windows', 
                'macos', 'unix', 'hp-ux', 'solaris', 'android', 'ios', 'java', 'python', 'c++', 
                'javascript', 'html', 'css', 'sql', 'mysql', 'oracle', 'mongodb', 'docker', 
                'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github', 'vscode', 'eclipse',
                'tensorflow', 'pytorch', 'react', 'angular', 'vue', 'nodejs', 'express',
                'django', 'flask', 'spring', 'hibernate', '.net', 'c#', 'php', 'ruby',
                'golang', 'rust', 'kotlin', 'swift', 'typescript', 'bash', 'powershell',
                'vim', 'emacs', 'intellij', 'matlab', 'r', 'scala', 'perl', 'figma',
                'photoshop', 'illustrator', 'sketch', 'uttar pradesh', 'california', 'texas'
            ]
            
            # Valid personality trait keywords to help identify genuine traits
            personality_keywords = [
                'leadership', 'team', 'communication', 'analytical', 'creative', 'problem',
                'detail', 'oriented', 'motivated', 'initiative', 'collaborative', 'adaptable',
                'reliable', 'organized', 'strategic', 'innovative', 'critical', 'thinking'
            ]
            
            valid_traits = []
            for trait in traits:
                trait_lower = trait.lower().strip()
                
                # Length and basic validation
                if len(trait) < 4 or len(trait) > 30:
                    continue
                    
                # Skip if it's a technical term
                if any(tech_term in trait_lower for tech_term in technical_terms):
                    continue
                    
                # Skip if it contains numbers (likely technical)
                if any(char.isdigit() for char in trait):
                    continue
                    
                # Skip if it's all uppercase (likely acronym/technical)
                if trait.isupper() and len(trait) > 2:
                    continue
                    
                # Prefer traits that contain personality keywords
                contains_personality_keyword = any(keyword in trait_lower for keyword in personality_keywords)
                
                # Only add if it passes all filters
                if contains_personality_keyword or len([word for word in trait_lower.split() if len(word) > 3]) >= 1:
                    valid_traits.append(trait.title())
            
            # Limit to 6 traits max for better quality
            return valid_traits[:6]
        except Exception as e:
            logger.warning(f"Error parsing personality traits from AI response: {e}")
            return []

    def _extract_personality_traits_heuristic(self, text: str) -> List[str]:
        """Extract personality traits using selective heuristic analysis"""
        try:
            text_lower = text.lower()
            traits = []
            
            # Be much more selective - require stronger evidence
            
            # Leadership - only if clear management/leadership role
            leadership_indicators = ['manager', 'director', 'head of', 'supervisor', 'lead developer', 'team lead', 'ceo', 'cto', 'president']
            if any(indicator in text_lower for indicator in leadership_indicators):
                traits.append("Leadership")
            
            # Creative - only if clear creative/design role  
            creative_indicators = ['designer', 'ui/ux', 'graphic design', 'creative director', 'art director', 'brand manager']
            design_skills = ['photoshop', 'figma', 'illustrator', 'sketch', 'design thinking']
            if (any(indicator in text_lower for indicator in creative_indicators) or 
                len([skill for skill in design_skills if skill in text_lower]) >= 2):
                traits.append("Creative")
            
            # Analytical - only if clear data/research role
            analytical_roles = ['data scientist', 'data analyst', 'research', 'statistician', 'business analyst']
            analytical_skills = ['python', 'r programming', 'sql', 'tableau', 'power bi', 'statistics', 'machine learning']
            if (any(role in text_lower for role in analytical_roles) or 
                len([skill for skill in analytical_skills if skill in text_lower]) >= 3):
                traits.append("Analytical")
            
            # Technical expertise - only if clear technical role
            tech_roles = ['software engineer', 'developer', 'programmer', 'architect', 'devops', 'system administrator']
            if any(role in text_lower for role in tech_roles):
                traits.append("Technical expertise")
            
            # Communication skills - only if clear evidence
            comm_indicators = ['public speaking', 'presentation', 'training', 'teaching', 'mentoring', 'sales', 'marketing']
            if any(indicator in text_lower for indicator in comm_indicators):
                traits.append("Communication skills")
            
            # Detail-oriented - only if clear QA/testing/documentation role
            detail_roles = ['quality assurance', 'tester', 'auditor', 'compliance', 'documentation specialist']
            if any(role in text_lower for role in detail_roles):
                traits.append("Detail-oriented")
            
            # Customer-focused - only if clear customer-facing role
            customer_roles = ['customer service', 'support specialist', 'account manager', 'sales representative', 'consultant']
            if any(role in text_lower for role in customer_roles):
                traits.append("Customer-focused")
            
            # Initiative - only if clear entrepreneurial/founding experience
            initiative_indicators = ['founded', 'co-founder', 'entrepreneur', 'startup', 'launched company', 'established business']
            if any(indicator in text_lower for indicator in initiative_indicators):
                traits.append("Initiative")
            
            # Problem-solving - only if clear troubleshooting role
            problem_roles = ['troubleshooting', 'debugging', 'system administrator', 'technical support', 'consultant']
            if any(role in text_lower for role in problem_roles):
                traits.append("Problem-solving")
            
            # Remove duplicates
            unique_traits = list(dict.fromkeys(traits))
            
            # If no strong traits found, return minimal set or empty
            if not unique_traits:
                # Check if it's a student CV (less traits expected)
                if any(word in text_lower for word in ['student', 'undergraduate', 'bachelor', 'university']):
                    return []  # Students might not have developed professional traits yet
                else:
                    return ["Professional"]  # Generic trait for working professionals
            
            return unique_traits[:4]  # Limit to 4 traits max for realism
            
        except Exception as e:
            logger.warning(f"Error in heuristic personality traits extraction: {e}")
            return []  # Return empty on error rather than defaults

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills using AI parsing first, then keyword matching fallback"""
        
        logger.info("Starting skills extraction with AI method")
        
        # Use AI to extract skills from the original CV text
        extracted_skills = self._parse_skills_from_ai_response(text)
        if extracted_skills and len(extracted_skills) > 3:
            logger.info(f"AI successfully extracted {len(extracted_skills)} skills")
            return extracted_skills
        
        logger.info("AI extraction returned insufficient skills, using heuristic fallback")
            
        # Fallback to original heuristic method
        text_lower = text.lower()

        skills_dict = {
                "tech": [
                    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
                    'node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'c++', 'c#', 'go', 'rust',
                    'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'jquery', 'php', 'ruby',
                    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'sql server', 'nosql',
                    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 
                    'jenkins', 'git', 'github', 'gitlab', 'bitbucket', 'linux', 'unix', 'windows',
                    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matlab',
                    'restful', 'rest api', 'soap', 'microservices', 'json', 'xml', 'yaml'
                ],
                "database": [
                    'database administration', 'dba', 'oracle', 'mysql', 'postgresql', 'sql server',
                    'mongodb', 'redis', 'cassandra', 'rdbms', 'nosql', 'data modeling', 'etl',
                    'data warehouse', 'data mining', 'olap', 'oltp', 'pl/sql', 'stored procedures',
                    'database design', 'performance tuning', 'backup and recovery', 'replication',
                    'clustering', 'rac', 'real application cluster', 'golden gate', 'data guard'
                ],
                "design": [
                    'figma', 'adobe xd', 'sketch', 'photoshop', 'illustrator', 'indesign',
                    'after effects', 'premiere pro', '3ds max', 'autocad', 'solidworks', 'ui/ux',
                    'user interface', 'user experience', 'wireframing', 'prototyping'
                ],
                "business": [
                    'business analysis', 'data analysis', 'financial modeling', 'accounting',
                    'bookkeeping', 'budgeting', 'forecasting', 'erp', 'sap', 'crm',
                    'excel', 'power bi', 'tableau', 'ms office', 'project management',
                    'business intelligence', 'process improvement', 'requirements gathering'
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
                    'customer relationship management', 'google analytics', 'ppc', 'email marketing'
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

        # First: Check skills sections specifically
        skill_sections = self._find_section(text, ['skills', 'technical skills', 'competencies', 'strengths', 'technologies'])
        if skill_sections:
            section_lower = skill_sections.lower()
            for skill in all_skills:
                if skill in section_lower:
                    found_skills.append(skill.title())

        # Second: Aggressive text-wide search for any mention of skills
        for skill in all_skills:
            if skill in text_lower:
                # Much more lenient - accept if skill appears anywhere with word boundaries
                import re
                if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                    found_skills.append(skill.title())
        
        # Third: Look for common technology patterns and acronyms
        tech_patterns = {
            r'\brac\b': 'RAC',
            r'\brman\b': 'RMAN', 
            r'\boem\b': 'OEM',
            r'\bgrid control\b': 'Grid Control',
            r'\bdata guard\b': 'Data Guard',
            r'\bgolden gate\b': 'Golden Gate',
            r'\bpl/sql\b': 'PL/SQL',
            r'\bt-sql\b': 'T-SQL',
            r'\bjava\b': 'Java',
            r'\bc\+\+': 'C++',
            r'\bc#': 'C#',
            r'\b\.net\b': '.NET',
            r'\bhtml5?\b': 'HTML',
            r'\bcss3?\b': 'CSS',
            r'\boracle\s+\d+[cg]\b': 'Oracle Database',
            r'\bmysql\b': 'MySQL',
            r'\bpostgresql\b': 'PostgreSQL',
            r'\bmongodb\b': 'MongoDB',
        }
        
        for pattern, skill_name in tech_patterns.items():
            if re.search(pattern, text_lower, re.IGNORECASE):
                found_skills.append(skill_name)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in found_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)

        logger.info(f"Heuristic method found {len(unique_skills)} skills: {unique_skills[:10]}")
        return unique_skills[:25]  # Increased limit

    def _parse_skills_from_ai_response(self, cv_text: str) -> List[str]:
        """Use AI to extract skills from CV text"""
        try:
            logger.info("Using AI to extract skills from CV")
            
            # Try using the extractor (text generation model) first
            if self.extractor:
                logger.info("Using self.extractor for AI skill extraction")
                
                # Create a focused prompt for skill extraction
                skills_prompt = f"""Extract technical and professional skills from this CV. Return only a comma-separated list of skills.

Examples of skills to find:
- Programming languages (Python, Java, JavaScript, etc.)
- Frameworks (React, Django, Spring, etc.) 
- Databases (MySQL, MongoDB, PostgreSQL, etc.)
- Tools (Git, Docker, AWS, etc.)
- Soft skills (Leadership, Communication, etc.)

CV Text: {cv_text[:1500]}

Skills (comma-separated list):"""

                try:
                    result = self.extractor(skills_prompt, max_length=100, min_length=10, num_return_sequences=1, do_sample=False)
                    ai_response = result[0]['generated_text'].strip()
                    logger.info(f"AI skills response: {ai_response}")
                    
                    # Parse the comma-separated response
                    if ai_response:
                        # Extract everything after the prompt
                        if "Skills (comma-separated list):" in ai_response:
                            skills_text = ai_response.split("Skills (comma-separated list):")[-1].strip()
                        else:
                            skills_text = ai_response
                        
                        # Split by comma and clean
                        skills = [skill.strip().title() for skill in skills_text.split(',') if skill.strip()]
                        
                        # Filter out non-skills and duplicates
                        valid_skills = []
                        seen = set()
                        for skill in skills:
                            skill_clean = skill.lower().strip()
                            if (len(skill) > 2 and 
                                skill_clean not in seen and
                                not any(bad_word in skill_clean for bad_word in ['cv', 'text', 'example', 'etc', 'and', 'or'])):
                                seen.add(skill_clean)
                                valid_skills.append(skill)
                        
                        if valid_skills:
                            logger.info(f"AI extracted skills: {valid_skills[:10]}")
                            return valid_skills[:15]
                            
                except Exception as e:
                    logger.warning(f"Extractor failed: {e}")
            
            # Fallback to summarizer if available
            if summarizerPipeline:
                logger.info("Using summarizerPipeline for skill extraction")
                
                # Find skills section first
                skills_section = self._find_section(cv_text, ['skills', 'technical skills', 'competencies', 'strengths'])
                if skills_section:
                    text_to_analyze = skills_section[:1000]
                else:
                    text_to_analyze = cv_text[:1000]
                
                # Use summarizer to identify key skills
                try:
                    input_text = f"Skills and technologies: {text_to_analyze}"
                    # Dynamically adjust max_length based on input length
                    input_length = len(input_text.split())
                    max_len = max(min(input_length - 5, 50), 10)  # Max 50, min 10, leave 5 words buffer
                    min_len = max(min(input_length // 3, max_len - 10), 5)  # Reasonable min length
                    
                    summary = summarizerPipeline(input_text, max_length=max_len, min_length=min_len, do_sample=False)
                    summary_text = summary[0]['summary_text']
                    logger.info(f"Summarizer output for skills: {summary_text}")
                    
                    # Extract skills from summary using regex
                    import re
                    skill_patterns = [
                        'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
                        'node.js', 'express', 'django', 'flask', 'spring', 'c\\+\\+', 'c#',
                        'html', 'css', 'mysql', 'postgresql', 'mongodb', 'aws', 'azure',
                        'docker', 'kubernetes', 'git', 'linux', 'windows', 'agile', 'scrum'
                    ]
                    
                    found_skills = []
                    for pattern in skill_patterns:
                        if re.search(rf'\b{pattern}\b', summary_text, re.IGNORECASE):
                            skill_name = pattern.replace('\\+\\+', '++').replace('\\', '').title()
                            if skill_name == 'C++':
                                skill_name = 'C++'
                            elif skill_name == 'C#':
                                skill_name = 'C#'
                            found_skills.append(skill_name)
                    
                    if found_skills:
                        logger.info(f"Summarizer extracted skills: {found_skills}")
                        return found_skills[:10]
                        
                except Exception as e:
                    logger.warning(f"Summarizer failed: {e}")
            
            # Final fallback - return empty to trigger heuristic method
            logger.info("No AI models available, falling back to heuristic method")
            return []
            
        except Exception as e:
            logger.warning(f"Error in AI skills extraction: {e}")
            return []

    def _parse_experience_from_ai_response(self, ai_response: str) -> List[str]:
        """Parse AI-generated experience text into individual experience entries"""
        try:
            import re
            experiences = []
            
            # Clean the response and filter out bad content
            text = ai_response.strip()
            
            # Filter out lines that contain education or prompt text
            bad_phrases = [
                'graduate of', 'university', 'bachelor', 'degree', 'education', 'school',
                'for each experience', 'include company', 'job title', 'duration',
                'extract all', 'professional experience entries'
            ]
            
            # Split into lines and filter out bad ones
            lines = text.split('\n')
            clean_lines = []
            for line in lines:
                line = line.strip()
                if line and not any(bad_phrase in line.lower() for bad_phrase in bad_phrases):
                    clean_lines.append(line)
            
            text = '\n'.join(clean_lines)
            
            if not text or len(text) < 20:
                return []
            
            # Split by common experience delimiters
            potential_splits = [
                r'\n\d+\.\s*',  # "1. Company Name"
                r'\n•\s*',      # "• Company Name"
                r'\n-\s*',      # "- Company Name"
                r'\n\*\s*',     # "* Company Name"
                r'\n(?=\w+.*(?:at|@|\|)\s*\w+)',  # "Position at Company"
                r'\n(?=[A-Z][^\.]*(?:,|:|\n))'   # New entry starting with capital
            ]
            
            # Try each splitting pattern
            entries = [text]  # Start with the whole text
            for pattern in potential_splits:
                new_entries = []
                for entry in entries:
                    splits = re.split(pattern, entry)
                    new_entries.extend([s.strip() for s in splits if s.strip()])
                if len(new_entries) > len(entries):
                    entries = new_entries
                    break
            
            # Process each entry and filter out null/empty values
            for entry in entries:
                if entry and len(str(entry).strip()) > 20:  # Minimum length for meaningful experience
                    # Clean up the entry
                    clean_entry = self._clean_experience_ai_entry(str(entry).strip())
                    if clean_entry and clean_entry.strip():
                        experiences.append(clean_entry)
            
            # Remove any remaining null/None values
            experiences = [exp for exp in experiences if exp and exp.strip()]
            
            # If we didn't get good splits, try to extract by looking for company/position patterns
            if len(experiences) <= 1 and len(text) > 100:
                # Look for patterns like "Position at Company" or "Company: Position"
                company_patterns = [
                    r'([^.\n]+(?:at|@)\s*[^.\n]+)',
                    r'([^.\n]+:\s*[^.\n]+)',
                    r'([A-Z][^.\n]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Assistant)[^.\n]*)'
                ]
                
                for pattern in company_patterns:
                    matches = re.findall(pattern, text, re.MULTILINE)
                    if matches and len(matches) > len(experiences):
                        experiences = [self._clean_experience_ai_entry(match) for match in matches if len(match) > 20]
                        break
            
            return experiences[:10]  # Limit to 10 experiences
            
        except Exception as e:
            logger.warning(f"Error parsing AI experience response: {e}")
            return []

    def _clean_experience_ai_entry(self, entry: str) -> str:
        """Clean and format an experience entry from AI response"""
        try:
            # Remove common prefixes
            entry = re.sub(r'^\d+\.\s*', '', entry)
            entry = re.sub(r'^[•\-\*]\s*', '', entry)
            
            # Remove excessive whitespace
            entry = re.sub(r'\s+', ' ', entry).strip()
            
            # Additional validation - reject entries that don't look like work experience
            bad_indicators = [
                'graduate of', 'university', 'bachelor', 'degree', 'education',
                'for each experience', 'include company', 'job title', 'duration',
                'extract all', 'school', 'college', 'institute', 'from this site',
                'extract only professional work experience', 'jobs, internships, employment',
                'cv text', 'professional work experience (jobs'
            ]
            
            if any(indicator in entry.lower() for indicator in bad_indicators):
                return None
            
            # Look for positive indicators of work experience - expanded for technical roles
            good_indicators = [
                'at ', 'company', 'corporation', 'inc', 'ltd', 'llc', 'organization',
                'developer', 'engineer', 'manager', 'analyst', 'specialist', 'coordinator',
                'assistant', 'intern', 'consultant', 'director', 'supervisor', 'lead',
                # Technical work indicators
                'installing', 'configuring', 'maintaining', 'administering', 'managing', 
                'developing', 'implementing', 'designing', 'monitoring', 'troubleshooting',
                'optimizing', 'creating', 'building', 'deploying', 'cloning', 'replicating',
                'database', 'server', 'system', 'application', 'network', 'infrastructure',
                'oracle', 'mysql', 'postgresql', 'sql', 'rman', 'backup', 'recovery',
                'performance', 'tuning', 'cluster', 'rac', 'grid control', 'oem'
            ]
            
            # Entry should have work-related terms OR be substantial technical content
            has_work_indicators = any(indicator in entry.lower() for indicator in good_indicators)
            is_substantial_tech = len(entry) > 30 and any(tech in entry.lower() for tech in ['database', 'oracle', 'sql', 'system', 'server', 'application'])
            
            if not has_work_indicators and not is_substantial_tech:
                return None
            
            # Ensure reasonable length
            if len(entry) > 500:
                entry = entry[:500] + "..."
            
            return entry if len(entry) > 20 else None
            
        except Exception:
            return None

    def _parse_projects_from_ai_response(self, ai_response: str) -> List[str]:
        """Parse AI-generated projects text into individual project entries"""
        try:
            import re
            projects = []
            
            # Clean the response and remove the prompt echo
            text = ai_response.strip()
            
            # Remove the prompt text if it's echoed back
            if "List of specific projects:" in text:
                text = text.split("List of specific projects:")[-1].strip()
            
            # Filter out non-project content (summary text)
            summary_indicators = [
                'oracle certified professional', 'years of experience', 'expert in',
                'has over', 'extensive experience', 'he is an expert'
            ]
            
            # If the response is just a summary, return empty to trigger heuristic
            if any(indicator in text.lower() for indicator in summary_indicators) and len(text.split('.')) <= 2:
                logger.info("AI response appears to be summary text, not projects")
                return []
            
            # Split by bullet points and numbered lists
            potential_splits = [
                r'\n\s*•\s*',      # "• Project Name"
                r'\n\s*-\s*',      # "- Project Name"  
                r'\n\s*\*\s*',     # "* Project Name"
                r'\n\s*\d+\.\s*',  # "1. Project Name"
                r'\n(?=\w+.*(?:project|implementation|migration|installation|configuration))',  # Lines starting with project words
            ]
            
            # Try each splitting pattern
            entries = [text]  # Start with the whole text
            for pattern in potential_splits:
                new_entries = []
                for entry in entries:
                    splits = re.split(pattern, entry, flags=re.IGNORECASE)
                    new_entries.extend([s.strip() for s in splits if s.strip()])
                if len(new_entries) > len(entries):
                    entries = new_entries
                    logger.info(f"Split into {len(entries)} entries using pattern")
                    break
            
            # Process each entry
            for entry in entries:
                if len(entry) > 25:  # Minimum length for meaningful project
                    # Skip if it's still summary-like content
                    if not any(indicator in entry.lower() for indicator in summary_indicators):
                        # Clean up the entry
                        clean_entry = self._clean_project_ai_entry(entry)
                        if clean_entry:
                            projects.append(clean_entry)
            
            # If we didn't get good splits, try to extract by looking for project patterns
            if len(projects) <= 1 and len(text) > 100:
                # Look for patterns like "ProjectName (Date)" or "ProjectName:"
                project_patterns = [
                    r'([A-Z][^.\n]*\([^)]*\d{4}[^)]*\)[^.\n]*)',
                    r'([A-Z][^.\n]*:.*?)(?=\n[A-Z]|\n\n|$)',
                    r'([A-Z][^.\n]{20,}?)(?=\n[A-Z]|\n\n|$)'
                ]
                
                for pattern in project_patterns:
                    matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
                    if matches and len(matches) > len(projects):
                        projects = [self._clean_project_ai_entry(match) for match in matches if len(match) > 30]
                        break
            
            return projects[:15]  # Limit to 15 projects
            
        except Exception as e:
            logger.warning(f"Error parsing AI projects response: {e}")
            return []

    def _clean_project_ai_entry(self, entry: str) -> str:
        """Clean and format a project entry from AI response"""
        try:
            # Remove common prefixes
            entry = re.sub(r'^\d+\.\s*', '', entry)
            entry = re.sub(r'^[•\-\*]\s*', '', entry)
            
            # Remove excessive whitespace and newlines
            entry = re.sub(r'\s+', ' ', entry).strip()
            
            # Remove prompt text if it leaked through
            bad_phrases = [
                'extract all project', 'include the project title', 'role or contribution',
                'format the result', 'list of project entries', 'cv text:', 'look for:'
            ]
            
            if any(bad_phrase in entry.lower() for bad_phrase in bad_phrases):
                return None
            
            # Filter out summary-like content
            summary_phrases = [
                'oracle certified professional', 'years of experience', 'expert in',
                'has over', 'extensive experience'
            ]
            
            if any(phrase in entry.lower() for phrase in summary_phrases):
                return None
            
            # Look for project indicators to validate this is actually a project
            project_indicators = [
                'installing', 'configuring', 'maintaining', 'implementing', 'developing',
                'creating', 'building', 'deploying', 'migrating', 'upgrading', 'designing',
                'project', 'system', 'database', 'application', 'migration', 'installation'
            ]
            
            # Only accept if it contains project-like actions
            if not any(indicator in entry.lower() for indicator in project_indicators):
                return None
            
            # Ensure it ends properly
            if not entry.endswith('.') and not entry.endswith('!') and not entry.endswith('?'):
                entry += '.'
            
            # Ensure reasonable length
            if len(entry) > 600:
                entry = entry[:600] + "..."
            
            return entry if len(entry) > 25 else None
            
        except Exception:
            return None

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
            "education": str(ai_result.get("education", []))
        },
        "skills": ai_result.get("skills", []),
        "personality_traits": ai_result.get("personality_traits", []),
        "summary": ai_result.get("summary", "No summary available"),
        "ai_extracted": True,
        "certifications": ai_result.get("certifications", []),
        "languages": ai_result.get("languages", []),
        "projects": ai_result.get("projects", []) if ai_result.get("projects") else []  # Return projects as list, not string
    }