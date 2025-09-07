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
    # Extract email/phone using regex first
    email = re.search(r"[a-z0-9\.\-+_]+@[a-z0-9\.\-+_]+\.[a-z]+", text, re.I)
    phone = re.search(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}", text)
    
    # Try name extraction - use multiple methods for robustness
    name = None
    
    logger.info(f"Starting name extraction, nlp available: {nlp is not None}")
    
    # Method 1: Use our advanced name extraction if spaCy is available
    if nlp:
        try:
            name = extract_name_with_context(text)
            logger.info(f"Advanced name extraction result: {name}")
        except Exception as e:
            logger.warning(f"Advanced name extraction failed: {e}")
    
    # Method 2: Fallback to basic name extraction
    if not name:
        try:
            name = extract_name_basic(text)
            logger.info(f"Basic name extraction result: {name}")
        except Exception as e:
            logger.warning(f"Basic name extraction failed: {e}")
    
    logger.info(f"Final name result: {name}")
    
    return {
        "name": name,
        "email": email.group(0) if email else None,
        "phone": phone.group(0) if phone else None
    }

def extract_name_basic(text):
    """Basic name extraction as fallback"""
    lines = text.split('\n')[:10]  # Check first 10 lines
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Skip empty lines or lines with contact info
        if not line or '@' in line or re.search(r'\d{3}[-\s]?\d{3}[-\s]?\d{4}', line):
            continue
        
        # Check for ALL CAPS names (common in CVs)
        if re.match(r'^[A-Z][A-Z\s]+[A-Z]$', line):
            words = line.split()
            if 2 <= len(words) <= 4 and all(2 <= len(word) <= 15 for word in words):
                # Check it's not a section header
                if not any(keyword in line.lower() for keyword in 
                         ['computer', 'science', 'student', 'profile', 'resume', 'cv', 'education', 'experience']):
                    return line.title()  # Convert to title case
        
        # Check for regular title case names
        if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$', line):
            if not any(keyword in line.lower() for keyword in 
                     ['computer', 'science', 'student', 'profile', 'resume', 'cv']):
                return line
    
    return None

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
    """Extract name using multiple methods with context analysis"""
    candidates = []
    
    # Method 1: Check the very first line (most common for names)
    first_lines = text.split('\n')[:8]  # Check first 8 lines
    for i, line in enumerate(first_lines):
        line = line.strip()
        
        # Skip empty lines or lines with contact info
        if not line or '@' in line or re.search(r'\d{3}[-\s]?\d{3}[-\s]?\d{4}', line):
            continue
            
        # Check for name patterns (including all caps)
        name_patterns = [
            r'^([A-Z][A-Z\s]+[A-Z])$',  # ALL CAPS name like "TALHAH KARODIA"
            r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$',  # First Last or First Middle Last
            r'^([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)$',  # First M. Last
            r'^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s|$)',  # Name at start of line
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, line)
            if match:
                potential_name = match.group(1).strip()
                
                # Additional validation for all-caps names
                if potential_name.isupper():
                    # Convert to title case and validate
                    title_name = potential_name.title()
                    words = title_name.split()
                    
                    # Must be 2-4 words, each reasonable length
                    if 2 <= len(words) <= 4 and all(2 <= len(word) <= 15 for word in words):
                        # Check it's not a common title or section
                        if not any(keyword in title_name.lower() for keyword in 
                                 ["curriculum", "resume", "cv", "contact", "about", "education", 
                                  "experience", "skills", "computer", "science", "student", "profile"]):
                            score = 5.0 - (i * 0.3)  # Very high score for early all-caps names
                            candidates.append((title_name, score))
                            continue
                
                # Validate regular case names
                if not any(keyword in potential_name.lower() for keyword in 
                         ["curriculum", "resume", "cv", "contact", "about", "education", "experience", "skills"]):
                    
                    # Higher score for earlier lines
                    score = 4.0 - (i * 0.5)
                    candidates.append((potential_name, score))
    
    # Method 2: Named entities with spaCy (if available)
    if nlp:
        doc = nlp(text[:2000])  # Analyze first 2000 characters
        
        # Enhanced blacklist
        blacklist = {
            "css frameworks", "c++", "nosql database", "api", "http", "rest", "aws",
            "docker", "kubernetes", "machine learning", "ai", "tensorflow", "pytorch",
            "git", "linux", "javascript", "typescript", "react", "nodejs", "database",
            "backend", "frontend", "full stack", "devops", "agile", "scrum", "software",
            "engineering", "development", "programming", "coding", "computer science",
            "bachelor", "master", "degree", "university", "college", "school", "student",
            "curriculum vitae", "resume", "contact", "phone", "email", "address"
        }
        
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
    
    # Method 3: Look for name after common prefixes
    name_prefix_patterns = [
        r'(?:name|full name|candidate)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
        r'(?:resume of|cv of|profile of)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
    ]
    
    for pattern in name_prefix_patterns:
        matches = re.finditer(pattern, text, re.I)
        for match in matches:
            candidates.append((match.group(1), 3.0))
    
    # Select best candidate
    if candidates:
        # Remove duplicates and sort by score
        unique_candidates = {}
        for name, score in candidates:
            clean_name = name.strip()
            if clean_name in unique_candidates:
                unique_candidates[clean_name] = max(unique_candidates[clean_name], score)
            else:
                unique_candidates[clean_name] = score
        
        sorted_candidates = sorted(unique_candidates.items(), key=lambda x: x[1], reverse=True)
        best_candidate = sorted_candidates[0][0]
        
        # Final validation
        if (len(best_candidate.split()) >= 2 and 
            len(best_candidate) < 50 and 
            not re.search(r'\d', best_candidate)):  # No numbers in names
            return best_candidate
    
    return None

