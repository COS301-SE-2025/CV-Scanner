from transformers import pipeline
import pdfplumber
import re
import matplotlib.pyplot as plt
from nltk.corpus import stopwords
import nltk
nltk.download('stopwords')

STOPWORDS = set(stopwords.words("english"))

# Define searchable keywords by category
PROGRAMMING_LANGUAGES = {
    'python', 'java', 'javascript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 
    'kotlin', 'typescript', 'scala', 'perl', 'r', 'matlab', 'c', 'objective-c'
}

FRAMEWORKS_LIBRARIES = {
    'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask', 'spring', 
    'laravel', 'rails', 'bootstrap', 'jquery', 'tensorflow', 'pytorch', 'keras'
}

DATABASES = {
    'mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'redis', 'elasticsearch',
    'cassandra', 'dynamodb', 'firestore', 'sql', 'nosql'
}

CLOUD_TOOLS = {
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github', 
    'gitlab', 'bitbucket', 'terraform', 'ansible'
}

WEB_TECHNOLOGIES = {
    'html', 'css', 'sass', 'scss', 'rest', 'api', 'graphql', 'json', 'xml', 'ajax'
}

SOFT_SKILLS = {
    'leadership', 'teamwork', 'communication', 'problem-solving', 'analytical', 
    'creative', 'management', 'agile', 'scrum', 'planning', 'organization'
}

ROLES = {
    'developer', 'engineer', 'programmer', 'analyst', 'manager', 'designer', 
    'architect', 'consultant', 'intern', 'senior', 'junior', 'lead', 'full-stack',
    'frontend', 'backend', 'devops', 'data-scientist', 'machine-learning'
}

# Combine all searchable terms
ALL_SEARCHABLE_TERMS = (PROGRAMMING_LANGUAGES | FRAMEWORKS_LIBRARIES | DATABASES | 
                       CLOUD_TOOLS | WEB_TECHNOLOGIES | SOFT_SKILLS | ROLES)

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def extract_searchable_keywords(text):
    """Extract only searchable keywords that would be useful for CV matching"""
    
    # Convert to lowercase for matching
    text_lower = text.lower()
    
    # Remove extra whitespace and normalize
    text_lower = ' '.join(text_lower.split())
    
    found_keywords = set()
    
    # Direct matching with predefined terms
    for term in ALL_SEARCHABLE_TERMS:
        # Handle multi-word terms (like "machine-learning", "problem-solving")
        search_term = term.replace('-', '[- ]')  # Match both "machine-learning" and "machine learning"
        pattern = r'\b' + search_term + r'\b'
        
        if re.search(pattern, text_lower):
            found_keywords.add(term)
    
    # Special patterns for common variations
    special_patterns = {
        r'\bc\+\+\b': 'c++',
        r'\bc#\b': 'c#',
        r'\bnode\.?js\b': 'nodejs',
        r'\bmachine learning\b': 'machine-learning',
        r'\bproblem solving\b': 'problem-solving',
        r'\bfull stack\b': 'full-stack',
        r'\bfront[- ]?end\b': 'frontend',
        r'\bback[- ]?end\b': 'backend',
        r'\bdev[- ]?ops\b': 'devops',
        r'\bdata scientist?\b': 'data-scientist',
        r'\bsql server\b': 'sql',
        r'\bmicrosoft sql\b': 'sql',
        r'\bmongo\b': 'mongodb',
        r'\bpostgres\b': 'postgresql',
    }
    
    for pattern, keyword in special_patterns.items():
        if re.search(pattern, text_lower):
            found_keywords.add(keyword)
    
    # Extract additional technical terms that might not be in our predefined list
    # Look for capitalized technical terms
    tech_pattern = r'\b[A-Z][a-zA-Z]*(?:\.[a-zA-Z]+)*\b'
    potential_tech = re.findall(tech_pattern, text)
    
    for term in potential_tech:
        term_lower = term.lower()
        # Only add if it looks like a technology and isn't a common word
        if (len(term) >= 3 and 
            term_lower not in STOPWORDS and
            term_lower not in {'education', 'experience', 'skills', 'projects', 'achievements'} and
            any(char.isupper() for char in term)):  # Has at least one uppercase
            found_keywords.add(term_lower)
    
    # Look for version numbers with technologies (e.g., "Python 3.9", "Java 8")
    version_pattern = r'\b(python|java|node|php|mysql)\s*\d+(?:\.\d+)*\b'
    version_matches = re.findall(version_pattern, text_lower)
    for match in version_matches:
        found_keywords.add(match)
    
    return sorted(list(found_keywords))

def categorize_keywords(keywords):
    """Categorize keywords for better organization"""
    categorized = {
        'Programming Languages': [],
        'Frameworks & Libraries': [],
        'Databases': [],
        'Cloud & Tools': [],
        'Web Technologies': [],
        'Soft Skills': [],
        'Roles & Positions': [],
        'Other Technical': []
    }
    
    for keyword in keywords:
        if keyword in PROGRAMMING_LANGUAGES:
            categorized['Programming Languages'].append(keyword)
        elif keyword in FRAMEWORKS_LIBRARIES:
            categorized['Frameworks & Libraries'].append(keyword)
        elif keyword in DATABASES:
            categorized['Databases'].append(keyword)
        elif keyword in CLOUD_TOOLS:
            categorized['Cloud & Tools'].append(keyword)
        elif keyword in WEB_TECHNOLOGIES:
            categorized['Web Technologies'].append(keyword)
        elif keyword in SOFT_SKILLS:
            categorized['Soft Skills'].append(keyword)
        elif keyword in ROLES:
            categorized['Roles & Positions'].append(keyword)
        else:
            categorized['Other Technical'].append(keyword)
    
    return categorized

def plot_keyword_distribution(categorized_keywords):
    """Plot distribution of keywords by category"""
    # Filter out empty categories
    categories = {k: v for k, v in categorized_keywords.items() if v}
    
    if not categories:
        print("No keywords found to plot")
        return
    
    labels = list(categories.keys())
    values = [len(v) for v in categories.values()]
    
    plt.figure(figsize=(12, 8))
    bars = plt.bar(range(len(labels)), values, color=['#FF9999', '#66B2FF', '#99FF99', 
                                                      '#FFCC99', '#FF99CC', '#99CCFF',
                                                      '#FFD700', '#DDA0DD'])
    
    plt.xlabel('Keyword Categories')
    plt.ylabel('Number of Keywords')
    plt.title('CV Keywords Distribution')
    plt.xticks(range(len(labels)), labels, rotation=45, ha='right')
    
    # Add value labels on bars
    for bar, value in zip(bars, values):
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                f'{value}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    
    # Extract text from PDF
    pdf_text = extract_text_from_pdf("CV.pdf")
    
    # Extract searchable keywords
    searchable_keywords = extract_searchable_keywords(pdf_text)
    
    # Categorize keywords
    categorized = categorize_keywords(searchable_keywords)
    
    print("=== SEARCHABLE KEYWORDS FOR CV ===")
    print(f"Total Keywords Found: {len(searchable_keywords)}\n")
    
    # Display by category
    for category, keywords in categorized.items():
        if keywords:
            print(f"{category}:")
            for keyword in sorted(keywords):
                print(f"  • {keyword}")
            print()
    
    print("=== ALL KEYWORDS (for search indexing) ===")
    print(", ".join(sorted(searchable_keywords)))
    
    # Plot distribution
    plot_keyword_distribution(categorized)