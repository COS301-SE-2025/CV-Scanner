from tika import parser
import os

# Configure Tika
os.environ['TIKA_SERVER_JAR'] = 'tika-server.jar'  # Optional: if you downloaded it manually

def extract_text_from_file(filepath):
    """
    Extract text from various file formats using Apache Tika
    
    Args:
        filepath (str): Path to the file to extract text from
        
    Returns:
        str: Extracted text content
    """
    try:
        print(f"Parsing file: {filepath}")
        
        # Check if file exists
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        
        # Parse the file
        parsed = parser.from_file(filepath)
        
        # Extract content
        content = parsed.get('content', '')
        
        if not content:
            print("Warning: No content extracted from file")
            return ''
        
        # Clean up the text
        content = content.strip()
        
        # Remove excessive whitespace
        import re
        content = re.sub(r'\n\s*\n', '\n\n', content)  # Normalize line breaks
        content = re.sub(r'[ \t]+', ' ', content)  # Normalize spaces
        
        print(f"Successfully extracted {len(content)} characters")
        return content
        
    except Exception as e:
        print(f"Error extracting text from {filepath}: {str(e)}")
        raise e