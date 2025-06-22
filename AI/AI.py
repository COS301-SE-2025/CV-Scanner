from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from parser import extract_cv_sections
from tika_setup import extract_text_from_file

app = Flask(__name__)
UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_cv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    raw_text = extract_text_from_file(filepath)
    sections = extract_cv_sections(raw_text)

    return jsonify(sections)

if __name__ == '__main__':
    app.run(port=5000)
