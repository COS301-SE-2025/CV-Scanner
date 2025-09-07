import os
import re
import spacy
from pdfminer.high_level import extract_text as extract_pdf_text
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import tempfile
import docx
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize spaCy with the English model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model 'en_core_web_sm' not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

# Initialize AI models for summarization
try:
    # Use a lightweight summarization model
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=0 if torch.cuda.is_available() else -1)
    logger.info("Summarization model loaded successfully")
except Exception as e:
    logger.warning(f"Could not load summarization model: {e}")
    summarizer = None

app = FastAPI()

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF files"""
    return extract_pdf_text(pdf_path)

def extract_text_from_docx(docx_path):
    """Extract text from Word DOCX files"""
    doc = docx.Document(docx_path)
    return "\n".join([paragraph.text for paragraph in doc.paragraphs])

def extract_text(file_path):
    """Extract text from supported file types (PDF or DOCX)"""
    if file_path.lower().endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.lower().endswith('.docx'):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")

def extract_personal_info(text):
    """Extract personal information using improved AI and pattern matching"""
    if not nlp:
        logger.warning("spaCy model not available, using basic extraction")
        return extract_personal_info_basic(text)
    
    # Extract email/phone using regex
    email = re.search(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", text, re.I)
    phone = re.search(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}", text)
    
    # AI-powered name extraction with better context understanding
    name = extract_name_with_context(text)
    
    return {
        "name": name,
        "email": email.group(0) if email else None,
        "phone": phone.group(0) if phone else None
    }

def extract_personal_info_basic(text):
    """Fallback method for personal info extraction without spaCy"""
    email = re.search(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", text, re.I)
    phone = re.search(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}", text)
    
    # Basic name extraction from first few lines
    lines = text.split('\n')[:5]
    name = None
    for line in lines:
        line = line.strip()
        # Look for lines that look like names (2-4 words, proper case)
        if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+( [A-Z][a-z]+)?( [A-Z][a-z]+)?$', line):
            name = line
            break
    
    return {
        "name": name,
        "email": email.group(0) if email else None,
        "phone": phone.group(0) if phone else None
    }

def extract_name_with_context(text):
    """Extract name using advanced NLP with context analysis"""
    doc = nlp(text[:2000])  # Analyze first 2000 characters
    
    # Enhanced blacklist
    blacklist = {
        "css frameworks", "c++", "nosql database", "api", "http", "rest", "aws",
        "docker", "kubernetes", "machine learning", "ai", "tensorflow", "pytorch",
        "git", "linux", "javascript", "typescript", "react", "nodejs", "database",
        "backend", "frontend", "full stack", "devops", "agile", "scrum", "software",
        "engineering", "development", "programming", "coding", "computer science",
        "bachelor", "master", "degree", "university", "college", "school"
    }
    
    candidates = []
    
    # Method 1: Named entities
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            candidate_text = ent.text.lower()
            
            # Skip blacklisted terms
            if any(term in candidate_text for term in blacklist):
                continue
                
            # Require multi-word names
            if ' ' not in ent.text:
                continue
                
            # Skip tech acronyms
            if re.search(r'\b[A-Z]{2,}\b', ent.text):
                continue
                
            # Calculate position-based score
            score = 2.0 - (ent.start_char / 1000)  # Higher score for earlier appearance
            
            # Context analysis
            context = text[max(0, ent.start_char-150):ent.end_char+150].lower()
            if any(keyword in context for keyword in ["resume", "cv", "curriculum vitae"]):
                score += 1.0
            if any(keyword in context for keyword in ["contact", "personal", "about"]):
                score += 0.5
            
            candidates.append((ent.text, score))
    
    # Method 2: First line analysis (often contains name)
    first_lines = text.split('\n')[:3]
    for line in first_lines:
        line = line.strip()
        if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+( [A-Z][a-z]+)?( [A-Z][a-z]+)?$', line):
            # Check if it's not a title or section header
            if not any(keyword in line.lower() for keyword in ["curriculum", "resume", "cv", "contact", "about"]):
                candidates.append((line, 3.0))  # High score for first line names
    
    # Select best candidate
    if candidates:
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_candidate = candidates[0][0]
        
        # Final validation
        if len(best_candidate.split()) >= 2 and len(best_candidate) < 50:
            return best_candidate
    
    return None

def extract_sections(text):
    """Improved section extraction with better boundary detection and AI summarization"""
    # Clean text for better pattern matching
    text_clean = re.sub(r'\s+', ' ', text)
    
    section_headers = {
        "education": r"(?i)\b(education|academic\s+background|qualifications|academics|educational\s+background|degrees?)\b",
        "experience": r"(?i)\b(experience|work\s+history|employment|professional\s+background|work\s+experience|career|professional\s+experience|employment\s+history)\b",
        "skills": r"(?i)\b(skills|technical\s+skills|competencies|proficiencies|technologies|expertise|abilities|programming\s+languages)\b",
        "projects": r"(?i)\b(projects|personal\s+projects|key\s+projects|project\s+experience|portfolio|notable\s+projects)\b",
        "certificates": r"(?i)\b(certificates?|certifications?|licenses?|awards?|achievements?|honors?)\b"
    }
    
    # Find section boundaries more accurately
    sections = {}
    lines = text.split('\n')
    current_section = None
    current_content = []
    
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean:
            continue
            
        # Check if this line is a section header
        found_section = None
        for section_name, pattern in section_headers.items():
            if re.search(pattern, line_clean) and len(line_clean) < 100:
                # Additional validation - should not be in middle of sentence
                if not re.search(r'[.,:;]\s*$', line_clean):
                    found_section = section_name
                    break
        
        if found_section:
            # Save previous section
            if current_section and current_content:
                content = '\n'.join(current_content).strip()
                if content:
                    sections[current_section] = clean_section_content(content, current_section)
            
            # Start new section
            current_section = found_section
            current_content = []
        elif current_section:
            # Add content to current section
            current_content.append(line_clean)
    
    # Save last section
    if current_section and current_content:
        content = '\n'.join(current_content).strip()
        if content:
            sections[current_section] = clean_section_content(content, current_section)
    
    return sections

def clean_section_content(content, section_type):
    """Clean and process section content"""
    # Remove excessive whitespace
    content = re.sub(r'\s+', ' ', content)
    
    # Remove common CV formatting artifacts
    content = re.sub(r'[-•▪▫]+\s*', '• ', content)  # Normalize bullets
    content = re.sub(r'\|\s*', ', ', content)       # Replace pipes with commas
    
    # Section-specific cleaning
    if section_type == "skills":
        # For skills, keep it concise
        return content[:300] + "..." if len(content) > 300 else content
    elif section_type in ["experience", "projects"]:
        # For experience/projects, use AI summarization if available and content is long
        if summarizer and len(content) > 400:
            try:
                summary = summarizer(
                    content,
                    max_length=200,
                    min_length=50,
                    do_sample=False,
                    truncation=True
                )
                return summary[0]['summary_text']
            except Exception as e:
                logger.warning(f"Summarization failed: {e}")
                return content[:400] + "..."
        return content
    else:
        return content

def summarize_section(content, section_type):
    """Use AI to summarize section content intelligently"""
    if not summarizer:
        return content[:500] + "..." if len(content) > 500 else content
    
    try:
        # Adjust max length based on section type
        max_lengths = {
            "experience": 200,
            "education": 150,
            "projects": 250,
            "skills": 100,
            "certificates": 100
        }
        
        max_length = max_lengths.get(section_type, 150)
        min_length = min(50, max_length // 3)
        
        # Split long content into chunks if needed
        if len(content) > 1000:
            # For very long content, extract key sentences first
            sentences = content.split('.')
            # Keep first few and last few sentences, plus any with key terms
            key_sentences = sentences[:3] + sentences[-2:]
            
            # Add sentences with important keywords
            important_keywords = {
                "experience": ["worked", "developed", "managed", "led", "created", "implemented", "years"],
                "education": ["degree", "university", "graduated", "bachelor", "master", "phd"],
                "projects": ["project", "built", "developed", "created", "designed"],
                "skills": ["proficient", "experienced", "expert", "advanced", "familiar"],
                "certificates": ["certified", "licensed", "awarded", "completed"]
            }
            
            keywords = important_keywords.get(section_type, [])
            for sentence in sentences[3:-2]:
                if any(keyword in sentence.lower() for keyword in keywords):
                    key_sentences.append(sentence)
            
            content = '. '.join(key_sentences[:10])  # Limit to 10 sentences
        
        # Tokenize and check length
        inputs = summarizer.tokenizer(content, return_tensors="pt", truncation=True, max_length=1024)
        
        if len(inputs['input_ids'][0]) < 50:  # Too short to summarize
            return content
        
        summary = summarizer(
            content, 
            max_length=max_length, 
            min_length=min_length, 
            do_sample=False,
            truncation=True
        )
        
        return summary[0]['summary_text']
        
    except Exception as e:
        logger.warning(f"Summarization failed for {section_type}: {e}")
        # Fallback to truncation
        return content[:500] + "..." if len(content) > 500 else content

def extract_skills(text):
    """Focused skills extraction using predefined technology lists and careful filtering"""
    # Get skills section if available
    sections = extract_sections(text)
    skills_section = sections.get("skills", "")
    
    # Use skills section primarily, but also scan full text for known technologies
    search_text = skills_section if len(skills_section) > 30 else text
    
    skills = set()
    
    # Method 1: Known technology patterns (most reliable)
    skills.update(extract_known_technologies(text))
    
    # Method 2: Skills from structured lists in skills section
    if skills_section:
        skills.update(extract_from_skills_section(skills_section))
    
    # Method 3: Programming languages with careful validation
    skills.update(extract_programming_languages(text))
    
    # Clean and validate all extracted skills
    cleaned_skills = []
    for skill in skills:
        cleaned = clean_skill_text(skill)
        if is_legitimate_skill(cleaned):
            cleaned_skills.append(cleaned)
    
    return sorted(list(set(cleaned_skills)))

def extract_known_technologies(text):
    """Extract well-known technologies using precise patterns"""
    skills = set()
    
    # Define comprehensive but precise technology lists
    technologies = {
        # Programming Languages (case-insensitive but exact matches)
        'languages': [
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'csharp', 'c',
            'php', 'ruby', 'go', 'rust', 'kotlin', 'swift', 'scala', 'r', 'matlab',
            'perl', 'lua', 'dart', 'objective-c', 'visual basic', 'fortran', 'cobol'
        ],
        
        # Web Technologies
        'web': [
            'html', 'css', 'react', 'angular', 'vue', 'vue.js', 'node.js', 'nodejs',
            'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'asp.net',
            'jquery', 'bootstrap', 'tailwind', 'sass', 'less', 'webpack', 'babel'
        ],
        
        # Databases
        'databases': [
            'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'oracle',
            'sql server', 'sqlite', 'dynamodb', 'elasticsearch', 'neo4j', 'couchdb'
        ],
        
        # Cloud & DevOps
        'cloud': [
            'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform',
            'jenkins', 'git', 'github', 'gitlab', 'bitbucket', 'ci/cd', 'ansible'
        ],
        
        # Data Science & AI
        'data_ai': [
            'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'matplotlib',
            'seaborn', 'jupyter', 'anaconda', 'spark', 'hadoop', 'tableau', 'power bi'
        ],
        
        # Mobile Development
        'mobile': [
            'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic'
        ]
    }
    
    # Create combined pattern for all technologies
    all_techs = []
    for category in technologies.values():
        all_techs.extend(category)
    
    # Create regex pattern that matches whole words
    for tech in all_techs:
        # Escape special regex characters and create word boundary pattern
        escaped_tech = re.escape(tech)
        pattern = rf'\b{escaped_tech}\b'
        
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            # Validate context - shouldn't be part of email, URL, or sentence
            context_start = max(0, match.start() - 20)
            context_end = min(len(text), match.end() + 20)
            context = text[context_start:context_end]
            
            # Skip if it's part of an email or URL
            if '@' in context or 'http' in context.lower():
                continue
                
            skills.add(tech.lower())
    
    return skills

def extract_from_skills_section(skills_text):
    """Extract skills specifically from the skills section using structure"""
    skills = set()
    
    # Split by common separators
    separators = [',', ';', '|', '\n', '•', '-', '*']
    items = [skills_text]
    
    for sep in separators:
        new_items = []
        for item in items:
            new_items.extend(item.split(sep))
        items = new_items
    
    for item in items:
        item = item.strip()
        if item and 2 <= len(item) <= 30:  # Reasonable skill length
            # Remove common prefixes/suffixes
            item = re.sub(r'^(programming\s+)?(languages?:?\s*)', '', item, flags=re.I)
            item = re.sub(r'^(technologies?:?\s*)', '', item, flags=re.I)
            item = item.strip()
            
            if item and not contains_personal_info(item):
                skills.add(item.lower())
    
    return skills

def extract_programming_languages(text):
    """Extract programming languages with additional context validation"""
    languages = set()
    
    # Look for explicit programming language mentions
    patterns = [
        r'programming\s+languages?:?\s*([^.]+)',
        r'languages?:?\s*([^.]+)',
        r'proficient\s+in:?\s*([^.]+)',
        r'experienced\s+with:?\s*([^.]+)'
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.I)
        for match in matches:
            lang_text = match.group(1)
            # Split by common separators and validate
            for lang in re.split(r'[,;|]', lang_text):
                lang = lang.strip()
                if is_programming_language(lang):
                    languages.add(lang.lower())
    
    return languages

def is_programming_language(text):
    """Check if text is likely a programming language"""
    known_languages = {
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'c',
        'php', 'ruby', 'go', 'rust', 'kotlin', 'swift', 'scala', 'r',
        'matlab', 'perl', 'lua', 'dart', 'html', 'css', 'sql'
    }
    
    return text.lower() in known_languages

def contains_personal_info(text):
    """Check if text contains personal information that shouldn't be a skill"""
    personal_indicators = [
        r'\d{3}[-\s]?\d{3}[-\s]?\d{4}',  # Phone numbers
        r'@',  # Email addresses
        r'\b\d{1,4}\s+\w+\s+street\b',  # Addresses
        r'\b(street|avenue|road|drive|lane)\b',  # Street names
        r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\b',  # Months
        r'\b\d{4}\b.*\b\d{4}\b'  # Date ranges
    ]
    
    for pattern in personal_indicators:
        if re.search(pattern, text, re.I):
            return True
    return False

