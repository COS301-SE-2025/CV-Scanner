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