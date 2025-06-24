import re

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about me"],
    "experience": ["experience", "work history", "employment"],
    "education": ["education", "qualifications", "academic"],
    "skills": ["skills", "technologies", "tools", "competencies"],
    "certifications": ["certifications", "licenses", "certified", "certification"],
    "projects": ["projects", "portfolio"],
    "other": ["interests", "references", "hobbies", "miscellaneous"],
}

CERT_KEYWORDS = ["certification", "certified", "microsoft", "aws", "oracle", "license"]
PROJECT_KEYWORDS = ["project", "developed", "built", "designed", "created", "simulation", "database", "website", "application"]
PROJECT_PATTERNS = [r"\b[A-Z][a-z]+ \d{4}\b", r"Technologies Used:", r"http[s]?://", r"github\.com"]
SKILL_KEYWORDS = ["python", "java", "c++", "sql", "html", "css", "javascript", "php", "nodejs"]

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

def identify_section(line):
    line_clean = line.lower().strip(":").strip()
    for section, keywords in SECTION_HEADERS.items():
        for keyword in keywords:
            if keyword in line_clean:
                return section
    return None

def looks_like_certification(line):
    return any(keyword in line.lower() for keyword in CERT_KEYWORDS)

def looks_like_project(line):
    if any(keyword in line.lower() for keyword in PROJECT_KEYWORDS):
        return True
    if any(re.search(pattern, line) for pattern in PROJECT_PATTERNS):
        return True
    return False

def looks_like_contact_info(line):
    email_pattern = r"[\w\.-]+@[\w\.-]+\.\w+"
    phone_pattern = r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)*\d{3,4}[-.\s]?\d{3,4}\b"
    github_pattern = r"github\.com\/[A-Za-z0-9_-]+"
    address_keywords = ["address", "street", "road", "ave", "crescent", "lane", "drive", "city", "zip", "postal"]

    if re.search(email_pattern, line, re.IGNORECASE):
        return True
    if re.search(phone_pattern, line, re.IGNORECASE):
        return True
    if re.search(github_pattern, line, re.IGNORECASE):
        return True
    if any(word in line.lower() for word in address_keywords):
        return True
    return False

def extract_cv_sections(text):
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    sections = {sec: [] for sec in ALL_SECTIONS}

    current_section = "personal_info"
    section_started = False
    buffer = []

    for line in lines:
        detected = identify_section(line)

        if detected:
            # Dump any buffered lines to current section before changing
            if buffer:
                sections[current_section].extend(buffer)
                buffer.clear()

            current_section = detected
            section_started = True
            continue

        # Priority detection for contact info
        if looks_like_contact_info(line):
            sections["personal_info"].append(line)
            continue

        # Before any section header, assume personal info
        if not section_started:
            sections["personal_info"].append(line)
            continue

        # Accumulate lines for possible multi-line sections
        buffer.append(line)

        # Try to classify based on line content
        if looks_like_certification(line):
            sections["certifications"].append(line)
            buffer.clear()
        elif looks_like_project(line):
            sections["projects"].append(line)
            buffer.clear()
        elif current_section == "skills" and any(skill in line.lower() for skill in SKILL_KEYWORDS):
            sections["skills"].append(line)
            buffer.clear()
        elif current_section in sections:
            # Leave line in buffer — it’ll be dumped to current_section later
            pass
        else:
            sections["uncategorized"].append(line)
            buffer.clear()

    # Flush any remaining buffered lines
    if buffer:
        sections[current_section].extend(buffer)

    return sections
