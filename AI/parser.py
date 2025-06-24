import re
from typing import Dict, List, Tuple, Optional

# Enhanced section keywords with more variations
SECTION_HEADERS = {
    "summary": [
        "summary", "objective", "profile", "about", "personal statement", 
        "career objective", "professional summary", "overview", "introduction"
    ],
    "experience": [
        "experience", "work history", "employment", "work experience", 
        "professional experience", "career history", "employment history",
        "work", "career", "professional background"
    ],
    "education": [
        "education", "qualifications", "academic", "academic background", 
        "educational background", "training", "degrees", "certifications and education"
    ],
    "skills": [
        "skills", "technologies", "tools", "competencies", "technical skills", 
        "core competencies", "key skills", "software", "expertise", "abilities",
        "technical competencies", "proficiencies"
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
        "interests", "references", "hobbies", "miscellaneous", 
        "additional information", "personal interests", "activities",
        "volunteer", "awards", "achievements"
    ]
}

# Common software and technical skills
TECHNICAL_SKILLS = [
    "revit", "autocad", "adobe", "illustrator", "photoshop", "indesign", 
    "3ds max", "sketchup", "twin motion", "python", "java", "javascript", 
    "html", "css", "sql", "react", "angular", "vue", "nodejs", "php",
    "excel", "powerpoint", "word", "outlook", "teams", "slack"
]

# Soft skills
SOFT_SKILLS = [
    "teamwork", "communication", "leadership", "problem solving", 
    "analytical", "creative", "management", "organization", "planning",
    "collaboration", "presentation", "negotiation", "time management"
]

# Job titles patterns
JOB_TITLE_PATTERNS = [
    r"\b(senior|junior|lead|principal|chief|head)\s+\w+",
    r"\b\w+\s+(designer|developer|engineer|manager|analyst|consultant|director|coordinator|specialist|administrator|technician|supervisor|assistant)\b",
    r"\binterior\s+designer\b",
    r"\bproject\s+manager\b",
    r"\bgraphic\s+designer\b",
    r"\bsoftware\s+(developer|engineer)\b"
]

# Company indicators
COMPANY_PATTERNS = [
    r"\b\w+\s+(inc|ltd|llc|corp|company|technologies|solutions|systems|services|group)\b",
    r"\|\s*[A-Z][a-z]+.*,\s*[A-Z]{2,3}\b",  # | Location pattern
    r"@\s*[A-Z][A-Za-z\s]+",  # @ Company pattern
]

# Date patterns
DATE_PATTERNS = [
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s*-\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b",
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s*-\s*(present|current)\b",
    r"\b\d{4}\s*-\s*\d{4}\b",
    r"\b\d{1,2}/\d{4}\s*-\s*\d{1,2}/\d{4}\b",
    r"\b\d{4}\s*-\s*(present|current)\b"
]

# Contact patterns
CONTACT_PATTERNS = {
    'email': r"[\w\.-]+@[\w\.-]+\.\w+",
    'phone': r"[\+]?[\d\s\(\)\-]{10,}",
    'linkedin': r"linkedin\.com/in/[\w\-]+",
    'address': r"\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b"
}

# Project indicators
PROJECT_INDICATORS = [
    "concept", "design", "renovation", "apartment", "kitchen", "conference",
    "exhibit", "pavilion", "stand", "pg.", "client", "budget", "brief"
]

ALL_SECTIONS = [
    "personal_info", "summary", "experience", "education", 
    "skills", "certifications", "projects", "other", "uncategorized"
]

