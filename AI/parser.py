import re
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

# Enhanced section keywords with more variations and context
SECTION_HEADERS = {
    "summary": [
        "summary", "objective", "profile", "about", "personal statement", 
        "career objective", "professional summary", "overview", "introduction",
        "career profile", "professional profile"
    ],
    "experience": [
        "experience", "work history", "employment", "work experience", 
        "professional experience", "career history", "employment history",
        "work", "career", "professional background", "employment record",
        "job history", "positions held"
    ],
    "education": [
        "education", "qualifications", "academic", "academic background", 
        "educational background", "training", "degrees", "certifications and education",
        "academic qualifications", "educational qualifications", "learning",
        "studies", "academic history"
    ],
    "skills": [
        "skills", "technologies", "tools", "competencies", "technical skills", 
        "core competencies", "key skills", "software", "expertise", "abilities",
        "technical competencies", "proficiencies", "technical expertise",
        "software skills", "programming languages"
    ],
    "certifications": [
        "certifications", "licenses", "certified", "certification", 
        "professional certifications", "credentials", "certificates",
        "professional licenses", "accreditation"
    ],
    "projects": [
        "projects", "portfolio", "case studies", "key projects", 
        "selected projects", "project experience", "notable projects",
        "project portfolio", "work samples", "design projects"
    ],
    "other": [
        "interests", "references", "hobbies", "miscellaneous", 
        "additional information", "personal interests", "activities",
        "volunteer", "awards", "achievements", "honors", "publications",
        "languages", "personal", "additional", "extras"
    ]
}

# Enhanced technical skills with categories
TECHNICAL_SKILLS = {
    'design': [
        "revit", "autocad", "adobe", "illustrator", "photoshop", "indesign", 
        "3ds max", "sketchup", "twin motion", "rhino", "vectorworks", "archicad",
        "maya", "blender", "cinema 4d", "after effects", "premiere", "figma",
        "sketch", "invision", "axure"
    ],
    'programming': [
        "python", "java", "javascript", "html", "css", "sql", "react", "angular", 
        "vue", "nodejs", "php", "c++", "c#", ".net", "ruby", "swift", "kotlin",
        "typescript", "go", "rust", "scala", "mysql", "nosql"
    ],
    'office': [
        "excel", "powerpoint", "word", "outlook", "teams", "slack", "sharepoint",
        "onedrive", "google workspace", "sheets", "docs", "slides"
    ],
    'database': [
        "mysql", "postgresql", "mongodb", "oracle", "sqlite", "redis"
    ],
    'cloud': [
        "aws", "azure", "gcp", "docker", "kubernetes", "jenkins"
    ]
}

# Flatten technical skills for easier searching
ALL_TECHNICAL_SKILLS = []
for category in TECHNICAL_SKILLS.values():
    ALL_TECHNICAL_SKILLS.extend(category)

# Enhanced soft skills
SOFT_SKILLS = [
    "teamwork", "communication", "leadership", "problem solving", 
    "analytical", "creative", "management", "organization", "planning",
    "collaboration", "presentation", "negotiation", "time management",
    "critical thinking", "adaptability", "initiative", "detail oriented",
    "customer service", "project management", "multitasking", "mentoring",
    "effective communication"
]

# Enhanced job title patterns
JOB_TITLE_PATTERNS = [
    r"\b(senior|junior|lead|principal|chief|head|assistant|associate)\s+\w+",
    r"\b\w+\s+(designer|developer|engineer|manager|analyst|consultant|director|coordinator|specialist|administrator|technician|supervisor|assistant|architect|planner)\b",
    r"\binterior\s+(designer|architect)\b",
    r"\bproject\s+(manager|coordinator|lead)\b",
    r"\bgraphic\s+designer\b",
    r"\bsoftware\s+(developer|engineer|architect)\b",
    r"\bfull\s+stack\s+(developer|engineer)\b",
    r"\bdata\s+(scientist|analyst|engineer)\b",
    r"\bcomputer\s+science\s+student\b"
]

# Enhanced company indicators
COMPANY_PATTERNS = [
    r"\b\w+\s+(inc|ltd|llc|corp|company|technologies|solutions|systems|services|group|pty|co\.)\b",
    r"\|\s*[A-Z][a-z]+.*,\s*[A-Z]{2,3}\b",  # | Location pattern
    r"@\s*[A-Z][A-Za-z\s]+",  # @ Company pattern
    r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\s*\|\s*[A-Z]",  # Company | Location
]

