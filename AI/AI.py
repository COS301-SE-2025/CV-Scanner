# Added imports for AI 
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import json
from transformers import pipeline
import re
import spacy
import os
os.environ['TIKA_SERVER_JAR'] = '/tmp/tika-server.jar'
from tika import parser

# Load models at startup (not inside functions)
nlp = spacy.load("en_core_web_sm")
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added labels
labels = ["profile", "education", "skills", "languages", "projects", "achievements", "contact", "experience"]

def categorize_cv_nlp(text: str):
    categories = {label: [] for label in labels}
    categories["other"] = []
 
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    # Track section headers to improve context
    current_section = None
    section_keywords = {
        'profile': ['profile', 'summary', 'objective', 'about me', 'personal statement'],
        'education': ['education', 'academic', 'qualification', 'degree', 'university', 'college', 'school'],
        'skills': ['skills', 'technical skills', 'tech skills', 'soft skills', 'competencies', 'technologies'],
        'experience': ['experience', 'work experience', 'employment', 'career', 'work history'],
        'projects': ['projects', 'portfolio', 'work samples'],
        'achievements': ['achievements', 'awards', 'certifications', 'accomplishments', 'honors'],
        'contact': ['contact', 'contact information', 'personal details'],
        'languages': ['languages', 'language skills', 'linguistic']
    }

    # First pass: identify section headers
    for i, line in enumerate(lines):
        line_lower = line.lower().strip()
        
        # Check if this line is a section header
        for section, keywords in section_keywords.items():
            if any(keyword in line_lower for keyword in keywords) and len(line.split()) <= 4:
                current_section = section
                break
    
    # Second pass: categorize content
    current_section = None
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        line_lower = line.lower()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
            
        # Check if this line is a section header
        section_found = False
        for section, keywords in section_keywords.items():
            if any(keyword in line_lower for keyword in keywords) and len(line.split()) <= 4:
                current_section = section
                section_found = True
                break
        
        if section_found:
            i += 1
            continue
            
        # If we have a current section context, use it
        if current_section:
            categories[current_section].append(line)
        else:
            # Fallback to keyword-based categorization with more specific rules
            categorized = False
            
            # Contact information (very specific patterns)
            if (re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', line) or
                re.search(r'(?:\+27|0)?\s*\d{2,3}\s*\d{3}\s*\d{4}', line) or
                'github.com' in line_lower or 'linkedin.com' in line_lower or
                line_lower.startswith(('phone:', 'email:', 'address:', 'tel:', 'mobile:'))):
                categories['contact'].append(line)
                categorized = True
                
            # Education (specific educational terms)
            elif any(word in line_lower for word in ['bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate', 'university of', 'college of', 'graduated', 'gpa', 'cgpa', 'faculty']):
                categories['education'].append(line)
                categorized = True
                
            # Technical skills (programming languages and technologies)
            elif any(tech in line_lower for tech in ['python', 'java', 'javascript', 'html', 'css', 'sql', 'mysql', 'nosql', 'c++', 'php', 'nodejs', 'react', 'angular', 'vue', 'django', 'flask']):
                categories['skills'].append(line)
                categorized = True
                
            # Projects (specific project indicators)
            elif any(word in line_lower for word in ['developed', 'implemented', 'built', 'created', 'designed', 'programmed']) and any(word in line_lower for word in ['application', 'website', 'system', 'database', 'project', 'simulation']):
                categories['projects'].append(line)
                categorized = True
                
            # Experience (work-related terms)
            elif any(word in line_lower for word in ['intern', 'internship', 'employed', 'worked at', 'position', 'role', 'job', 'company']) or re.search(r'\d{4}\s*-\s*\d{4}', line):
                categories['experience'].append(line)
                categorized = True
                
            # Languages (specific language names)
            elif any(lang in line_lower for lang in ['english', 'afrikaans', 'spanish', 'french', 'german', 'mandarin', 'arabic', 'portuguese', 'italian', 'russian', 'japanese']):
                categories['languages'].append(line)
                categorized = True
                
            # Achievements (certification and award terms)
            elif any(word in line_lower for word in ['certified', 'certification', 'award', 'honor', 'recognition', 'completed', 'achieved', 'distinction']):
                categories['achievements'].append(line)
                categorized = True
                
            # Profile/Summary (descriptive personal statements)
            elif any(word in line_lower for word in ['passionate', 'experienced', 'skilled', 'dedicated', 'motivated', 'enthusiastic']) and len(line.split()) > 8:
                categories['profile'].append(line)
                categorized = True
            
            # If still not categorized, try AI classification with higher threshold
            if not categorized:
                try:
                    result = classifier(line, candidate_labels=labels)
                    top_label = result['labels'][0]
                    confidence = result['scores'][0]
                    if confidence >= 0.5:  # Higher threshold for better accuracy
                        categories[top_label].append(line)
                    else:
                        categories["other"].append(line)
                except Exception as e:
                    print(f"Error processing line: {line}, Error: {str(e)}")
                    categories["other"].append(line)
        
        i += 1

    # Post-processing: clean up categories
    categories = clean_categories(categories)
    return categories

