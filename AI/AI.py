import os
import re
import spacy
from pdfminer.high_level import extract_text
from fastapi import FastAPI
import uvicorn

app = FastAPI()

def extract_text_from_pdf(pdf_path):
	return extract_text(pdf_path)


nlp = spacy.load("en_core_web_sm")

def extract_personal_info(text):
	email = re.search(r"[a-z0-9\.-+_]+@[a-z0-9\.-+_]+\.[a-z]+", text, re.I)
	phone = re.search(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}", text)
	name_match = re.search(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
	name = name_match.group(0) if name_match else None
	if not name:
		doc = nlp(text[:500])
		for ent in doc.ents:
			if ent.label_ == "PERSON":
				name = ent.text
				break
	return {
		"name": name,
		"email": email.group(0) if email else None,
		"phone": phone.group(0) if phone else None
	}

if __name__ == "__main__":
	uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)