# Enhanced date patterns
DATE_PATTERNS = [
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s*-\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b",
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s*-\s*(present|current)\b",
    r"\b\d{4}\s*-\s*\d{4}\b",
    r"\b\d{1,2}/\d{4}\s*-\s*\d{1,2}/\d{4}\b",
    r"\b\d{4}\s*-\s*(present|current)\b",
    r"\b\d{1,2}/\d{2,4}\s*-\s*\d{1,2}/\d{2,4}\b"
]

# Contact patterns - FIXED AND IMPROVED
CONTACT_PATTERNS = {
    'email': r"[\w\.-]+@[\w\.-]+\.\w+",
    'phone': r"(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[\s-]\d{3}[\s-]\d{4}\b",
    'linkedin': r"linkedin\.com/in/[\w\-]+",
    'github': r"github\.com/[\w\-]+",
    'address': r"\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b"
}

# Contact field labels - NEW
CONTACT_LABELS = [
    "phone", "email", "address", "github", "linkedin", "contact", 
    "phone:", "email:", "address:", "github:", "linkedin:", "contact:",
    "email address:", "phone number:", "mobile:", "cell:", "tel:", "website:"
]

# Project indicators
PROJECT_INDICATORS = [
    "concept", "design", "renovation", "apartment", "kitchen", "conference",
    "exhibit", "pavilion", "stand", "pg.", "client", "budget", "brief",
    "prototype", "development", "implementation", "solution", "system",
    "application", "streaming", "database", "simulation", "city", "gui",
    "web application", "full-stack", "features", "ratings", "friends"
]

# Education indicators
EDUCATION_INDICATORS = [
    "university", "college", "degree", "bachelor", "master", "phd", "bsc", "ba", 
    "ma", "diploma", "certificate", "matric", "grade", "academy", "school",
    "institution", "gpa", "honors", "cum laude", "magna cum laude", "summa cum laude",
    "faculty", "student", "bachelors", "masters"
]

ALL_SECTIONS = [
    "personal_info", "summary", "experience", "education", 
    "skills", "certifications", "projects", "other", "uncategorized"
]