class CVSectionClassifier:
    def __init__(self):
        self.current_section = "personal_info"
        self.confidence_threshold = 0.7
        
    def is_section_header(self, line: str) -> Optional[str]:
        """Detect if a line is a section header and return section name"""
        line_clean = line.lower().strip().strip(":").strip("-").strip("_").strip()
        
        # Remove formatting characters
        line_clean = re.sub(r'^[*•\-=_\s]+', '', line_clean)
        line_clean = re.sub(r'[*•\-=_\s]+$', '', line_clean)
        
        # Direct matches
        for section, keywords in SECTION_HEADERS.items():
            for keyword in keywords:
                if line_clean == keyword or keyword in line_clean:
                    # Additional validation for short matches
                    if len(keyword) > 3 or len(line_clean.split()) <= 2:
                        return section
        
        # Check if it looks like a section header by format
        if self._looks_like_header_format(line):
            # Try partial matches for formatted headers
            for section, keywords in SECTION_HEADERS.items():
                for keyword in keywords:
                    if keyword in line_clean:
                        return section
        
        return None
    
    def _looks_like_header_format(self, line: str) -> bool:
        """Check if line has formatting typical of section headers"""
        line_stripped = line.strip()
        
        # All caps and reasonable length
        if line_stripped.isupper() and 3 <= len(line_stripped) <= 30:
            return True
        
        # Ends with colon
        if line_stripped.endswith(':') and len(line_stripped.split()) <= 4:
            return True
        
        # Has special formatting
        if re.match(r'^[*=\-_]{2,}.*[*=\-_]{2,}$', line_stripped):
            return True
        
        return False
    
    def classify_personal_info(self, line: str) -> bool:
        """Check if line contains personal information"""
        line_lower = line.lower()
        
        # Contact information
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, line, re.IGNORECASE):
                return True
        
        # Name detection (proper case, 2-4 words, at start of document)
        words = line.strip().split()
        if len(words) >= 2 and len(words) <= 4:
            if all(word[0].isupper() and len(word) > 1 for word in words if word.isalpha()):
                return True
        
        # Professional title/summary keywords
        if any(word in line_lower for word in ["designer", "developer", "engineer", "manager"]):
            if len(line.split()) <= 6:  # Likely a title, not a job description
                return True
        
        return False
    
    def classify_experience(self, line: str) -> float:
        """Return confidence score for experience classification"""
        score = 0.0
        line_lower = line.lower()
        
        # Job titles
        for pattern in JOB_TITLE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.4
        
        # Company patterns
        for pattern in COMPANY_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.3
        
        # Date patterns
        for pattern in DATE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.3
        
        # Experience keywords
        exp_keywords = ["reference", "phone", "email", "responsibilities", "achievements"]
        for keyword in exp_keywords:
            if keyword in line_lower:
                score += 0.1
        
        return min(score, 1.0)
    
    def classify_skills(self, line: str) -> float:
        """Return confidence score for skills classification"""
        score = 0.0
        line_lower = line.lower()
        
        # Technical skills
        for skill in TECHNICAL_SKILLS:
            if skill in line_lower:
                score += 0.2
        
        # Soft skills
        for skill in SOFT_SKILLS:
            if skill in line_lower:
                score += 0.1
        
        # Skills formatting patterns
        if re.search(r'^[A-Z\s]+$', line.strip()) and len(line.split()) <= 4:
            score += 0.2
        
        return min(score, 1.0)
    
    def classify_education(self, line: str) -> float:
        """Return confidence score for education classification"""
        score = 0.0
        line_lower = line.lower()
        
        # Education keywords
        edu_keywords = ["university", "college", "degree", "bachelor", "master", "phd", "bsc", "ba", "ma", "diploma", "certificate", "matric", "grade"]
        for keyword in edu_keywords:
            if keyword in line_lower:
                score += 0.3
        
        # Institution names
        if "academy" in line_lower or "school" in line_lower:
            score += 0.2
        
        # Date patterns (graduation years)
        if re.search(r'\b\d{4}(-\d{4})?\b', line):
            score += 0.2
        
        return min(score, 1.0)
    
    def classify_projects(self, line: str) -> float:
        """Return confidence score for projects classification"""
        score = 0.0
        line_lower = line.lower()
        
        # Project indicators
        for indicator in PROJECT_INDICATORS:
            if indicator in line_lower:
                score += 0.2
        
        # Page references
        if re.search(r'pg?\.\s*\d+', line_lower):
            score += 0.3
        
        # Project patterns
        if re.search(r'@\s*[A-Z]', line):  # @ LOCATION/EVENT
            score += 0.2
        
        # Years in project context
        if re.search(r'\b20\d{2}\b', line):
            score += 0.1
        
        return min(score, 1.0)

def extract_cv_sections(text: str) -> Dict[str, List[str]]:
    """Enhanced CV section extraction with better classification"""
    if not text or not text.strip():
        return {sec: [] for sec in ALL_SECTIONS}
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return {sec: [] for sec in ALL_SECTIONS}
    
    classifier = CVSectionClassifier()
    sections = {sec: [] for sec in ALL_SECTIONS}
    
    current_section = "personal_info"
    i = 0
    
    # Process each line
    while i < len(lines):
        line = lines[i]
        
        # Check for section header
        detected_section = classifier.is_section_header(line)
        if detected_section:
            current_section = detected_section
            i += 1
            continue
        
        # Skip very short lines that might be formatting
        if len(line.strip()) <= 2:
            i += 1
            continue
        
        # Classify line based on content
        if classifier.classify_personal_info(line):
            sections["personal_info"].append(line)
        else:
            # Score line for different sections
            scores = {
                "experience": classifier.classify_experience(line),
                "skills": classifier.classify_skills(line),
                "education": classifier.classify_education(line),
                "projects": classifier.classify_projects(line)
            }
            
            # Find best match
            best_section = max(scores.items(), key=lambda x: x[1])
            
            if best_section[1] >= classifier.confidence_threshold:
                sections[best_section[0]].append(line)
            else:
                # Default to current section context
                sections[current_section].append(line)
        
        i += 1
    
    # Post-processing: Move obvious misclassifications
    sections = _post_process_sections(sections)
    
    # Remove empty sections except core ones
    core_sections = {"personal_info", "experience", "education", "skills"}
    return {k: v for k, v in sections.items() if v or k in core_sections}

def _post_process_sections(sections: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Post-process to fix obvious misclassifications"""
    
    # Move contact info to personal_info regardless of where it ended up
    for section_name, items in sections.items():
        if section_name == "personal_info":
            continue
            
        items_to_move = []
        remaining_items = []
        
        for item in items:
            # Check if it's contact info
            is_contact = False
            for pattern in CONTACT_PATTERNS.values():
                if re.search(pattern, item, re.IGNORECASE):
                    is_contact = True
                    break
            
            if is_contact:
                items_to_move.append(item)
            else:
                remaining_items.append(item)
        
        # Move contact items
        sections["personal_info"].extend(items_to_move)
        sections[section_name] = remaining_items
    
    # Move obvious skills to skills section
    skills_to_move = []
    for section_name, items in sections.items():
        if section_name == "skills":
            continue
            
        remaining_items = []
        for item in items:
            # Check if it's obviously a skill
            is_skill = False
            item_lower = item.lower()
            
            # Technical skills that are standalone
            for skill in TECHNICAL_SKILLS:
                if skill in item_lower and len(item.split()) <= 3:
                    is_skill = True
                    break
            
            if is_skill:
                skills_to_move.append(item)
            else:
                remaining_items.append(item)
        
        sections[section_name] = remaining_items
    
    sections["skills"].extend(skills_to_move)
    
    return sections