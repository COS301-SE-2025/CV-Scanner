import re

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about me"],
    "experience": ["experience", "work history", "employment"],
    "education": ["education", "qualifications", "academic"],
    "skills": ["skills", "technologies", "tools", "competencies", "languages"],
    "certifications": ["certifications", "licenses", "certified", "certification"],
    "projects": ["projects", "portfolio", "case studies"],
    "other": ["interests", "references", "hobbies", "miscellaneous"],
}

CERT_KEYWORDS = ["certification", "certified", "microsoft", "aws", "oracle", "license"]
PROJECT_KEYWORDS = ["project", "developed", "designed", "created", "interior", "exhibit", "conference", "client", "build", "renovation"]
PROJECT_PATTERNS = [r"http[s]?://", r"github\.com", r"\b\d{4}\b", r"@.+", r"PG\. ?\d+"]
SKILL_KEYWORDS = ["python", "java", "c++", "sql", "html", "css", "javascript", "php", "nodejs", "teamwork", "communication"]

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
    phone_pattern = r"\+?\d[\d\s\(\)\-]{7,}"
    return (
        re.search(email_pattern, line, re.IGNORECASE) or
        re.search(phone_pattern, line, re.IGNORECASE)
    )

def looks_like_name_or_title(line):
    return bool(re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", line)) or "designer" in line.lower()

def extract_cv_sections(text):
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    sections = {sec: [] for sec in ALL_SECTIONS}

    current_section = "personal_info"
    section_started = False
    project_buffer = []
    previous_was_project = False

    for line in lines:
        # New section header?
        detected = identify_section(line)
        if detected:
            if project_buffer:
                sections["projects"].extend(project_buffer)
                project_buffer.clear()
            current_section = detected
            section_started = True
            continue

        # Contact info overrides all section guesses
        if looks_like_contact_info(line):
            sections["personal_info"].append(line)
            continue

        # Handle name/title
        if looks_like_name_or_title(line):
            sections["personal_info"].append(line)
            continue

        # Special case: Project detection
        if looks_like_project(line):
            project_buffer.append(line)
            previous_was_project = True
            continue

        # If we're still seeing project lines, keep grouping them until a major break
        if previous_was_project:
            if len(line) < 2 or identify_section(line) or looks_like_contact_info(line):
                # End of project block
                sections["projects"].extend(project_buffer)
                project_buffer.clear()
                previous_was_project = False
            else:
                project_buffer.append(line)
                continue

        # Heuristic: early lines go to personal_info
        if not section_started:
            sections["personal_info"].append(line)
            continue

        # Classify by section
        if current_section == "skills" and any(skill in line.lower() for skill in SKILL_KEYWORDS):
            sections["skills"].append(line)
        elif current_section == "experience":
            sections["experience"].append(line)
        elif current_section == "education":
            sections["education"].append(line)
        elif current_section == "summary":
            sections["summary"].append(line)
        else:
            sections[current_section].append(line)

    # Flush remaining project block
    if project_buffer:
        sections["projects"].extend(project_buffer)

    return sections