def clean_skill_text(skill):
    """Clean individual skill text"""
    # Remove common prefixes and suffixes
    skill = re.sub(r'^(the\s+|a\s+|an\s+)', '', skill, flags=re.I)
    skill = re.sub(r'(ing|ed|er|ly)$', '', skill)  # Remove common suffixes
    skill = re.sub(r'[^\w\s\-\+\.#]', '', skill)  # Remove special characters
    skill = skill.strip()
    
    # Normalize common variations
    normalizations = {
        'js': 'javascript',
        'ts': 'typescript',
        'nodejs': 'node.js',
        'reactjs': 'react',
        'c++': 'cpp',
        'c#': 'csharp'
    }
    
    return normalizations.get(skill.lower(), skill.lower())

def is_legitimate_skill(skill):
    """Final validation to ensure extracted text is a legitimate skill"""
    if not skill or len(skill) < 2 or len(skill) > 25:
        return False
    
    # Skip common non-skill words
    non_skills = {
        'and', 'or', 'with', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'as',
        'this', 'that', 'these', 'those', 'my', 'me', 'i', 'you', 'he', 'she', 'it',
        'we', 'they', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'contact', 'phone', 'email', 'address', 'street', 'city', 'state', 'country',
        'university', 'college', 'school', 'student', 'bachelor', 'master', 'degree',
        'years', 'year', 'month', 'day', 'time', 'work', 'job', 'position', 'role'
    }
    
    if skill.lower() in non_skills:
        return False
    
    # Skip if contains numbers (except for C++ style languages)
    if re.search(r'\d', skill) and not re.search(r'(c\+\+|c#|\.net|2\.0|3\.0)', skill, re.I):
        return False
    
    # Skip if it's obviously personal information
    if contains_personal_info(skill):
        return False
    
    # Must contain at least one letter
    if not re.search(r'[a-zA-Z]', skill):
        return False
    
    return True

