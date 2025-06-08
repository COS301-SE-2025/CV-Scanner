from tika import parser
import tempfile
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
    json_data = {}
    for section, content in categories.items():
        json_data[section] = "\n".join(content).strip()
    return json_data

def process_pdf_file(pdf_path):
    try:
        parsed = parser.from_file(pdf_path)
        cv_text = parsed.get('content', '')
        if not cv_text:
            print(f"No content extracted from {pdf_path}")
            return None
    except Exception as e:
        print(f"Failed to parse PDF: {e}")
        return None

    categorized = categorize_cv(cv_text)
    return prepare_json_data(categorized)

def process_pdf_bytes(pdf_bytes: bytes):
    # Create a temporary file, write bytes to it, parse, then delete
    with tempfile.NamedTemporaryFile(delete=True, suffix=".pdf") as tmp_file:
        tmp_file.write(pdf_bytes)
        tmp_file.flush()  # ensure all bytes written
        # parse from this temp file
        result = process_pdf_file(tmp_file.name)
    return result

# Example main that simulates receiving a PDF file as bytes
def main():
    # Simulate loading a PDF file as bytes
    pdf_path = "CV(1).pdf"
    if not os.path.isfile(pdf_path):
        print(f"File '{pdf_path}' not found. Please add it.")
        return

    with open(pdf_path, "rb") as f:
        pdf_data = f.read()

    extracted_json = process_pdf_bytes(pdf_data)
    if extracted_json:
        print(json.dumps(extracted_json, indent=2))

if __name__ == "__main__":
    main()
