from transformers import pipeline

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")