class EnhancedCVSectionClassifier:
    def __init__(self):
        self.current_section = "personal_info"
        self.confidence_threshold = 0.4  # Lowered for better classification
        self.section_context = []
        self.line_number = 0
        self.found_name = False
        self.document_lines = []
        
    def set_document_lines(self, lines):
        """Set the full document for context analysis"""
        self.document_lines = lines
        
    def is_section_header(self, line: str) -> Optional[str]:
        """Enhanced section header detection with better formatting recognition"""
        line_original = line
        line_clean = line.lower().strip().strip(":").strip("-").strip("_").strip()
        
        # Remove common formatting characters
        line_clean = re.sub(r'^[*•\-=_\s\|]+', '', line_clean)
        line_clean = re.sub(r'[*•\-=_\s\|]+$', '', line_clean)
        
        # Check for obvious header formatting first
        is_formatted_header = self._is_formatted_header(line_original)
        
        # Direct keyword matches
        for section, keywords in SECTION_HEADERS.items():
            for keyword in keywords:
                # Exact match
                if line_clean == keyword:
                    return section
                
                # Partial match with validation
                if keyword in line_clean:
                    # For short keywords, require more strict matching
                    if len(keyword) <= 4:
                        # Must be standalone word or in formatted header
                        if (re.search(rf'\b{re.escape(keyword)}\b', line_clean) or 
                            is_formatted_header):
                            return section
                    else:
                        # Longer keywords can be partial matches
                        if len(line_clean.split()) <= 4:  # But line should be short
                            return section
        
        # Check for common section headers that might be missed
        if line_clean == "contact":
            return "personal_info"
        
        # Check for acronym headers (e.g., "BSc", "MSc")
        if re.match(r'^[A-Z]{2,4}$', line_clean.upper()):
            return "education"
        
        return None
    
    def _is_formatted_header(self, line: str) -> bool:
        """Enhanced header format detection"""
        line_stripped = line.strip()
        
        # All caps and reasonable length
        if line_stripped.isupper() and 3 <= len(line_stripped) <= 40:
            return True
        
        # Ends with colon
        if line_stripped.endswith(':') and len(line_stripped.split()) <= 5:
            return True
        
        # Has special formatting characters
        if re.match(r'^[*=\-_•]{2,}.*[*=\-_•]{2,}$', line_stripped):
            return True
        
        # Surrounded by special characters
        if re.match(r'^[*=\-_•\|]\s*.+\s*[*=\-_•\|]$', line_stripped):
            return True
        
        # All letters with spaces (like "S k i l l s")
        if re.match(r'^[A-Z]\s+[A-Z]\s+', line_stripped):
            return True
        
        return False
    
    def classify_personal_info(self, line: str) -> float:
        """FIXED: Enhanced personal info classification with better contact detection"""
        score = 0.0
        line_lower = line.lower().strip()
        line_original = line.strip()
        
        # HIGHEST PRIORITY: Contact information patterns
        for pattern_type, pattern in CONTACT_PATTERNS.items():
            if re.search(pattern, line, re.IGNORECASE):
                score += 1.0  # Maximum score for contact info
                return score
        
        # Contact field labels (like "Phone:", "Email:", etc.)
        for label in CONTACT_LABELS:
            if line_lower == label or line_lower.startswith(label):
                score += 0.9
                return score
        
        # Name detection (early in document + proper formatting)
        if self.line_number < 15 and not self.found_name:
            words = line_original.split()
            if 2 <= len(words) <= 4:
                # Check if words look like names (proper case, alphabetic)
                if all(len(word) > 1 and word[0].isupper() and 
                       word[1:].islower() and word.isalpha() 
                       for word in words):
                    # Additional validation: not common English words
                    common_words = {"the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with"}
                    if not any(word.lower() in common_words for word in words):
                        score += 0.95
                        self.found_name = True
                        return score
        
        # Professional titles/roles (when short and early in document)
        if self.line_number < 20:
            for pattern in JOB_TITLE_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    # Make sure it's not a long sentence describing experience
                    if len(line.split()) <= 8:
                        score += 0.8
                        return score
        
        # Location patterns (addresses, cities)
        location_patterns = [
            r"\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)",
            r"\b[A-Z][a-z]+,\s*[A-Z]{2,3}\b",  # City, State/Country
            r"\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b"   # City, Country
        ]
        for pattern in location_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.8
                return score
        
        # Social media links
        social_patterns = [
            r"(linkedin|github|twitter|facebook)\.com",
            r"@\w+",  # Social media handles
        ]
        for pattern in social_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.9
                return score
        
        # Single word contact labels
        if line_lower in ["phone", "email", "address", "github", "linkedin", "contact"]:
            score += 0.7
        
        return min(score, 1.0)
    
    def classify_experience(self, line: str) -> float:
        """Enhanced experience classification"""
        score = 0.0
        line_lower = line.lower()
        
        # Skip if it's clearly contact info
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, line, re.IGNORECASE):
                return 0.0
        
        # Job titles (high confidence)
        for pattern in JOB_TITLE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.5
        
        # Company patterns (high confidence)
        for pattern in COMPANY_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.4
        
        # Date patterns (moderate confidence)
        for pattern in DATE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                score += 0.3
        
        # Experience-specific keywords
        exp_keywords = ["responsibilities", "achievements", "duties", "role", "position",
                       "managed", "developed", "implemented", "led", "supervised",
                       "coordinated", "designed", "created", "established"]
        for keyword in exp_keywords:
            if keyword in line_lower:
                score += 0.2
                break
        
        # Reference information
        if "reference" in line_lower and ("phone" in line_lower or "email" in line_lower):
            score += 0.4
        
        # Bullet points suggesting job duties
        if line.strip().startswith(('-', '•', '*')):
            score += 0.1
        
        return min(score, 1.0)
    
    def classify_skills(self, line: str) -> float:
        """FIXED: Enhanced skills classification with better filtering"""
        score = 0.0
        line_lower = line.lower().strip()
        
        # EXCLUDE personal info items
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, line, re.IGNORECASE):
                return 0.0
        
        # EXCLUDE names (proper case multiple words)
        words = line.strip().split()
        if (2 <= len(words) <= 4 and 
            all(len(word) > 1 and word[0].isupper() and word[1:].islower() and word.isalpha() 
                for word in words)):
            return 0.0
        
        # EXCLUDE job titles in wrong context
        for pattern in JOB_TITLE_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE) and len(words) <= 5:
                return 0.0
        
        # EXCLUDE project descriptions (long sentences with project indicators)
        if len(line.split()) > 10:
            project_indicators_count = sum(1 for indicator in PROJECT_INDICATORS 
                                         if indicator in line_lower)
            if project_indicators_count >= 2:
                return 0.0
        
        # Technical skills (weighted by category)
        technical_matches = 0
        for skill in ALL_TECHNICAL_SKILLS:
            if skill in line_lower:
                technical_matches += 1
                score += 0.4
        
        # Bonus for multiple technical skills in one line
        if technical_matches > 1:
            score += 0.3
        
        # Soft skills
        soft_matches = 0
        for skill in SOFT_SKILLS:
            if skill in line_lower:
                soft_matches += 1
                score += 0.3
        
        # Skills formatting patterns
        # Comma-separated list pattern (common for skills)
        if ',' in line and len(line.split(',')) >= 2:
            # Check if items in the list look like skills
            items = [item.strip() for item in line.split(',')]
            skill_like_items = 0
            for item in items:
                if (any(skill in item.lower() for skill in ALL_TECHNICAL_SKILLS) or
                    any(skill in item.lower() for skill in SOFT_SKILLS)):
                    skill_like_items += 1
            
            if skill_like_items >= len(items) * 0.5:  # At least half are skill-like
                score += 0.4
        
        # Programming languages pattern
        prog_languages = ["python", "java", "javascript", "c++", "c#", "php", "ruby", "html", "css"]
        prog_matches = sum(1 for lang in prog_languages if lang in line_lower)
        if prog_matches > 0:
            score += 0.5
        
        # Language skills (but not programming languages)
        human_languages = ["english", "afrikaans", "french", "spanish", "german", "chinese"]
        if any(lang in line_lower for lang in human_languages) and len(words) <= 3:
            score += 0.3
        
        return min(score, 1.0)
    
    def classify_education(self, line: str) -> float:
        """FIXED: Enhanced education classification"""
        score = 0.0
        line_lower = line.lower()
        
        # EXCLUDE contact info
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, line, re.IGNORECASE):
                return 0.0
        
        # Strong education indicators
        for indicator in EDUCATION_INDICATORS:
            if indicator in line_lower:
                if indicator in ["university", "college", "degree", "bachelor", "master", "phd", "faculty"]:
                    score += 0.6  # High confidence
                else:
                    score += 0.3  # Medium confidence
        
        # Degree abbreviations
        degree_patterns = [
            r'\b(bsc|ba|ma|msc|phd|md|jd|mba|beng|btech|btec)\b',
            r'\b(bachelor|master|doctor)s?\s+(of|in)\b'
        ]
        for pattern in degree_patterns:
            if re.search(pattern, line_lower):
                score += 0.7
        
        # Education year patterns (different from work experience)
        edu_year_patterns = [
            r'\b(19|20)\d{2}-(19|20)\d{2}\b',  # Year range
            r'\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b',
        ]
        for pattern in edu_year_patterns:
            if re.search(pattern, line):
                score += 0.5
        
        # GPA or grades
        if re.search(r'\bgpa\b|grade\s*[a-d]|\d\.\d+/4\.0', line_lower):
            score += 0.3
        
        # School/Institution names
        if re.search(r'\b(school|university|college|institute|academy)\b', line_lower):
            score += 0.4
        
        return min(score, 1.0)
    
    def classify_projects(self, line: str) -> float:
        """FIXED: Enhanced projects classification"""
        score = 0.0
        line_lower = line.lower()
        
        # EXCLUDE contact info
        for pattern in CONTACT_PATTERNS.values():
            if re.search(pattern, line, re.IGNORECASE):
                return 0.0
        
        # Project description patterns (longer lines with project keywords)
        project_count = 0
        for indicator in PROJECT_INDICATORS:
            if indicator in line_lower:
                project_count += 1
                score += 0.2
        
        # Bonus for multiple project indicators in longer descriptions
        if project_count >= 2 and len(line.split()) > 8:
            score += 0.4
        
        # Technical project patterns
        tech_project_patterns = [
            r'\b(web application|mobile app|software|system|database|api)\b',
            r'\b(developed|created|built|designed|implemented)\b.*\b(application|system|website|app)\b',
            r'\bfull[-\s]?stack\b',
            r'\b(frontend|backend|ui|ux)\b'
        ]
        for pattern in tech_project_patterns:
            if re.search(pattern, line_lower):
                score += 0.3
        
        # Project features/functionality descriptions
        feature_keywords = ["features", "functionality", "interface", "user", "client", "gui"]
        feature_matches = sum(1 for keyword in feature_keywords if keyword in line_lower)
        if feature_matches > 0:
            score += 0.2 * feature_matches
        
        # Page references (common in portfolios)
        if re.search(r'pg?\.\s*\d+', line_lower):
            score += 0.4
        
        # URL patterns in project context
        if re.search(r'http[s]?://|github\.com', line_lower):
            score += 0.3
        
        return min(score, 1.0)

