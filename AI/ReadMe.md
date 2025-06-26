
# 🧠 CV Scanner AI Engine

This project is an AI-powered CV parsing engine built with Apache Tika and Flask. It extracts key information from uploaded PDF resumes and returns a structured JSON response. It is designed to handle multiple PDFs via an API.

---

## ✅ Full Setup Instructions

```bash
# Step 1: Clone the repository
git clone https://github.com/your-username/CV-Scanner.git
cd CV-Scanner/AI

# Step 2: Create a virtual environment
python -m venv venv

# Step 3: Activate the virtual environment
# On Windows PowerShell
.\venv\Scripts\Activate.ps1

# If activation fails due to permissions, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# On Linux/macOS
# source venv/bin/activate

# Step 4: Install Python dependencies
pip install flask tika

# Step 5: Check Java (Tika requires it)
java -version

# If Java is not installed:
# On Ubuntu/Debian
sudo apt update
sudo apt install default-jre

# On Windows:
# Download and install Java from https://adoptium.net or https://www.java.com

# Step 6: Run the Flask server
python AI.py
