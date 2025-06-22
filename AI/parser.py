import re

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about"],
    "experience": ["experience", "work history", "employment"],
    "education": ["education", "qualifications", "academic"],
    "skills": ["skills", "technologies", "tools", "competencies"],
    "certifications": ["certifications", "licenses", "certified", "certification"],
    "projects": ["projects", "portfolio"],
    "other": ["interests", "references", "hobbies", "miscellaneous"],
}

CERT_KEYWORDS = ["certification", "certified", "microsoft", "aws", "oracle", "license"]
PROJECT_PATTERNS = [r"\b[A-Z][a-z]+ \d{4}\b", r"Technologies Used:", r"http[s]?://"]

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
    return any(re.search(pattern, line) for pattern in PROJECT_PATTERNS)

def extract_cv_sections(text):
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    sections = {sec: [] for sec in ALL_SECTIONS}
    current_section = "personal_info"
    section_started = False

    for line in lines:
        detected = identify_section(line)

        if detected:
            current_section = detected
            section_started = True
            continue

        # Early contact info should go to personal_info
        if not section_started:
            sections["personal_info"].append(line)
            continue

        # Special case: classify single lines based on content
        if looks_like_certification(line):
            sections["certifications"].append(line)
        elif looks_like_project(line):
            sections["projects"].append(line)
        elif current_section in sections:
            sections[current_section].append(line)
        else:
            sections["uncategorized"].append(line)

    return sections