def extract_cv_sections(text: str) -> Dict[str, List[str]]:
    """Enhanced CV section extraction with improved classification"""
    if not text or not text.strip():
        return {sec: [] for sec in ALL_SECTIONS}
    
    # Clean and prepare text
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return {sec: [] for sec in ALL_SECTIONS}
    
    classifier = EnhancedCVSectionClassifier()
    classifier.set_document_lines(lines)
    sections = {sec: [] for sec in ALL_SECTIONS}
    
    current_section = "personal_info"
    i = 0
    
    # First pass: identify obvious section headers
    section_headers = {}
    for idx, line in enumerate(lines):
        detected_section = classifier.is_section_header(line)
        if detected_section:
            section_headers[idx] = detected_section
    
    # Second pass: classify content
    while i < len(lines):
        line = lines[i]
        classifier.line_number = i
        
        # Check if this line is a section header
        if i in section_headers:
            current_section = section_headers[i]
            classifier.current_section = current_section
            i += 1
            continue
        
        # Skip very short lines that might be formatting
        if len(line.strip()) <= 1:
            i += 1
            continue
        
        # Classify based on content with improved logic
        personal_score = classifier.classify_personal_info(line)
        
        # High confidence personal info classification
        if personal_score >= 0.8:
            sections["personal_info"].append(line)
        else:
            # Score for other sections
            scores = {
                "experience": classifier.classify_experience(line),
                "skills": classifier.classify_skills(line),
                "education": classifier.classify_education(line),
                "projects": classifier.classify_projects(line)
            }
            
            # Add personal info score to comparison
            scores["personal_info"] = personal_score
            
            best_section, best_score = max(scores.items(), key=lambda x: x[1])
            
            # Use lower threshold for better classification
            if best_score >= classifier.confidence_threshold:
                sections[best_section].append(line)
            elif current_section != "personal_info" and personal_score < 0.3:
                # Use current section context if no strong match and not likely personal info
                sections[current_section].append(line)
            else:
                # Default fallback
                sections["uncategorized"].append(line)
        
        i += 1
    
    # Post-processing improvements
    sections = _enhanced_post_process_sections(sections)
    
    # Remove empty sections except core ones
    core_sections = {"personal_info", "experience", "education", "skills"}
    result = {k: v for k, v in sections.items() if v or k in core_sections}
    
    return result

def _enhanced_post_process_sections(sections: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Enhanced post-processing with better pattern recognition"""
    
    # Move contact information to personal_info more aggressively
    for section_name, items in list(sections.items()):
        if section_name == "personal_info":
            continue
            
        items_to_move = []
        remaining_items = []
        
        for item in items:
            is_contact = False
            item_lower = item.lower().strip()
            
            # Check for contact patterns
            for pattern in CONTACT_PATTERNS.values():
                if re.search(pattern, item, re.IGNORECASE):
                    is_contact = True
                    break
            
            # Check for contact labels
            for label in CONTACT_LABELS:
                if item_lower == label or item_lower.startswith(label):
                    is_contact = True
                    break
            
            # Check for name patterns
            words = item.strip().split()
            if (len(words) == 2 and 
                all(len(word) > 1 and word[0].isupper() and word[1:].islower() and word.isalpha() 
                    for word in words)):
                is_contact = True
            
            # Check for social media
            if re.search(r'(github|linkedin)\.com', item, re.IGNORECASE):
                is_contact = True
            
            if is_contact:
                items_to_move.append(item)
            else:
                remaining_items.append(item)
        
        sections["personal_info"].extend(items_to_move)
        sections[section_name] = remaining_items
    
    return sections