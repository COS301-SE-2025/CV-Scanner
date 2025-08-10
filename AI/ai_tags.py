from transformers import pipeline
import pdfplumber

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

categories = {
    "skills": [],
    "education": [],
    "experience": [],
    "other": []
}

def add_category(name: str):
    """Add a new category dynamically."""
    if name.lower() not in categories:
        categories[name.lower()] = []

def add_tag_to_category(category: str, tag: str):
    """Add a tag to a category dynamically."""
    cat = category.lower()
    if cat not in categories:
        add_category(cat)
    if tag.lower() not in categories[cat]:
        categories[cat].append(tag.lower())

def classify_text(text: str):
    """Classify a single text snippet and rank it by probabilities for each category."""
    candidate_labels = list(categories.keys())
    result = classifier(text, candidate_labels=candidate_labels)

    scored = list(zip(result["labels"], result["scores"]))
    scored.sort(key=lambda x: x[1], reverse=True)

    return {
        "text": text,
        "top_category": scored[0][0],
        "probabilities": {label: float(score) for label, score in scored}
    }

def rank_tags(texts: list):
    """
    Takes a list of text snippets (e.g. from CV sections),
    classifies them, and assigns probabilities for each category.
    """
    ranked_results = []

    for text in texts:
        if not text.strip():
            continue
        classification = classify_text(text)
        ranked_results.append(classification)

        if classification["probabilities"][classification["top_category"]] > 0.6:
            add_tag_to_category(classification["top_category"], text)

    return ranked_results

def get_graph_data():
    """Prepare graph-friendly data showing tag counts per category."""
    return {category: len(tags) for category, tags in categories.items()}

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

if __name__ == "__main__":
    sample_texts = [
        "Proficient in Python, JavaScript, and SQL.",
        "Bachelor of Science in Computer Science.",
        "Worked 3 years as a backend developer at Google.",
        "Excellent leadership and teamwork skills."
    ]

    results = rank_tags(sample_texts)
    print("Ranked Results:", results)
    print("Categories:", categories)
    print("Graph Data:", get_graph_data())

    # Example usage of PDF text extraction:
    pdf_text = extract_text_from_pdf("AI/CV.pdf")
    print (pdf_text)
    # Now pass pdf_text to your classification functions