def extract_sections(text):
    """Improved section extraction with multiple detection methods"""
    # Clean text for better pattern matching
    text_clean = re.sub(r'\s+', ' ', text)
    lines = text.split('\n')
    
    # Multiple section header patterns (more flexible)
    section_patterns = {
        "education": [
            r"(?i)\b(education|academic\s+background|qualifications|academics|educational\s+background|degrees?)\b",
            r"(?i)\b(bachelor|master|phd|doctorate|university|college)\b",
            r"(?i)\beducation\b"
        ],
        "experience": [
            r"(?i)\b(experience|work\s+history|employment|professional\s+background|work\s+experience|career|professional\s+experience|employment\s+history)\b",
            r"(?i)\b(worked|employment|professional|career)\b",
            r"(?i)\bexperience\b"
        ],
        "skills": [
            r"(?i)\b(skills|technical\s+skills|competencies|proficiencies|technologies|expertise|abilities|programming\s+languages)\b",
            r"(?i)\b(technical|programming|languages)\b",
            r"(?i)\bskills\b"
        ],
        "projects": [
            r"(?i)\b(projects|personal\s+projects|key\s+projects|project\s+experience|portfolio|notable\s+projects)\b",
            r"(?i)\bprojects?\b"
        ]
    }
    
    sections = {}
    
    # Method 1: Look for explicit section headers
    sections.update(extract_sections_by_headers(lines, section_patterns))
    
    # Method 2: Fallback - extract sections by content analysis
    if not sections or len(sections) < 2:
        sections.update(extract_sections_by_content(text))
    
    return sections

def extract_sections_by_headers(lines, section_patterns):
    """Extract sections by looking for header patterns"""
    sections = {}
    current_section = None
    current_content = []
    
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean:
            continue
            
        # Check if this line is a section header
        found_section = None
        for section_name, patterns in section_patterns.items():
            for pattern in patterns:
                if re.search(pattern, line_clean) and len(line_clean) < 150:
                    # Additional validation - likely a header if short and not part of sentence
                    if not re.search(r'\w+[.,:;]\s+\w+', line_clean):
                        found_section = section_name
                        break
            if found_section:
                break
        
        if found_section:
            # Save previous section
            if current_section and current_content:
                content = '\n'.join(current_content).strip()
                if content and len(content) > 10:
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
        if content and len(content) > 10:
            sections[current_section] = clean_section_content(content, current_section)
    
    return sections

