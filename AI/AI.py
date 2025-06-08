from tika import parser

def categorize_cv(text: str):
    """
    Process any CV text, split into lines and prepare for categorization.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return lines

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

    lines = categorize_cv(cv_text)
    print("Extracted lines:", lines)

if __name__ == "__main__":
    main()
