from tika import parser
import os
import json

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
            continue

        if current_section:
            categories[current_section].append(line)
        else:
            categories["other"].append(line)

    return categories

def prepare_json_data(categories: dict):
    # Convert lists of lines into strings for JSON
    json_data = {}
    for section, content in categories.items():
        json_data[section] = "\n".join(content).strip()
    return json_data

def main():
    pdf_path = "CV(1).pdf"

    if not os.path.isfile(pdf_path):
        print(f"File '{pdf_path}' does not exist. Please check the path and try again.")
        return

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

    # Show categories (optional)
    for section, content in categorized.items():
        print(f"\n--- {section.upper()} ---")
        for line in content:
            print(line)

    json_ready = prepare_json_data(categorized)

    # Demo print JSON string that can be sent to API
    print("\nJSON data ready to send:")
    print(json.dumps(json_ready, indent=2))

if __name__ == "__main__":
    main()