def parse_resume(file_path):
    """Main function to parse resume/CV with improved AI analysis"""
    try:
        text = extract_text(file_path)
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
        
        logger.info(f"Extracted text length: {len(text)} characters")
        
        # Extract basic information
        personal_info = extract_personal_info(text)
        sections = extract_sections(text)
        skills = extract_skills(text)
        
        # Generate summaries for longer sections
        summarized_sections = {}
        for section_name, content in sections.items():
            if content and len(content) > 300 and summarizer:
                try:
                    summary = summarizer(
                        content,
                        max_length=150,
                        min_length=30,
                        do_sample=False,
                        truncation=True
                    )
                    summarized_sections[section_name] = summary[0]['summary_text']
                except Exception as e:
                    logger.warning(f"Summarization failed for {section_name}: {e}")
                    summarized_sections[section_name] = content[:200] + "..."
            else:
                summarized_sections[section_name] = content
        
        # Generate overall summary
        summary = generate_cv_summary(text, personal_info, summarized_sections, skills)
        
        return {
            "personal_info": personal_info,
            "sections": summarized_sections,
            "skills": skills,
            "summary": summary,
            "analysis": analyze_cv_quality(text, personal_info, summarized_sections, skills)
        }
        
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise

def generate_cv_summary(text, personal_info, sections, skills):
    """Generate an overall CV summary using AI"""
    try:
        # Create a summary prompt based on available information
        summary_parts = []
        
        if personal_info.get('name'):
            summary_parts.append(f"Professional profile for {personal_info['name']}")
        else:
            summary_parts.append("Professional CV profile")
        
        # Add experience information
        if sections.get('experience'):
            summary_parts.append("with relevant work experience")
        
        # Add education information  
        if sections.get('education'):
            summary_parts.append("and educational background")
        
        # Add skills count
        if skills:
            summary_parts.append(f"skilled in {len(skills)} technologies")
        
        # Combine sections for AI summarization
        combined_text = ""
        for section_name, content in sections.items():
            if content:
                combined_text += f"{section_name.title()}: {content} "
        
        if summarizer and len(combined_text) > 100:
            try:
                summary = summarizer(
                    combined_text[:1000],  # Limit input length
                    max_length=100,
                    min_length=20,
                    do_sample=False,
                    truncation=True
                )
                return summary[0]['summary_text']
            except Exception as e:
                logger.warning(f"AI summarization failed: {e}")
        
        # Fallback to basic summary
        return ". ".join(summary_parts) + "."
        
    except Exception as e:
        logger.warning(f"Error generating summary: {e}")
        return "Professional CV profile available for review."