def extract_sections_by_content(text):
    """Fallback method: extract sections by analyzing content patterns"""
    sections = {}
    
    # Look for education indicators
    education_patterns = [
        r'(bachelor|master|phd|doctorate|degree|university|college|school|graduated|studied|diploma|certificate).*?(?=\n|\.|$)',
        r'(b\.?[as]\.?|m\.?[as]\.?|ph\.?d\.?|mba).*?(?=\n|\.|$)',
        r'(19|20)\d{2}[-–](19|20)\d{2}.*?(university|college|school)',
    ]
    
    education_content = []
    for pattern in education_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            education_content.append(match.group(0).strip())
    
    if education_content:
        sections['education'] = '. '.join(education_content[:3])  # Top 3 education items
    
    # Look for experience indicators
    experience_patterns = [
        r'(worked|employed|position|role|job|company|organization|firm|experience).*?(?=\n|\.|$)',
        r'(developed|managed|led|created|implemented|designed|built|responsible).*?(?=\n|\.|$)',
        r'(19|20)\d{2}[-–](19|20)\d{2}.*?(company|organization|firm|corp)',
    ]
    
    experience_content = []
    for pattern in experience_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            content = match.group(0).strip()
            if len(content) > 20:  # Filter out short matches
                experience_content.append(content)
    
    if experience_content:
        sections['experience'] = '. '.join(experience_content[:5])  # Top 5 experience items
    
    # Look for project indicators
    project_patterns = [
        r'(project|built|developed|created|designed).*?(?=\n|\.|$)',
        r'(application|website|system|platform|tool).*?(?=\n|\.|$)',
    ]
    
    project_content = []
    for pattern in project_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            content = match.group(0).strip()
            if len(content) > 30:  # Filter out short matches
                project_content.append(content)
    
    if project_content:
        sections['projects'] = '. '.join(project_content[:3])  # Top 3 project items
    
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
            'perl', 'lua', 'dart', 'objective-c', 'visual basic', 'fortran', 'cobol',
            'assembly', 'bash', 'powershell', 'sql', 'plsql', 'tsql'
        ],
        
        # Web Technologies
        'web': [
            'html', 'css', 'react', 'angular', 'vue', 'vue.js', 'node.js', 'nodejs',
            'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'asp.net',
            'jquery', 'bootstrap', 'tailwind', 'sass', 'less', 'webpack', 'babel',
            'next.js', 'nuxt.js', 'svelte', 'ember', 'backbone', 'redux', 'graphql'
        ],
        
        # Databases
        'databases': [
            'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'oracle',
            'sql server', 'sqlite', 'dynamodb', 'elasticsearch', 'neo4j', 'couchdb',
            'mariadb', 'firebase', 'supabase', 'planetscale', 'cockroachdb'
        ],
        
        # Cloud & DevOps
        'cloud': [
            'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform',
            'jenkins', 'git', 'github', 'gitlab', 'bitbucket', 'ci/cd', 'ansible',
            'puppet', 'chef', 'vagrant', 'helm', 'istio', 'prometheus', 'grafana'
        ],
        
        # Data Science & AI
        'data_ai': [
            'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'matplotlib',
            'seaborn', 'jupyter', 'anaconda', 'spark', 'hadoop', 'tableau', 'power bi',
            'plotly', 'keras', 'opencv', 'nltk', 'spacy', 'huggingface'
        ],
        
        # Mobile Development
        'mobile': [
            'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic',
            'cordova', 'phonegap', 'swift ui', 'kotlin multiplatform'
        ],
        
        # Tools & IDEs
        'tools': [
            'vscode', 'intellij', 'eclipse', 'xcode', 'android studio', 'sublime',
            'vim', 'emacs', 'atom', 'pycharm', 'webstorm', 'postman', 'figma',
            'sketch', 'photoshop', 'illustrator', 'jira', 'confluence', 'slack'
        ],
        
        # Testing & Quality
        'testing': [
            'jest', 'mocha', 'cypress', 'selenium', 'pytest', 'junit', 'testng',
            'cucumber', 'jasmine', 'karma', 'enzyme', 'react testing library'
        ]
    }
    
    # Create combined list for pattern matching
    all_techs = []
    for category in technologies.values():
        all_techs.extend(category)
    
    # Sort by length (longest first) to match longer terms first
    all_techs.sort(key=len, reverse=True)
    
    # Create regex pattern that matches whole words
    for tech in all_techs:
        # Escape special regex characters and create word boundary pattern
        escaped_tech = re.escape(tech).replace(r'\.', r'\.?')  # Make dots optional
        pattern = rf'\b{escaped_tech}\b'
        
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            # Validate context - shouldn't be part of email, URL, or sentence
            context_start = max(0, match.start() - 30)
            context_end = min(len(text), match.end() + 30)
            context = text[context_start:context_end]
            
            # Skip if it's part of an email or URL
            if '@' in context or 'http' in context.lower() or 'www.' in context.lower():
                continue
            
            # Skip if it's part of a file path
            if any(ext in context.lower() for ext in ['.com', '.org', '.net', '.edu', '.gov']):
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
        original_text = text  # Keep original for name extraction
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace for other processing
        
        logger.info(f"Extracted text length: {len(text)} characters")
        logger.info(f"First 100 chars: {repr(text[:100])}")
        
        # Extract basic information using original text for names (preserve line breaks)
        personal_info = extract_personal_info(original_text)
        logger.info(f"Personal info extracted: {personal_info}")
        
        sections = extract_sections(text)
        logger.info(f"Sections extracted: {list(sections.keys())}")
        
        skills = extract_skills(text)
        logger.info(f"Skills extracted: {len(skills)} skills")
        
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
        logger.info(f"Generated summary: {summary[:100]}...")
        
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
    """Generate an intelligent AI-powered CV summary"""
    try:
        # Build a comprehensive summary prompt from all extracted data
        summary_components = []
        
        # Start with candidate identification
        if personal_info.get('name'):
            summary_components.append(f"{personal_info['name']} is a")
        else:
            summary_components.append("This candidate is a")
        
        # Analyze education for professional level
        education_level = "professional"
        if sections.get('education'):
            education_text = sections['education'].lower()
            if 'bachelor' in education_text or 'computer science' in education_text:
                education_level = "computer science graduate"
            elif 'master' in education_text:
                education_level = "master's degree holder"
            elif 'phd' in education_text or 'doctorate' in education_text:
                education_level = "PhD holder"
            elif 'student' in education_text:
                education_level = "computer science student"
        
        # Add skills summary
        if skills:
            skill_categories = categorize_skills(skills)
            skill_summary = create_skill_summary(skill_categories)
            summary_components.append(f"{education_level} with expertise in {skill_summary}")
        else:
            summary_components.append(education_level)
        
        # Add experience insights
        if sections.get('experience'):
            experience_summary = extract_experience_highlights(sections['experience'])
            if experience_summary:
                summary_components.append(f"Experience includes {experience_summary}")
        
        # Add project insights
        if sections.get('projects'):
            project_summary = extract_project_highlights(sections['projects'])
            if project_summary:
                summary_components.append(f"Notable projects involve {project_summary}")
        
        # Combine into a natural summary with proper spacing
        base_summary = ". ".join(summary_components)
        # Fix any double periods
        base_summary = re.sub(r'\.+', '.', base_summary)
        # Ensure it ends with a period
        if not base_summary.endswith('.'):
            base_summary += '.'
        
        # Use AI to refine and enhance the summary if available
        if summarizer and len(base_summary) > 50:
            try:
                # Create a more detailed prompt for the AI
                detailed_prompt = f"""
                Professional Summary: {base_summary}
                
                Technical Skills: {', '.join(skills[:10])}
                
                Background: {sections.get('education', 'Not specified')[:200]}
                
                Experience: {sections.get('experience', 'Not specified')[:200]}
                """
                
                ai_summary = summarizer(
                    detailed_prompt,
                    max_length=80,
                    min_length=30,
                    do_sample=False,
                    truncation=True
                )
                
                # Ensure the AI summary is coherent and professional
                ai_text = ai_summary[0]['summary_text'].strip()
                if len(ai_text) > 20 and not ai_text.startswith('Professional Summary'):
                    return ai_text
                
            except Exception as e:
                logger.warning(f"AI summary generation failed: {e}")
        
        # Fallback to our constructed summary
        return base_summary
        
    except Exception as e:
        logger.warning(f"Error generating summary: {e}")
        return create_fallback_summary(personal_info, skills, sections)

