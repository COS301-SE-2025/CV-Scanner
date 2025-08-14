from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi import File, UploadFile
import tempfile
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

def extract_sections(text):
	section_headers = {
		"education": r"(education|academic background|degrees|qualifications|academics)",
		"experience": r"(experience|work history|employment|professional background|work experience)",
		"skills": r"(skills|technical skills|competencies|proficiencies|technologies)",
		"projects": r"(projects|personal projects|key projects|project experience)",
		"certificates": r"(certificates|certifications|licenses|awards)"
	}
	section_positions = []
	for section, pattern in section_headers.items():
		for match in re.finditer(pattern, text, re.IGNORECASE):
			section_positions.append((match.start(), section, match.group()))
	section_positions.sort(key=lambda x: x[0])
	sections = {}
	for i, (start_idx, section, header) in enumerate(section_positions):
		end_idx = section_positions[i+1][0] if i+1 < len(section_positions) else len(text)
		content_start = start_idx + len(header)
		section_content = text[content_start:end_idx].strip()
		section_content = re.sub(r'\s+', ' ', section_content)
		sections[section] = section_content
	return sections

def extract_skills(text):
	skills_section = extract_sections(text).get("skills", "")
	search_text = skills_section if len(skills_section) > 50 else text
	doc = nlp(search_text)
	skills = set()
	for chunk in doc.noun_chunks:
		if len(chunk.text) < 30:
			if not re.search(r'\b(and|or|with|my|the|a|an)\b', chunk.text, re.I):
				skills.add(chunk.text.strip())
	for ent in doc.ents:
		if ent.label_ in ["ORG", "PRODUCT"] and len(ent.text) < 25:
			skills.add(ent.text)
	tech_keywords = r'\b(python|java|c\+\+|javascript|sql|react|node\.?js|django|flask|aws|docker|kubernetes|machine learning|ai|tensorflow|pytorch|git|linux|html|css)\b'
	for match in re.finditer(tech_keywords, text, re.IGNORECASE):
		skills.add(match.group(0).lower())
	bullet_points = re.findall(r'\n\s*[\-•]\s*([^\n]+)', search_text)
	for point in bullet_points:
		for skill in re.split(r',|;', point):
			clean_skill = skill.strip()
			if clean_skill and len(clean_skill) < 30:
				skills.add(clean_skill)
	return sorted(skills)

def parse_resume(input_path, is_pdf=True):
	text = extract_text_from_pdf(input_path) if is_pdf else input_path
	text = re.sub(r'\s+', ' ', text).strip()
	return {
		"personal_info": extract_personal_info(text),
		"sections": extract_sections(text),
		"skills": extract_skills(text)
	}

@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
	if not file.filename or not file.filename.lower().endswith('.pdf'):
		raise HTTPException(status_code=400, detail="File must have .pdf extension")
	try:
		temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
		content = await file.read()
		temp.write(content)
		temp.close()
		result = parse_resume(temp.name)
		os.unlink(temp.name)
		return JSONResponse(content={
			"status": "success",
			"filename": file.filename,
			"data": result
		})
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

if __name__ == "__main__":
	uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)
