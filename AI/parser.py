import re
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

# Section keywords - keep simple and focused
SECTION_HEADERS = {
    "summary": [
        "summary", "objective", "profile", "about", "personal statement", 
        "career objective", "professional summary", "overview", "introduction"
    ],
    "experience": [
        "experience", "work history", "employment", "work experience", 
        "professional experience", "career history", "employment history",
        "work", "career", "positions", "jobs"
    ],
    "education": [
        "education", "qualifications", "academic", "academic background", 
        "educational background", "training", "degrees", "studies"
    ],
    "skills": [
        "skills", "technologies", "tools", "competencies", "technical skills", 
        "core competencies", "key skills", "software", "expertise", "abilities"
    ],
    "certifications": [
        "certifications", "licenses", "certified", "certification", 
        "professional certifications", "credentials", "certificates"
    ],
    "projects": [
        "projects", "portfolio", "case studies", "key projects", 
        "selected projects", "project experience", "notable projects"
    ],
    "other": [
        "interests", "references", "hobbies", "additional information", 
        "volunteer", "awards", "achievements", "honors", "publications",
        "languages", "personal", "additional"
    ]
}

# Core contact patterns - be very specific
CONTACT_PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone': r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b',
    'linkedin': r'linkedin\.com/in/[\w\-]+',
    'github': r'github\.com/[\w\-]+',
    'website': r'https?://[\w\.-]+\.\w+'
}

# Technical skills (broader categories)
TECHNICAL_SKILLS = [
    # Programming languages
    "python", "java", "javascript", "typescript", "html", "css", "sql", "php", "c++", "c#", "c", 
    "ruby", "swift", "kotlin", "go", "rust", "scala", "r", "matlab", "perl", "bash",
    
    # Frameworks/Libraries
    "react", "angular", "vue", "nodejs", "django", "flask", "spring", "rails", ".net",
    "jquery", "bootstrap", "tailwind", "express",
    
    # Design tools
    "photoshop", "illustrator", "figma", "sketch", "adobe", "autocad", "revit", "sketchup",
    "blender", "maya", "3ds max", "after effects", "premiere",
    
    # Databases
    "mysql", "postgresql", "mongodb", "oracle", "sqlite", "redis", "nosql",
    
    # Cloud/DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "github", "gitlab",
    
    # Office
    "excel", "powerpoint", "word", "outlook", "teams", "slack", "sharepoint"
]

# Soft skills
SOFT_SKILLS = [
    "teamwork", "communication", "leadership", "problem solving", "analytical", 
    "creative", "management", "organization", "planning", "collaboration", 
    "presentation", "negotiation", "time management", "critical thinking", 
    "adaptability", "initiative", "detail oriented", "customer service", 
    "project management", "multitasking", "mentoring"
]

# Date patterns - more comprehensive
DATE_PATTERNS = [
    r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\s*[-–]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b',
    r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\s*[-–]\s*(present|current|now)\b',
    r'\b\d{4}\s*[-–]\s*\d{4}\b',
    r'\b\d{4}\s*[-–]\s*(present|current|now)\b',
    r'\b\d{1,2}/\d{4}\s*[-–]\s*\d{1,2}/\d{4}\b',
    r'\b\d{1,2}/\d{2,4}\s*[-–]\s*\d{1,2}/\d{2,4}\b'
]

# Job title patterns
JOB_TITLE_PATTERNS = [
    r'\b(senior|junior|lead|principal|chief|head|assistant|associate|intern)\s+\w+',
    r'\b\w+\s+(developer|engineer|designer|manager|analyst|consultant|director|coordinator|specialist|administrator|architect|planner)\b',
    r'\bsoftware\s+(developer|engineer|architect)\b',
    r'\bproject\s+(manager|coordinator|lead)\b',
    r'\bdata\s+(scientist|analyst|engineer)\b'
]

# Company indicators
COMPANY_INDICATORS = [
    r'\b\w+\s+(inc|ltd|llc|corp|company|technologies|solutions|systems|services|group|pty)\b',
    r'@\s*[A-Z][A-Za-z\s&]+(?=\s*[\|,]|\s*$)',  # @ Company pattern
]

# Education indicators
EDUCATION_INDICATORS = [
    "university", "college", "school", "institute", "academy", "degree", "bachelor", 
    "master", "phd", "bsc", "ba", "ma", "msc", "diploma", "certificate", "gpa", "grade"
]

ALL_SECTIONS = [
    "personal_info", "summary", "experience", "education", 
    "skills", "certifications", "projects", "other", "uncategorized"
]

