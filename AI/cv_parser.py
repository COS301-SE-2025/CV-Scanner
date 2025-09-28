import os
import re
import tempfile
import logging
from typing import Dict, Any

# keep heavy deps out of module import to avoid torchvision/torch init errors
_hf_pipeline = None
_hf_pipeline_error = None
try:
    # do not import pipeline at module load time; attempt lazily later if needed
    pass
except Exception as e:
    _hf_pipeline = None
    _hf_pipeline_error = e

def _text_from_pdf_bytes(b: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text
    except Exception:
        logging.exception("pdfminer unavailable")
        return ""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tf:
        tf.write(b)
        tf.flush()
        try:
            return extract_text(tf.name) or ""
        except Exception:
            logging.exception("failed extracting text from pdf")
            return ""

_email_rx = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
_phone_rx = re.compile(r"(\+?\d[\d\-\s\(\)]{6,}\d)")

def _simple_extract(text: str) -> Dict[str,Any]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    text_lower = text.lower()
    emails = list(dict.fromkeys(_email_rx.findall(text)))
    phones = list(dict.fromkeys([m[0] if isinstance(m, tuple) else m for m in _phone_rx.findall(text)]))
    # basic skill extraction: lines containing common skill keywords
    skill_keywords = ["python","java","c++","c#","sql","aws","azure","docker","kubernetes","tensorflow","pytorch","nlp","machine learning","react","node"]
    found_skills = []
    for kw in skill_keywords:
        if kw in text_lower:
            found_skills.append(kw)
    # fallback: try to take a few top lines as summary
    summary = " ".join(lines[:6])
    return {
        "text": text,
        "emails": emails,
        "phones": phones,
        "skills": list(dict.fromkeys(found_skills)),
        "summary": summary,
    }

def parse_resume_from_bytes(file_bytes: bytes, *args, **kwargs) -> Dict[str,Any]:
    """
    Safe resume parser. Attempts a lightweight text extraction and simple regex-based parsing.
    If transformers pipeline is available at runtime and you need advanced parsing, call with
    `enable_hf=True` and ensure the environment has compatible torch/torchvision installed.
    """
    enable_hf = kwargs.pop("enable_hf", False)
    text = _text_from_pdf_bytes(file_bytes)
    if not text:
        return {"error": "no_text_extracted", "text": ""}

    if enable_hf:
        # try lazy import of transformers.pipeline here; if it fails, fall back gracefully
        try:
            from transformers import pipeline as _pipeline  # type: ignore
            # create pipelines locally and run (use CPU to avoid GPU issues unless env supports it)
            try:
                ner = _pipeline("ner", device=-1)
                qa = _pipeline("question-answering", device=-1)
                # example: run small NER pass (may be slow)
                ner_res = ner(text[:2000])
            except Exception:
                ner_res = []
            parsed = _simple_extract(text)
            parsed["ner"] = ner_res
            return parsed
        except Exception as e:
            logging.warning("transformers pipeline unavailable at runtime: %s", e)
            # continue to fallback parsing below

    # fallback simple parsing (fast, safe)
    return _simple_extract(text)
