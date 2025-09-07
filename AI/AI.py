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
    section_headers = {
        "education": r"(education|academic background|degrees|qualifications|academics|educational background)",
        "experience": r"(experience|work history|employment|professional background|work experience|career|professional experience)",
        "skills": r"(skills|technical skills|competencies|proficiencies|technologies|expertise|abilities)",
        "projects": r"(projects|personal projects|key projects|project experience|portfolio|notable projects)",
        "certificates": r"(certificates|certifications|licenses|awards|achievements|honors)"
    }
    
    # Find all section headers with their positions
    section_positions = []
    for section, pattern in section_headers.items():
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Check if this is actually a section header (not just a word in text)
            line_start = text.rfind('\n', 0, match.start()) + 1
            line_end = text.find('\n', match.end())
            if line_end == -1:
                line_end = len(text)
            
            line = text[line_start:line_end].strip()
            
            # Section headers are usually short and don't have too much other text
            if len(line) < 100 and not re.search(r'[.,:;]', line[:match.start() - line_start]):
                section_positions.append((match.start(), section, match.group(), line_start))
    
    # Sort by position
    section_positions.sort(key=lambda x: x[0])
    
    sections = {}
    for i, (start_idx, section, header, line_start) in enumerate(section_positions):
        # Find end of section (start of next section or end of document)
        if i + 1 < len(section_positions):
            end_idx = section_positions[i + 1][3]  # Start of next section's line
        else:
            end_idx = len(text)
        
        # Extract content (skip the header line)
        header_line_end = text.find('\n', start_idx)
        if header_line_end == -1:
            continue
            
        content_start = header_line_end + 1
        section_content = text[content_start:end_idx].strip()
        
        # Clean up section content
        section_content = re.sub(r'\s+', ' ', section_content)
        section_content = re.sub(r'\n+', '\n', section_content)
        
        # AI-powered summarization for long sections
        if summarizer and len(section_content) > 200:
            section_content = summarize_section(section_content, section)
        
        sections[section] = section_content
    
    return sections

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
    """Advanced skills extraction using multiple AI techniques"""
    # Get skills section if available
    sections = extract_sections(text)
    skills_section = sections.get("skills", "")
    
    # Use skills section primarily, but fall back to full text if needed
    search_text = skills_section if len(skills_section) > 50 else text
    
    skills = set()
    
    # Method 1: NLP-based extraction with spaCy
    if nlp:
        skills.update(extract_skills_with_nlp(search_text))
    
    # Method 2: Pattern-based extraction
    skills.update(extract_skills_with_patterns(search_text))
    
    # Method 3: Structured data extraction (bullet points, lists)
    skills.update(extract_skills_from_structure(search_text))
    
    # Clean and filter skills
    cleaned_skills = clean_and_filter_skills(skills)
    
    return sorted(cleaned_skills)

def extract_skills_with_nlp(text):
    """Extract skills using advanced NLP techniques"""
    if not nlp:
        return set()
    
    doc = nlp(text)
    skills = set()
    
    # Extract from noun chunks
    for chunk in doc.noun_chunks:
        chunk_text = chunk.text.strip()
        if is_valid_skill(chunk_text):
            skills.add(chunk_text.lower())
    
    # Extract from named entities (technologies, organizations, products)
    for ent in doc.ents:
        if ent.label_ in ["ORG", "PRODUCT", "TECH"] and is_valid_skill(ent.text):
            skills.add(ent.text.lower())
    
    return skills

def extract_skills_with_patterns(text):
    """Extract skills using regex patterns for common technologies"""
    skills = set()
    
    # Comprehensive technology patterns
    tech_patterns = {
        # Programming languages
        r'\b(python|java|javascript|typescript|c\+\+|c#|php|ruby|go|rust|kotlin|swift|scala|r|matlab)\b',
        # Web technologies
        r'\b(html|css|react|angular|vue|node\.?js|express|django|flask|spring|laravel|rails)\b',
        # Databases
        r'\b(mysql|postgresql|mongodb|redis|cassandra|oracle|sql\s+server|sqlite|dynamodb)\b',
        # Cloud & DevOps
        r'\b(aws|azure|gcp|docker|kubernetes|terraform|jenkins|git|github|gitlab|ci/cd)\b',
        # Frameworks & Libraries
        r'\b(tensorflow|pytorch|scikit-learn|pandas|numpy|bootstrap|jquery|webpack|babel)\b',
        # Tools & Technologies
        r'\b(machine learning|artificial intelligence|data science|blockchain|microservices)\b'
    }
    
    for pattern in tech_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            skill = match.group(0).lower()
            if is_valid_skill(skill):
                skills.add(skill)
    
    return skills