class ImprovedCVClassifier:
    def __init__(self):
        self.current_section = "personal_info"
        self.line_number = 0
        self.document_lines = []
        self.found_clear_sections = set()
        
    def is_section_header(self, line: str) -> Optional[str]:
        """Detect section headers with better accuracy"""
        line_clean = line.lower().strip().strip(":").strip("-").strip("_").strip()
        line_clean = re.sub(r'^[*•\-=_\s\|]+', '', line_clean)
        line_clean = re.sub(r'[*•\-=_\s\|]+$', '', line_clean)
        
        # Check if this looks like a header (formatting cues)
        is_formatted = self._looks_like_header(line)
        
        # Direct matches
        for section, keywords in SECTION_HEADERS.items():
            for keyword in keywords:
                if line_clean == keyword:
                    return section
                # For formatted headers, allow partial matches
                if is_formatted and keyword in line_clean and len(line_clean.split()) <= 3:
                    return section
        
        return None
    
    def _looks_like_header(self, line: str) -> bool:
        """Check if line has header formatting"""
        line = line.strip()
        
        # All caps (but not too long)
        if line.isupper() and 3 <= len(line) <= 30:
            return True
        
        # Ends with colon
        if line.endswith(':') and len(line.split()) <= 4:
            return True
        
        # Surrounded by special characters
        if re.match(r'^[*=\-_•\|]\s*.+\s*[*=\-_•\|]$', line):
            return True
        
        # Bold/emphasized (common header pattern)
        if line.count('*') >= 2 or line.count('_') >= 2:
            return True
            
        return False
    
    def is_contact_info(self, line: str) -> bool:
        """Strict contact information detection"""
        # Direct pattern matches
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, line, re.IGNORECASE):
                return True
        
        # Exclude standalone contact labels
        line_lower = line.lower().strip()
        if line_lower in ["phone:", "email:", "address:", "github:", "linkedin:", "website:"]:
            return False
        
        return False
    
    def is_likely_name(self, line: str) -> bool:
        """Detect if line is likely a person's name"""
        words = line.strip().split()
        # Must be 2-4 words
        if not (2 <= len(words) <= 4):
            return False
        # Must be very early in document (first 5 lines)
        if self.line_number > 4:
            return False
        # Check for all caps names (common in CVs)
        if line.strip().isupper() and all(word.isalpha() and len(word) > 1 for word in words):
            return True
        # All words should be proper case and alphabetic
        if all(word[0].isupper() and word[1:].islower() and word.isalpha() for word in words):
            # Exclude common section headers that might match pattern
            line_lower = line.lower()
            excluded_words = ["computer science", "software engineer", "data analyst", "project manager"]
            if any(phrase in line_lower for phrase in excluded_words):
                return False
            return True
        return False
    
    def has_date_pattern(self, line: str) -> bool:
        """Check if line contains date patterns"""
        for pattern in DATE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                return True
        return False
    
    def is_standalone_date(self, line: str) -> bool:
        """Check if line is just a date fragment"""
        line_clean = line.strip()
        # Check if it's mostly just a date with little other content
        if len(line_clean.split()) <= 3 and self.has_date_pattern(line):
            return True
        return False
    
    def has_job_title_pattern(self, line: str) -> bool:
        """Check if line contains job title patterns"""
        for pattern in JOB_TITLE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                return True
        return False
    
    def has_company_pattern(self, line: str) -> bool:
        """Check if line contains company patterns"""
        for pattern in COMPANY_INDICATORS:
            if re.search(pattern, line, re.IGNORECASE):
                return True
        return False
    
    def classify_line(self, line: str) -> str:
        """Classify a single line with improved logic"""
        line_lower = line.lower().strip()
        
        # 1. STRICT: Contact information
        if self.is_contact_info(line):
            return "personal_info"
        
        # 2. STRICT: Names (only in first few lines)
        if self.is_likely_name(line):
            return "personal_info"
        
        # 3. Skip standalone date fragments
        if self.is_standalone_date(line):
            return "uncategorized"
        
        # 4. Experience indicators (dates + job context)
        has_date = self.has_date_pattern(line)
        has_job_title = self.has_job_title_pattern(line)
        has_company = self.has_company_pattern(line)
        
        if has_date and (has_job_title or has_company):
            return "experience"
        
        # 5. Education indicators
        edu_score = 0
        for indicator in EDUCATION_INDICATORS:
            if indicator in line_lower:
                edu_score += 1
        
        # Strong education indicators
        if re.search(r'\b(bachelor|master|phd|bsc|ba|ma|msc|diploma)\b', line_lower):
            edu_score += 2
        
        # Education with dates
        if has_date and edu_score >= 1:
            return "education"
        
        if edu_score >= 2:
            return "education"
        
        # 6. Projects detection (improved)
        project_keywords = ["project", "developed", "created", "built", "designed", "implemented", 
                          "application", "system", "website", "software", "database", "simulation",
                          "streaming", "nosql", "gui", "full-stack", "web application"]
        project_matches = sum(1 for keyword in project_keywords if keyword in line_lower)
        
        # Strong project indicators
        if project_matches >= 2:
            return "projects"
        
        # Project with context (longer descriptions)
        if project_matches >= 1 and len(line.split()) > 8:
            return "projects"
        
        # Project titles (shorter lines with project keywords)
        if project_matches >= 1 and len(line.split()) <= 4:
            return "projects"
        
        # 7. Skills detection (be more careful)
        tech_skills_found = sum(1 for skill in TECHNICAL_SKILLS if skill in line_lower)
        soft_skills_found = sum(1 for skill in SOFT_SKILLS if skill in line_lower)
        is_skills_list = ',' in line and len([x for x in line.split(',') if x.strip()]) >= 2

        # Only classify as skills if at least two found or comma-separated and not a single word/phrase
        if ((tech_skills_found + soft_skills_found) >= 2 or is_skills_list) and len(line.split()) > 2:
            if project_matches == 0:
                return "skills"
        
        # Prevent addresses and single-word lines from being skills
        if re.match(r'^\d+\s+\w+', line):  # Looks like an address
            return "uncategorized"
        if len(line.split()) == 1 and (tech_skills_found + soft_skills_found) < 2:
            return "uncategorized"
        
        # 8. Default to current section context or uncategorized
        if self.current_section != "personal_info":
            return self.current_section
        
        return "uncategorized"