def clean_categories(categories):
    """Clean up categorized content by removing duplicates and misplaced items"""
    
    # Remove obvious header lines that got mixed in
    for category in categories:
        categories[category] = [
            line for line in categories[category] 
            if not (len(line.split()) <= 2 and line.upper() == line and 
                   line.upper() in ['PROFILE', 'EDUCATION', 'SKILLS', 'PROJECTS', 'CONTACT', 'EXPERIENCE', 'LANGUAGES', 'ACHIEVEMENTS'])
        ]
    
    # Move obvious contact info from other categories to contact
    contact_patterns = [
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        r'(?:\+27|0)?\s*\d{2,3}\s*\d{3}\s*\d{4}',
        r'github\.com',
        r'linkedin\.com'
    ]
    
    for category in categories:
        if category != 'contact':
            lines_to_move = []
            for line in categories[category]:
                if any(re.search(pattern, line, re.IGNORECASE) for pattern in contact_patterns):
                    lines_to_move.append(line)
            
            for line in lines_to_move:
                categories[category].remove(line)
                if line not in categories['contact']:
                    categories['contact'].append(line)
    
    # Remove very short lines that are likely noise (except in contact)
    for category in categories:
        if category not in ['contact', 'languages']:
            categories[category] = [
                line for line in categories[category] 
                if len(line.split()) >= 3 or category == 'skills'
            ]
    
    return categories

def extract_contact_info(text: str):
    doc = nlp(text)

    # Better email regex
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    
    # Better phone regex for various formats
    phones = re.findall(r'(?:\+27|0)?\s*\d{2,3}\s*\d{3}\s*\d{4}', text)
    
    # URLs and GitHub links
    urls = re.findall(r'(?:https?://|github\.com/|www\.)[^\s]+', text)
    
    # Extract name from the CV (usually one of the first few lines with all caps or title case)
    lines = text.strip().splitlines()
    name = None
    
    # Look for name patterns in first 10 lines
    for line in lines[:10]:
        line_clean = line.strip()
        # Check for all caps names or title case names
        if (line_clean.isupper() and len(line_clean.split()) <= 4 and len(line_clean) > 5 and 
            not any(keyword in line_clean.lower() for keyword in ['cv', 'resume', 'contact', 'phone', 'email', 'student', 'computer', 'science'])):
            name = line_clean.title()  # Convert to title case
            break
        # Also try spaCy NER for person names
        doc_line = nlp(line_clean)
        for ent in doc_line.ents:
            if ent.label_ == "PERSON" and len(ent.text.split()) <= 3:
                name = ent.text
                break
        if name:
            break

    return {
        "name": name or "",
        "emails": list(set(emails)),
        "phones": list(set(phones)),
        "urls": list(set(urls))
    }

def prepare_json_data(categories: dict):
    json_data = {}
    for section, content in categories.items():
        # Remove empty entries and join with newlines
        filtered_content = [line for line in content if line.strip()]
        json_data[section] = "\n".join(filtered_content).strip()
    return json_data

def process_pdf_file(pdf_path):
    try:
        parsed = parser.from_file(pdf_path)  # Removed timeout argument
        cv_text = parsed.get('content', '')
        if not cv_text:
            return None
    except Exception as e:
        print(f"Error parsing PDF: {str(e)}")
        return None

    categorized = categorize_cv_nlp(cv_text)
    contact_info = extract_contact_info(cv_text)

    # Enhance contact section with extracted info
    contact_lines = []
    if contact_info['name']:
        contact_lines.append(f"Name: {contact_info['name']}")
    
    for email in contact_info['emails']:
        contact_lines.append(f"Email: {email}")
    
    for phone in contact_info['phones']:
        contact_lines.append(f"Phone: {phone}")
    
    for url in contact_info['urls']:
        contact_lines.append(f"Link: {url}")
    
    # Add extracted contact info to existing contact section
    existing_contact = categorized.get("contact", [])
    all_contact = existing_contact + contact_lines
    # Remove duplicates while preserving order
    seen = set()
    unique_contact = []
    for item in all_contact:
        if item not in seen:
            seen.add(item)
            unique_contact.append(item)
    
    categorized["contact"] = unique_contact

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

@app.get("/")
async def root():
    return {"message": "CV Processing API is running"}

@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}, Content-Type: {file.content_type}, Size: {file.size}")
    
    # More flexible content type checking
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must have .pdf extension")
    
    # Validate file size (optional - adjust as needed)
    if hasattr(file, 'size') and file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    try:
        pdf_bytes = await file.read()
        print(f"Read {len(pdf_bytes)} bytes from file")
        
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file received.")
        
        result = process_pdf_bytes(pdf_bytes)
        
        if result is None:
            raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")
        
        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "data": result
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# Add a simpler test endpoint
@app.post("/test_upload/")
async def test_upload(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": file.size if hasattr(file, 'size') else "unknown"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)
