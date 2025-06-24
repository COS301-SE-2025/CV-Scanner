from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import traceback
from parser import extract_cv_sections
from tika_setup import extract_text_from_file

app = Flask(__name__)
UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_cv():
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in request'}), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use: txt, pdf, doc, docx'}), 400
        
        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Extract text
        print(f"Extracting text from: {filepath}")
        raw_text = extract_text_from_file(filepath)
        
        if not raw_text or not raw_text.strip():
            return jsonify({'error': 'No text could be extracted from file'}), 400
        
        print(f"Extracted text length: {len(raw_text)}")
        print(f"First 200 chars: {raw_text[:200]}")
        
        # Parse CV sections
        sections = extract_cv_sections(raw_text)
        
        # Add debug info
        result = {
            'sections': sections,
            'debug': {
                'raw_text_length': len(raw_text),
                'sections_found': list(sections.keys()),
                'non_empty_sections': {k: len(v) for k, v in sections.items() if v}
            }
        }
        
        # Clean up uploaded file
        try:
            os.remove(filepath)
        except:
            pass
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error processing CV: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Error processing CV: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'CV Parser API is running'})

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB'}), 413

if __name__ == '__main__':
    app.run(debug=True, port=5000)