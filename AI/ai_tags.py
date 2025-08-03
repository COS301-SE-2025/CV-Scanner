from transformers import pipeline

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
    scored.sort(key=lambda x: x[1], reverse=True)  # Sort by probability

    return {
        "text": text,
        "top_category": scored[0][0],
        "probabilities": {label: float(score) for label, score in scored}
    }