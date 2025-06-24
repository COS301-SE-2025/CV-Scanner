import re

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about me", "personal statement", "career objective"],
    "experience": ["experience", "work history", "employment", "work experience", "professional experience", "career history"],
    "education": ["education", "qualifications", "academic", "academic background", "educational background"],
    "skills": ["skills", "technologies", "tools", "competencies", "technical skills", "core competencies", "key skills"],
    "certifications": ["certifications", "licenses", "certified", "certification", "professional certifications"],
    "projects": ["projects", "portfolio", "case studies", "key projects", "selected projects"],
    "other": ["interests", "references", "hobbies", "miscellaneous", "additional information", "personal interests"],
}

CERT_KEYWORDS = ["certification", "certified", "microsoft", "aws", "oracle", "license", "comptia", "cisco", "pmp", "itil"]
PROJECT_KEYWORDS = ["project", "developed", "designed", "created", "built", "implemented", "led", "managed", "coordinated"]
PROJECT_PATTERNS = [r"http[s]?://", r"github\.com", r"\b\d{4}\b", r"@.+", r"PG\. ?\d+"]
SKILL_KEYWORDS = ["python", "java", "c++", "sql", "html", "css", "javascript", "php", "nodejs", "react", "angular", "vue", 
                  "teamwork", "communication", "leadership", "problem solving", "analytical", "creative"]

# Common job titles and company indicators
JOB_TITLES = ["developer", "engineer", "manager", "analyst", "designer", "consultant", "director", "coordinator", 
              "specialist", "administrator", "technician", "supervisor", "lead", "senior", "junior", "intern"]
COMPANY_INDICATORS = ["inc", "ltd", "llc", "corp", "company", "technologies", "solutions", "systems", "services"]

# Date patterns for experience entries
DATE_PATTERNS = [
    r"\b\d{4}\s*-\s*\d{4}\b",  # 2020-2023
    r"\b\d{1,2}/\d{4}\s*-\s*\d{1,2}/\d{4}\b",  # 01/2020-12/2023
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b",  # January 2020
    r"\b\d{4}\s*-\s*(present|current)\b",  # 2020-Present
]

ALL_SECTIONS = [
    "personal_info",
    "summary", 
    "experience",
    "education",
    "skills",
    "certifications",
    "projects",
    "other",
    "uncategorized"
]

def identify_section_header(line):
    """More robust section header detection"""
    line_clean = line.lower().strip(":").strip("-").strip("_").strip()
    
    # Remove common formatting
    line_clean = re.sub(r'^[*•\-]+\s*', '', line_clean)
    line_clean = re.sub(r'[*•\-]+$', '', line_clean)
    
    for section, keywords in SECTION_HEADERS.items():
        for keyword in keywords:
            if keyword in line_clean or line_clean == keyword:
                return section
    return None

def looks_like_certification(line):
    return any(keyword in line.lower() for keyword in CERT_KEYWORDS)

def looks_like_project(line):
    if any(keyword in line.lower() for keyword in PROJECT_KEYWORDS):
        return True
    if any(re.search(pattern, line, re.IGNORECASE) for pattern in PROJECT_PATTERNS):
        return True
    return False

def looks_like_contact_info(line):
    email_pattern = r"[\w\.-]+@[\w\.-]+\.\w+"
    phone_pattern = r"[\+]?[\d\s\(\)\-]{10,}"
    address_pattern = r"\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b"
    linkedin_pattern = r"linkedin\.com/in/"
    
    return (
        re.search(email_pattern, line, re.IGNORECASE) or
        re.search(phone_pattern, line) or
        re.search(address_pattern, line, re.IGNORECASE) or
        re.search(linkedin_pattern, line, re.IGNORECASE)
    )

def looks_like_name(line):
    # Name is typically at the top, 2-4 words, title case
    words = line.split()
    if len(words) >= 2 and len(words) <= 4:
        # Check if it looks like a proper name (title case)
        if all(word[0].isupper() and word[1:].islower() for word in words if word.isalpha()):
            return True
    return False

def looks_like_job_title(line):
    line_lower = line.lower()
    return any(title in line_lower for title in JOB_TITLES)

def looks_like_company(line):
    line_lower = line.lower()
    return any(indicator in line_lower for indicator in COMPANY_INDICATORS)

