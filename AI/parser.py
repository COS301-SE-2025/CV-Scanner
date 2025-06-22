import re

SECTION_HEADERS = {
    "summary": ["summary", "objective", "profile", "about"],
    "experience": ["experience", "work history", "employment"],
    "education": ["education", "qualifications", "academic"],
    "skills": ["skills", "technologies", "tools", "competencies"],
    "certifications": ["certifications", "licenses", "certificates"],
    "projects": ["projects", "portfolio"],
    "other": ["interests", "references", "hobbies", "miscellaneous"],
}

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
    line = line.lower().strip(":").strip()
    for section, keywords in SECTION_HEADERS.items():
        for keyword in keywords:
            if keyword in line:
                return section
    return None

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

        # If early in the CV and no clear section has started yet
        if not section_started and current_section == "personal_info":
            sections["personal_info"].append(line)
        elif current_section in sections:
            sections[current_section].append(line)
        else:
            sections["uncategorized"].append(line)

    return sections