def analyze_cv_quality(text, personal_info, sections, skills):
    """Analyze CV quality and provide recommendations"""
    analysis = {
        "completeness_score": 0,
        "recommendations": [],
        "strengths": [],
        "missing_sections": []
    }
    
    # Check completeness
    score = 0
    
    if personal_info.get('name'):
        score += 20
        analysis["strengths"].append("Name clearly identified")
    else:
        analysis["recommendations"].append("Add a clear name at the top of the CV")
    
    if personal_info.get('email'):
        score += 15
        analysis["strengths"].append("Contact email provided")
    else:
        analysis["recommendations"].append("Include a professional email address")
    
    if personal_info.get('phone'):
        score += 10
        analysis["strengths"].append("Phone number provided")
    
    if sections.get('experience'):
        score += 25
        analysis["strengths"].append("Work experience section present")
    else:
        analysis["missing_sections"].append("experience")
        analysis["recommendations"].append("Add detailed work experience section")
    
    if sections.get('education'):
        score += 15
        analysis["strengths"].append("Education section present")
    else:
        analysis["missing_sections"].append("education")
    
    if len(skills) > 5:
        score += 15
        analysis["strengths"].append(f"Good variety of skills ({len(skills)} identified)")
    else:
        analysis["recommendations"].append("Include more technical skills and competencies")
    
    analysis["completeness_score"] = min(score, 100)
    
    return analysis

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """Endpoint to upload and process resume files (PDF or DOCX)"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.docx']:
        raise HTTPException(status_code=400, detail="File must be PDF or DOCX format")
    
    try:
        # Create temp file with the correct extension
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
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
        if 'temp' in locals() and os.path.exists(temp.name):
            os.unlink(temp.name)
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/")
async def root():
    return {"message": "CV Processing API is running - supports PDF and DOCX files"}

if __name__ == "__main__":
    uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)