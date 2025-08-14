import os
import re
import spacy
from pdfminer.high_level import extract_text
from fastapi import FastAPI
import uvicorn

app = FastAPI()

if __name__ == "__main__":
	uvicorn.run("AI:app", host="0.0.0.0", port=5000, reload=True)
