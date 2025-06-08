from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from tika import parser
import tempfile
import json
import os
from transformers import pipeline

app = FastAPI()

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")


labels = ["profile", "education", "skills", "languages", "projects", "achievements", "contact", "experience"]



def categorize_cv_nlp(text: str):
    categories = {label: [] for label in labels}
    categories["other"] = []

 
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    for line in lines:
        try:
            result = classifier(line, candidate_labels=labels)
            top_label = result['labels'][0]
            confidence = result['scores'][0]
            if confidence >= 0.5:
                categories[top_label].append(line)
            else:
                categories["other"].append(line)
        except Exception:
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
            return None
    except Exception as e:
        return None

    categorized = categorize_cv_nlp(cv_text)
    return prepare_json_data(categorized)


def process_pdf_bytes(pdf_bytes: bytes):
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    try:
        tmp_file.write(pdf_bytes)
        tmp_file.close()
        result = process_pdf_file(tmp_file.name)
    finally:
        os.unlink(tmp_file.name)

    return result

@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type, only PDFs allowed.")

    pdf_bytes = await file.read()
    result = process_pdf_bytes(pdf_bytes)

    if result is None:
        raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")

    return JSONResponse(content=result)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