def has_date_pattern(line):
    """Check if line contains date patterns common in experience/education"""
    return any(re.search(pattern, line, re.IGNORECASE) for pattern in DATE_PATTERNS)

def looks_like_experience_entry(line):
    """Check if line looks like start of an experience entry"""
    return (looks_like_job_title(line) or 
            looks_like_company(line) or 
            has_date_pattern(line))

def is_likely_section_header(line):
    """Check if a line is likely a section header based on formatting"""
    line_stripped = line.strip()
    
    # All caps
    if line_stripped.isupper() and len(line_stripped) > 2:
        return True
    
    # Ends with colon
    if line_stripped.endswith(':'):
        return True
    
    # Surrounded by special characters
    if re.match(r'^[*=\-_]{2,}.*[*=\-_]{2,}$', line_stripped):
        return True
    
    # Short line that could be a header
    if len(line_stripped.split()) <= 3 and len(line_stripped) > 2:
        return True
    
    return False

def extract_cv_sections(text):
    if not text or not text.strip():
        return {sec: [] for sec in ALL_SECTIONS}
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    sections = {sec: [] for sec in ALL_SECTIONS}
    
    if not lines:
        return sections
    
    current_section = "personal_info"
    i = 0
    
    # Process first few lines for personal info
    while i < len(lines) and i < 10:  # Check first 10 lines max
        line = lines[i]
        
        # Check for section header
        detected_section = identify_section_header(line)
        if detected_section:
            current_section = detected_section
            i += 1
            break
        
        # Personal info detection
        if looks_like_name(line) or looks_like_contact_info(line):
            sections["personal_info"].append(line)
        elif is_likely_section_header(line):
            # Might be a section header we don't recognize
            sections["uncategorized"].append(line)
        else:
            sections["personal_info"].append(line)
        
        i += 1
    
    # Process remaining lines
    while i < len(lines):
        line = lines[i]
        
        # Check for new section header
        detected_section = identify_section_header(line)
        if detected_section:
            current_section = detected_section
            i += 1
            continue
        
        # Handle based on current section context
        if current_section == "experience":
            if looks_like_experience_entry(line) or has_date_pattern(line):
                sections["experience"].append(line)
            elif looks_like_certification(line):
                sections["certifications"].append(line)
            elif looks_like_project(line):
                sections["projects"].append(line)
            elif looks_like_contact_info(line):
                sections["personal_info"].append(line)
            elif is_likely_section_header(line):
                # Might be unlabeled section
                possible_section = identify_section_header(line)
                if possible_section:
                    current_section = possible_section
                    i += 1
                    continue
                else:
                    sections["experience"].append(line)
            else:
                sections["experience"].append(line)
        
        elif current_section == "education":
            if has_date_pattern(line) or "university" in line.lower() or "college" in line.lower() or "degree" in line.lower():
                sections["education"].append(line)
            elif looks_like_certification(line):
                sections["certifications"].append(line)
            elif looks_like_contact_info(line):
                sections["personal_info"].append(line)
            else:
                sections["education"].append(line)
        
        elif current_section == "skills":
            if any(skill in line.lower() for skill in SKILL_KEYWORDS):
                sections["skills"].append(line)
            elif looks_like_contact_info(line):
                sections["personal_info"].append(line)
            else:
                sections["skills"].append(line)
        
        elif current_section == "projects":
            if looks_like_project(line):
                sections["projects"].append(line)
            elif looks_like_contact_info(line):
                sections["personal_info"].append(line)
            else:
                sections["projects"].append(line)
        
        elif current_section == "certifications":
            if looks_like_certification(line):
                sections["certifications"].append(line)
            elif looks_like_contact_info(line):
                sections["personal_info"].append(line)
            else:
                sections["certifications"].append(line)
        
        elif current_section == "summary":
            if looks_like_contact_info(line):
                sections["personal_info"].append(line)
            else:
                sections["summary"].append(line)
        
        else:
            # Default handling
            if looks_like_contact_info(line):
                sections["personal_info"].append(line)
            elif looks_like_certification(line):
                sections["certifications"].append(line)
            elif looks_like_project(line):
                sections["projects"].append(line)
            elif looks_like_experience_entry(line):
                sections["experience"].append(line)
            else:
                sections[current_section].append(line)
        
        i += 1
    
    # Clean up empty sections and return
    return {k: v for k, v in sections.items() if v or k in ["personal_info", "summary", "experience", "education", "skills"]}