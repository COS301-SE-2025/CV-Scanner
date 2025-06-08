from tika import parser

def categorize_cv(text: str):
    """
    Categorize CV text into sections by simple keyword matching.
    """
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

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    current_section = None

    for line in lines:
        lower = line.lower()

        if "profile" in lower:
            current_section = "profile"
        elif "education" in lower:
            current_section = "education"
        elif "skill" in lower:
            current_section = "skills"
        elif "language" in lower:
            current_section = "languages"
        elif "project" in lower:
            current_section = "projects"
        elif "achievement" in lower:
            current_section = "achievements"
        elif any(x in lower for x in ["phone", "email", "address", "github", ".com"]):
            current_section = "contact"
        elif lower.strip() == "":
            current_section = None

        if current_section:
            categories[current_section].append(line)
        else:
            categories["other"].append(line)

    return categories

def main():
    pdf_path = "example.pdf"

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
