from transformers import pipeline
import pdfplumber
import re
import matplotlib.pyplot as plt

# Expanded categories for CV parsing
categories = {
    "skills": [],
    "soft skills": [],
    "education": [],
    "experience": [],
    "achievements": [],
    "other": []
}

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# Common CV keywords for heuristic boosts
EDU_KEYWORDS = ["bachelor", "master", "phd", "degree", "university", "school", "diploma", "certificate", "faculty"]
SOFT_SKILL_KEYWORDS = ["teamwork", "communication", "leadership", "critical thinking", "time management", "problem solving"]
ACHIEVEMENT_KEYWORDS = ["certification", "award", "honors", "completed", "achievement"]

def split_into_chunks(text):
    """
    Split text into short chunks by line breaks, bullets, or punctuation.
    """
    # First split by line breaks and bullet-like markers
    raw_parts = re.split(r'[\n•\-–]', text)
    chunks = []
    for part in raw_parts:
        # Then split further by sentence-ending punctuation
        sentences = re.split(r'(?<=[.!?])\s+', part)
        for s in sentences:
            s = s.strip()
            if s:
                chunks.append(s)
    return chunks

def add_category(name: str):
    if name.lower() not in categories:
        categories[name.lower()] = []

def add_tag_to_category(category: str, tag: str):
    cat = category.lower()
    if cat not in categories:
        add_category(cat)
    if tag.lower() not in categories[cat]:
        categories[cat].append(tag.strip())

def apply_heuristics(text, top_category, probs):
    """
    Apply keyword-based boosts to help the AI classify better.
    """
    text_lower = text.lower()

    if any(k in text_lower for k in EDU_KEYWORDS):
        return "education"
    if any(k in text_lower for k in SOFT_SKILL_KEYWORDS):
        return "soft skills"
    if any(k in text_lower for k in ACHIEVEMENT_KEYWORDS):
        return "achievements"

    return top_category

def classify_text(text: str):
    candidate_labels = list(categories.keys())
    result = classifier(text, candidate_labels=candidate_labels)

    scored = list(zip(result["labels"], result["scores"]))
    scored.sort(key=lambda x: x[1], reverse=True)

    top_category = apply_heuristics(text, scored[0][0], dict(scored))

    return {
        "text": text,
        "top_category": top_category,
        "probabilities": {label: float(score) for label, score in scored}
    }

def rank_tags(texts: list, threshold: float = 0.6):
    ranked_results = []
    for text in texts:
        if not text.strip():
            continue

        classification = classify_text(text)
        ranked_results.append(classification)

        # Add tag to ALL categories with probability >= threshold
        for category, score in classification["probabilities"].items():
            if score >= threshold:
                add_tag_to_category(category, text)

    return ranked_results


def get_graph_data():
    return {category: len(tags) for category, tags in categories.items()}

def prepare_graph_data():
    graph_data = get_graph_data()
    labels = list(graph_data.keys())
    values = list(graph_data.values())
    return labels, values

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def plot_graph_bar():
    labels, values = prepare_graph_data()
    plt.figure(figsize=(8, 5))
    plt.bar(labels, values, color='skyblue')
    plt.xlabel('Category')
    plt.ylabel('Count')
    plt.title('CV Tag Distribution - Bar Chart')
    plt.tight_layout()
    plt.show()

def plot_graph_pie():
    labels, values = prepare_graph_data()
    plt.figure(figsize=(6, 6))
    plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=140, colors=plt.cm.Paired.colors)
    plt.title('CV Tag Distribution - Pie Chart')
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    pdf_text = extract_text_from_pdf("AI/CV.pdf")
    pdf_chunks = split_into_chunks(pdf_text)
    results = rank_tags(pdf_chunks)
    print("Ranked Results:", results)
    print("Categories:", categories)
    print("Graph Data:", get_graph_data())
    # Show bar chart
    plot_graph_bar()
    # Show pie chart
    plot_graph_pie()