def categorize_skills(skills):
    """Categorize skills into technology areas"""
    categories = {
        'programming_languages': [],
        'web_technologies': [],
        'databases': [],
        'tools_frameworks': [],
        'other': []
    }
    
    # Define skill categories
    programming_langs = {'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'kotlin', 'swift', 'c', 'sql'}
    web_techs = {'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'bootstrap', 'jquery'}
    databases = {'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle'}
    tools = {'git', 'github', 'docker', 'kubernetes', 'aws', 'azure', 'jenkins', 'webpack', 'babel'}
    
    for skill in skills:
        skill_lower = skill.lower()
        if skill_lower in programming_langs:
            categories['programming_languages'].append(skill)
        elif skill_lower in web_techs:
            categories['web_technologies'].append(skill)
        elif skill_lower in databases:
            categories['databases'].append(skill)
        elif skill_lower in tools:
            categories['tools_frameworks'].append(skill)
        else:
            categories['other'].append(skill)
    
    return categories

def create_skill_summary(skill_categories):
    """Create a natural language summary of skills"""
    summary_parts = []
    
    if skill_categories['programming_languages']:
        langs = skill_categories['programming_languages'][:3]  # Top 3
        summary_parts.append(f"programming languages including {', '.join(langs)}")
    
    if skill_categories['web_technologies']:
        web = skill_categories['web_technologies'][:3]
        summary_parts.append(f"web technologies such as {', '.join(web)}")
    
    if skill_categories['databases']:
        dbs = skill_categories['databases'][:2]
        summary_parts.append(f"database systems like {', '.join(dbs)}")
    
    if skill_categories['tools_frameworks']:
        tools = skill_categories['tools_frameworks'][:2]
        summary_parts.append(f"development tools including {', '.join(tools)}")
    
    if not summary_parts and skill_categories['other']:
        # Fallback if no categorized skills
        other_skills = skill_categories['other'][:5]
        summary_parts.append(f"various technologies including {', '.join(other_skills)}")
    
    if len(summary_parts) > 1:
        return ', '.join(summary_parts[:-1]) + f", and {summary_parts[-1]}"
    elif summary_parts:
        return summary_parts[0]
    else:
        return "multiple technical areas"

def extract_experience_highlights(experience_text):
    """Extract key highlights from experience section"""
    if not experience_text or len(experience_text) < 20:
        return None
    
    # Look for key action verbs and achievements
    highlights = []
    
    # Extract sentences with key action verbs
    action_verbs = ['developed', 'created', 'implemented', 'designed', 'built', 'managed', 'led', 'worked']
    sentences = experience_text.split('.')
    
    for sentence in sentences:
        sentence = sentence.strip()
        if any(verb in sentence.lower() for verb in action_verbs) and len(sentence) > 20:
            # Clean up the sentence
            clean_sentence = sentence[:100] + '...' if len(sentence) > 100 else sentence
            highlights.append(clean_sentence.lower())
    
    # Extract key technologies mentioned in experience
    tech_mentions = []
    common_techs = ['web application', 'full-stack', 'ai algorithms', 'software engineering', 'database', 'api']
    
    for tech in common_techs:
        if tech in experience_text.lower():
            tech_mentions.append(tech)
    
    if highlights:
        return highlights[0]  # Return the first meaningful highlight
    elif tech_mentions:
        return f"work with {', '.join(tech_mentions[:3])}"
    else:
        return "software development and technical projects"

def extract_project_highlights(projects_text):
    """Extract key highlights from projects section"""
    if not projects_text or len(projects_text) < 20:
        return None
    
    # Look for project types and technologies
    project_keywords = ['simulation', 'web application', 'application', 'system', 'platform', 'tool']
    tech_keywords = ['city environment', 'streaming service', 'resource management', 'efficiency', 'simplicity']
    
    found_projects = []
    found_techs = []
    
    projects_lower = projects_text.lower()
    
    for keyword in project_keywords:
        if keyword in projects_lower:
            found_projects.append(keyword)
    
    for keyword in tech_keywords:
        if keyword in projects_lower:
            found_techs.append(keyword)
    
    if found_projects and found_techs:
        return f"{found_projects[0]} development with focus on {found_techs[0]}"
    elif found_projects:
        return f"{found_projects[0]} development"
    elif found_techs:
        return f"projects focusing on {found_techs[0]}"
    else:
        return "software development projects"

def create_fallback_summary(personal_info, skills, sections):
    """Create a basic fallback summary"""
    summary_parts = []
    
    if personal_info.get('name'):
        summary_parts.append(f"{personal_info['name']} is a software professional")
    else:
        summary_parts.append("Software professional")
    
    if skills:
        if len(skills) >= 5:
            summary_parts.append(f"with expertise in {len(skills)} technologies including {', '.join(skills[:3])}")
        else:
            summary_parts.append(f"skilled in {', '.join(skills[:3])}")
    
    if sections.get('education'):
        summary_parts.append("with relevant educational background")
    
    if sections.get('experience'):
        summary_parts.append("and practical work experience")
    
    return ". ".join(summary_parts) + "."

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
    # Only start server if not in testing mode
    if not os.environ.get('TESTING'):
        uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)