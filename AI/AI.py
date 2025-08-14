import os
import re
import spacy
from pdfminer.high_level import extract_text
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import tempfile

# Initialize spaCy with the English model
nlp = spacy.load("en_core_web_sm")

app = FastAPI()

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF files"""
    return extract_text(pdf_path)

def extract_personal_info(text):
    """Extract personal information using regex patterns"""
    email = re.search(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", text, re.I)
    phone = re.search(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}", text)
    
    # Improved name extraction - looks for title-case names at the start
    name_match = re.search(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
    name = name_match.group(0) if name_match else None
    
    # Fallback to spaCy if regex fails
    if not name:
        doc = nlp(text[:500])  # Only check first 500 characters
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
    """Improved section extraction using header patterns and content boundaries"""
    section_headers = {
        "education": r"(education|academic background|degrees|qualifications|academics)",
        "experience": r"(experience|work history|employment|professional background|work experience)",
        "skills": r"(skills|technical skills|competencies|proficiencies|technologies)",
        "projects": r"(projects|personal projects|key projects|project experience)",
        "certificates": r"(certificates|certifications|licenses|awards)"
    }
    
    # Find all section headers with their positions
    section_positions = []
    for section, pattern in section_headers.items():
        for match in re.finditer(pattern, text, re.IGNORECASE):
            section_positions.append((match.start(), section, match.group()))
    
    # Sort by position
    section_positions.sort(key=lambda x: x[0])
    
    sections = {}
    for i, (start_idx, section, header) in enumerate(section_positions):
        # Find end of section (start of next section or end of document)
        end_idx = section_positions[i+1][0] if i+1 < len(section_positions) else len(text)
        
        # Extract content (skip the header itself)
        content_start = start_idx + len(header)
        section_content = text[content_start:end_idx].strip()
        
        # Clean up section content
        section_content = re.sub(r'\s+', ' ', section_content)
        sections[section] = section_content
    
    return sections

def extract_skills(text):
    """Improved skills extraction using NLP patterns"""
    # First try to get skills from skills section
    skills_section = extract_sections(text).get("skills", "")
    
    # If skills section is too short, search entire document
    search_text = skills_section if len(skills_section) > 50 else text
    
    # Use spaCy for noun chunk extraction
    doc = nlp(search_text)
    
    # Collect skills using multiple methods
    skills = set()
    
    # Method 1: Noun chunks that look like skills
    for chunk in doc.noun_chunks:
        if len(chunk.text) < 30:  # Filter out long phrases
            # Filter out obvious non-skills
            if not re.search(r'\b(and|or|with|my|the|a|an)\b', chunk.text, re.I):
                skills.add(chunk.text.strip())
    
    # Method 2: Entities labeled as ORG, PRODUCT, or TECHNOLOGY
    for ent in doc.ents:
        if ent.label_ in ["ORG", "PRODUCT"] and len(ent.text) < 25:
            skills.add(ent.text)
    
    # Method 3: Common tech keywords
    tech_keywords = r'\b(python|java|c\+\+|javascript|sql|react|node\.?js|django|flask|aws|docker|kubernetes|machine learning|ai|tensorflow|pytorch|git|linux|html|css)\b'
    for match in re.finditer(tech_keywords, text, re.IGNORECASE):
        skills.add(match.group(0).lower())
    
    # Method 4: Bullet point lists (common in skills sections)
    bullet_points = re.findall(r'\n\s*[\-•]\s*([^\n]+)', search_text)
    for point in bullet_points:
        # Split comma-separated skills
        for skill in re.split(r',|;', point):
            clean_skill = skill.strip()
            if clean_skill and len(clean_skill) < 30:
                skills.add(clean_skill)
    
    return sorted(skills)

def parse_resume(input_path, is_pdf=True):
    """Main function to parse resume/CV"""
    text = extract_text_from_pdf(input_path) if is_pdf else input_path
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
    
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

@app.get("/")
async def root():
    return {"message": "CV Processing API is running"}

if __name__ == "__main__":
    uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)