def extract_skills_from_structure(text):
    """Extract skills from structured lists and bullet points"""
    skills = set()
    
    # Bullet points and dashes
    bullet_patterns = [
        r'\n\s*[\-•▪▫]\s*([^\n]+)',
        r'\n\s*\*\s*([^\n]+)',
        r'\n\s*\d+\.\s*([^\n]+)'
    ]
    
    for pattern in bullet_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            items = re.split(r'[,;|]', match.group(1))
            for item in items:
                skill = item.strip()
                if is_valid_skill(skill):
                    skills.add(skill.lower())
    
    # Comma-separated lists (common in skills sections)
    lines = text.split('\n')
    for line in lines:
        if len(line.split(',')) > 2:  # Likely a comma-separated list
            items = [item.strip() for item in line.split(',')]
            for item in items:
                if is_valid_skill(item):
                    skills.add(item.lower())
    
    return skills

def is_valid_skill(skill_text):
    """Validate if extracted text is likely a skill"""
    skill = skill_text.strip()
    
    # Basic validation
    if not skill or len(skill) < 2 or len(skill) > 40:
        return False
    
    # Skip common non-skill words
    skip_words = {
        'and', 'or', 'with', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'as',
        'my', 'me', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these',
        'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
        'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
        'can', 'very', 'really', 'quite', 'rather', 'fairly', 'pretty', 'much', 'many'
    }
    
    if skill.lower() in skip_words:
        return False
    
    # Skip if contains too many common words
    words = skill.lower().split()
    if len(words) > 1 and sum(1 for word in words if word in skip_words) > len(words) / 2:
        return False
    
    # Skip sentences (skills shouldn't be full sentences)
    if skill.count(' ') > 4 or '.' in skill:
        return False
    
    return True

def clean_and_filter_skills(skills):
    """Clean and filter the extracted skills list"""
    cleaned = set()
    
    for skill in skills:
        # Clean the skill text
        skill = re.sub(r'[^\w\s\-\+\.#]', '', skill)  # Remove special chars except common ones
        skill = skill.strip()
        
        if not skill:
            continue
        
        # Normalize common variations
        skill = normalize_skill_name(skill)
        
        # Final validation
        if is_valid_skill(skill):
            cleaned.add(skill)
    
    return cleaned

def normalize_skill_name(skill):
    """Normalize skill names to standard forms"""
    normalizations = {
        'js': 'javascript',
        'ts': 'typescript', 
        'nodejs': 'node.js',
        'reactjs': 'react',
        'angularjs': 'angular',
        'vuejs': 'vue',
        'c++': 'cpp',
        'c#': 'csharp',
        'artificial intelligence': 'ai',
        'machine learning': 'ml'
    }
    
    skill_lower = skill.lower()
    return normalizations.get(skill_lower, skill_lower)

def parse_resume(file_path):
    """Main function to parse resume/CV with comprehensive AI analysis"""
    try:
        text = extract_text(file_path)
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
        
        logger.info(f"Extracted text length: {len(text)} characters")
        
        # Extract basic information
        personal_info = extract_personal_info(text)
        sections = extract_sections(text)
        skills = extract_skills(text)
        
        # Enhance sections with AI analysis
        enhanced_sections = enhance_sections_with_ai(sections, text)
        
        # Generate overall summary
        summary = generate_cv_summary(text, personal_info, enhanced_sections, skills)
        
        return {
            "personal_info": personal_info,
            "sections": enhanced_sections,
            "skills": skills,
            "summary": summary,
            "analysis": analyze_cv_quality(text, personal_info, enhanced_sections, skills)
        }
        
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        raise

def enhance_sections_with_ai(sections, full_text):
    """Enhance extracted sections with AI analysis and better formatting"""
    enhanced = {}
    
    for section_name, content in sections.items():
        if not content.strip():
            enhanced[section_name] = "No information found in this section."
            continue
            
        try:
            if section_name == "experience":
                enhanced[section_name] = enhance_experience_section(content)
            elif section_name == "education":
                enhanced[section_name] = enhance_education_section(content)
            elif section_name == "projects":
                enhanced[section_name] = enhance_projects_section(content)
            elif section_name == "skills":
                enhanced[section_name] = enhance_skills_section(content)
            else:
                enhanced[section_name] = content
                
        except Exception as e:
            logger.warning(f"Error enhancing {section_name} section: {e}")
            enhanced[section_name] = content
    
    return enhanced

def enhance_experience_section(content):
    """Enhance work experience section with AI analysis"""
    if len(content) < 50:
        return content
    
    try:
        # Extract key information using patterns
        experience_items = []
        
        # Look for common patterns in experience descriptions
        patterns = [
            r'(\d{4}[-–]\d{4}|\d{4}[-–]present|\w+\s+\d{4}[-–]\w+\s+\d{4})',  # Date ranges
            r'(developed|created|managed|led|implemented|designed|built|worked)',  # Action verbs
            r'(company|organization|firm|corporation|inc\.|ltd\.|llc)',  # Company indicators
        ]
        
        # If we have summarizer, use it for better formatting
        if summarizer and len(content) > 200:
            summary = summarizer(
                f"Professional experience: {content}",
                max_length=200,
                min_length=50,
                do_sample=False
            )
            return summary[0]['summary_text']
        else:
            # Basic enhancement - extract key sentences
            sentences = content.split('.')
            key_sentences = []
            
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 20:
                    # Prioritize sentences with action verbs or dates
                    if re.search(r'\b(developed|created|managed|led|implemented|designed|built|worked|responsible|achieved)\b', sentence, re.I):
                        key_sentences.append(sentence)
                    elif re.search(r'\d{4}', sentence):  # Contains year
                        key_sentences.append(sentence)
            
            return '. '.join(key_sentences[:5]) + '.' if key_sentences else content
            
    except Exception as e:
        logger.warning(f"Error enhancing experience section: {e}")
        return content

