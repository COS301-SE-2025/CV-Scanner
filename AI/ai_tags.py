from transformers import pipeline
import pdfplumber
import re
import matplotlib.pyplot as plt
from nltk.corpus import stopwords
import nltk
nltk.download('stopwords')

STOPWORDS = set(stopwords.words("english"))

# Faster zero-shot model (change to bart-large-mnli if you want full accuracy)
classifier = pipeline(
    "zero-shot-classification",
    model="valhalla/distilbart-mnli-12-1"  # much faster on CPU
)

# Expanded categories
categories = {
    "skills": [],
    "soft skills": [],
    "education": [],
    "experience": [],
    "achievements": [],
    "other": []
}

EDU_KEYWORDS = ["bachelor", "master", "phd", "degree", "university", "school", "diploma", "certificate", "faculty"]
SOFT_SKILL_KEYWORDS = ["teamwork", "communication", "leadership", "critical thinking", "time management", "problem solving"]
ACHIEVEMENT_KEYWORDS = ["certification", "award", "honors", "completed", "achievement"]

def split_into_chunks(text):
    raw_parts = re.split(r'[\n•\-–]', text)
    chunks = []
    for part in raw_parts:
        sentences = re.split(r'(?<=[.!?])\s+', part)
        for s in sentences:
            s = s.strip()
            if s:
                chunks.append(s)
    return chunks

def apply_heuristics(text, top_category):
    text_lower = text.lower()
    if any(k in text_lower for k in EDU_KEYWORDS):
        return "education"
    if any(k in text_lower for k in SOFT_SKILL_KEYWORDS):
        return "soft skills"
    if any(k in text_lower for k in ACHIEVEMENT_KEYWORDS):
        return "achievements"
    return top_category

def clean_and_extract_keywords(text):
    words = re.findall(r"[A-Za-z0-9\+#]+(?:\s+[A-Za-z0-9\+#]+)*", text)
    keywords = []
    for word in words:
        w = word.strip()
        if w and w.lower() not in STOPWORDS:
            keywords.append(w)
    return keywords

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def process_cv_chunks(chunks, threshold=0.6):
    tags = set()
    keywords = set()

    candidate_labels = list(categories.keys())

    for chunk in chunks:
        if not chunk.strip():
            continue
        if len(chunk.strip()) <= 2:  # skip too short
            continue

        result = classifier(chunk, candidate_labels=candidate_labels)
        scored = list(zip(result["labels"], result["scores"]))
        scored.sort(key=lambda x: x[1], reverse=True)

        top_category = apply_heuristics(chunk, scored[0][0])
        categories[top_category].append(chunk)

        # Save tags & keywords if strong enough
        if any(score >= threshold for score in result["scores"]):
            tags.add(chunk.strip())
            for kw in clean_and_extract_keywords(chunk):
                keywords.add(kw)

    return sorted(tags), sorted(keywords)

def plot_graph_bar():
    labels = list(categories.keys())
    values = [len(v) for v in categories.values()]
    plt.figure(figsize=(8, 5))
    plt.bar(labels, values, color='skyblue')
    plt.xlabel('Category')
    plt.ylabel('Count')
    plt.title('CV Tag Distribution - Bar Chart')
    plt.tight_layout()
    plt.show()

def plot_graph_pie():
    labels = list(categories.keys())
    values = [len(v) for v in categories.values()]
    plt.figure(figsize=(6, 6))
    plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=140, colors=plt.cm.Paired.colors)
    plt.title('CV Tag Distribution - Pie Chart')
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    pdf_text = extract_text_from_pdf("AI/CV.pdf")
    pdf_chunks = split_into_chunks(pdf_text)

    final_tags, final_keywords = process_cv_chunks(pdf_chunks, threshold=0.6)

    print("Final Tags:", final_tags)
    print("Categories:", categories)
    print("Searchable Keywords:", final_keywords)

    plot_graph_bar()
    plot_graph_pie()
