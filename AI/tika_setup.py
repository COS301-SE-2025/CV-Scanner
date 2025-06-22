from tika import parser
import os

# One-time init
os.environ['TIKA_SERVER_JAR'] = 'tika-server.jar'  # Optional: if you downloaded it manually

def extract_text_from_file(filepath):
    parsed = parser.from_file(filepath)
    return parsed.get('content', '')
