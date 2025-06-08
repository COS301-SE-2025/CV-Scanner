from tika import parser

def categorize_cv(text: str):
    categories = {
        "profile": [],
        "education": [],
        "skills": [],
        "languages": [],
        "projects": [],
        "achievements": [],
        "contact": [],
        "other": []
    }

    lines = [line.strip() for line in text.splitlines()]
    current_section = None

    section_keywords = {
        "profile": ["profile"],
        "education": ["education"],
        "skills": ["skill", "technical skills"],
        "languages": ["language"],
        "projects": ["project"],
        "achievements": ["achievement"],
        "contact": ["phone", "email", "address", "github", ".com"]
    }

    def matches_section(line):
        lower = line.lower()
        for section, keywords in section_keywords.items():
            for kw in keywords:
                if kw in lower:
                    return section
        return None

    for line in lines:
        if not line.strip():
            current_section = None
            continue

        matched_section = matches_section(line)
        if matched_section:
            current_section = matched_section
            continue  # Skip adding the header line to content

        if current_section:
            categories[current_section].append(line)
        else:
            categories["other"].append(line)

    return categories

def main():
    pdf_path = "CV(1).pdf"

    try:
        parsed = parser.from_file(pdf_path)
        cv_text = parsed.get('content', '')
        if not cv_text:
            print(f"No content extracted from {pdf_path}")
            return
    except Exception as e:
        print(f"Failed to parse PDF: {e}")
        return

    categorized = categorize_cv(cv_text)
    for section, content in categorized.items():
        print(f"\n--- {section.upper()} ---")
        for line in content:
            print(line)

if __name__ == "__main__":
    main()