def enhance_education_section(content):
    """Enhance education section with structured information"""
    if len(content) < 30:
        return content
    
    try:
        # Extract key educational information
        education_info = []
        
        # Look for degree patterns
        degree_patterns = [
            r'\b(bachelor|master|phd|doctorate|diploma|certificate|degree)\b.*?\b(in|of)\s+([^,\n]+)',
            r'\b(b\.?[as]\.?|m\.?[as]\.?|ph\.?d\.?|mba)\b.*?([^,\n]+)',
        ]
        
        for pattern in degree_patterns:
            matches = re.finditer(pattern, content, re.I)
            for match in matches:
                education_info.append(match.group(0))
        
        # Look for institutions
        institution_patterns = [
            r'\b(university|college|institute|school)\s+of\s+([^,\n]+)',
            r'\b([^,\n]*university|[^,\n]*college|[^,\n]*institute)\b',
        ]
        
        institutions = []
        for pattern in institution_patterns:
            matches = re.finditer(pattern, content, re.I)
            for match in matches:
                institutions.append(match.group(0))
        
        if education_info or institutions:
            enhanced = []
            if education_info:
                enhanced.extend(education_info[:3])  # Top 3 degrees
            if institutions:
                enhanced.extend(institutions[:2])   # Top 2 institutions
            return '. '.join(enhanced) + '.'
        
        return content
        
    except Exception as e:
        logger.warning(f"Error enhancing education section: {e}")
        return content

def enhance_projects_section(content):
    """Enhance projects section with key project information"""
    if len(content) < 50:
        return content
    
    try:
        # Extract project descriptions and technologies
        projects = []
        
        # Split by common project separators
        project_chunks = re.split(r'\n\s*[-•]\s*|\n\s*\d+\.\s*', content)
        
        for chunk in project_chunks[:5]:  # Limit to 5 projects
            chunk = chunk.strip()
            if len(chunk) > 30:
                # Extract key information from each project
                tech_matches = re.findall(r'\b(python|java|react|node\.js|javascript|html|css|sql|mongodb|aws|docker|git)\b', chunk, re.I)
                
                if tech_matches:
                    projects.append(f"Project using {', '.join(set(tech_matches))}: {chunk[:100]}...")
                else:
                    projects.append(chunk[:150] + "..." if len(chunk) > 150 else chunk)
        
        return '\n• '.join(projects) if projects else content
        
    except Exception as e:
        logger.warning(f"Error enhancing projects section: {e}")
        return content

def enhance_skills_section(content):
    """Enhance skills section with categorization"""
    # This is already handled by extract_skills function
    return content

def generate_cv_summary(text, personal_info, sections, skills):
    """Generate an overall CV summary using AI"""
    try:
        # Create a summary prompt
        experience_years = estimate_experience_years(text)
        skill_count = len(skills)
        
        summary_parts = []
        
        if personal_info.get('name'):
            summary_parts.append(f"Candidate: {personal_info['name']}")
        
        if experience_years:
            summary_parts.append(f"Approximately {experience_years} years of experience")
        
        if skill_count > 0:
            summary_parts.append(f"Proficient in {skill_count} technologies/skills")
        
        # Add key highlights from sections
        if sections.get('experience'):
            exp_text = sections['experience'][:200]
            summary_parts.append(f"Experience highlights: {exp_text}")
        
        summary_text = '. '.join(summary_parts)
        
        if summarizer and len(summary_text) > 100:
            summary = summarizer(
                summary_text,
                max_length=100,
                min_length=30,
                do_sample=False
            )
            return summary[0]['summary_text']
        
        return summary_text
        
    except Exception as e:
        logger.warning(f"Error generating summary: {e}")
        return "CV summary could not be generated."

def estimate_experience_years(text):
    """Estimate years of experience from CV text"""
    try:
        # Look for explicit experience mentions
        exp_patterns = [
            r'(\d+)\s*\+?\s*years?\s+(?:of\s+)?experience',
            r'experience[:\s]+(\d+)\s*\+?\s*years?',
            r'(\d+)\s*years?\s+in\s+',
        ]
        
        for pattern in exp_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                return int(match.group(1))
        
        # Estimate from date ranges in experience section
        current_year = 2025
        dates = re.findall(r'\b(19|20)\d{2}\b', text)
        
        if len(dates) >= 2:
            years = [int(date) for date in dates if 1990 <= int(date) <= current_year]
            if years:
                return max(years) - min(years)
        
        return None
        
    except:
        return None

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