def extract_cv_sections(text: str) -> Dict[str, List[str]]:
    """Improved CV section extraction"""
    if not text or not text.strip():
        return {sec: [] for sec in ALL_SECTIONS}
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return {sec: [] for sec in ALL_SECTIONS}
    
    classifier = ImprovedCVClassifier()
    classifier.document_lines = lines
    sections = {sec: [] for sec in ALL_SECTIONS}
    
    current_section = "personal_info"
    
    for i, line in enumerate(lines):
        classifier.line_number = i
        classifier.current_section = current_section

        # Check for section header
        detected_section = classifier.is_section_header(line)
        if detected_section:
            current_section = detected_section
            classifier.found_clear_sections.add(detected_section)
            continue

        # Skip very short lines
        if len(line.strip()) <= 2:
            continue

        # Skip if line is a section header (extra safety)
        if any(line.lower().strip().startswith(h) for sec in SECTION_HEADERS.values() for h in sec):
            continue

        # Classify content
        classified_section = classifier.classify_line(line)
        sections[classified_section].append(line)
    
    # Post-processing: clean up personal_info
    sections = _clean_personal_info_section(sections)
    
    # Remove empty sections
    return {k: v for k, v in sections.items() if v}

def _clean_personal_info_section(sections: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Clean up personal_info section to only include actual contact details and name"""

    personal_items = sections["personal_info"]
    cleaned_personal = []
    items_to_redistribute = []

    for idx, item in enumerate(personal_items):
        keep_in_personal = False

        # Keep if it's actual contact info
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, item, re.IGNORECASE):
                keep_in_personal = True
                break

        # Exclude standalone contact labels
        item_lower = item.lower().strip()
        if item_lower in ["phone:", "email:", "address:", "github:", "linkedin:", "website:"]:
            keep_in_personal = False

        # Keep if it looks like a name (very strict)
        words = item.strip().split()
        # Only allow names if they are at the very top of the document (first 2 lines)
        if (2 <= len(words) <= 4 and 
            all(len(word) > 1 and word.isalpha() for word in words) and
            idx < 2):
            # Check for all caps names (common format)
            if item.strip().isupper():
                keep_in_personal = True
            # Check for proper case names
            elif all(word[0].isupper() and word[1:].islower() for word in words):
                # Extra check: not a job title or section header
                if not any(re.search(pattern, item, re.IGNORECASE) for pattern in JOB_TITLE_PATTERNS):
                    keep_in_personal = True

        # Never allow single-word lines unless they match contact info
        if len(words) == 1 and not keep_in_personal:
            keep_in_personal = False

        if keep_in_personal:
            cleaned_personal.append(item)
        else:
            items_to_redistribute.append(item)

    # Update personal_info section
    sections["personal_info"] = cleaned_personal

    # Redistribute other items
    for item in items_to_redistribute:
        classifier = ImprovedCVClassifier()
        new_section = classifier.classify_line(item)
        if new_section != "personal_info":
            sections[new_section].append(item)
        else:
            sections["uncategorized"].append(item)

    return sections