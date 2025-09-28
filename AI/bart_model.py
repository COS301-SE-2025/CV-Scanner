# Thin wrapper around Hugging Face zero-shot BART.
from typing import Dict, List, Tuple

_pipeline = None
_pipeline_error = None
try:
    from transformers import pipeline  # type: ignore
    _pipeline = pipeline
except Exception as e:
    _pipeline = None
    _pipeline_error = e

def classify_text_by_categories(text: str, categories: list, top_k: int = 3):
    """
    Try HF zero-shot classifier when available; otherwise use a simple
    keyword-frequency heuristic as a safe fallback.
    Returns list[{"label": str, "score": float}] sorted by score desc.
    """
    import logging
    logging.getLogger("bart_model").debug("classify_text_by_categories called (hf available=%s)", _pipeline is not None)

    # Prefer transformers pipeline if available
    if _pipeline is not None:
        try:
            pipe = _pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)
            res = pipe(text, candidate_labels=categories, multi_label=False)
            labels = res.get("labels", [])
            scores = res.get("scores", [])
            out = []
            for lbl, sc in zip(labels[:top_k], scores[:top_k]):
                out.append({"label": lbl, "score": float(sc)})
            return out
        except Exception as e:
            logging.getLogger("bart_model").warning("HF pipeline call failed, falling back to heuristic: %s", e)

    # Fallback: simple heuristic scoring by keyword matches
    import re
    from collections import Counter
    tokens = re.findall(r"\w+", text.lower())
    ctr = Counter(tokens)

    def score_category(cat: str) -> float:
        words = [w for w in re.findall(r"\w+", cat.lower()) if len(w) > 1]
        if not words:
            return 0.0
        hits = sum(ctr.get(w, 0) for w in words)
        return hits / max(1, len(words))

    scored = [{"label": cat, "score": score_category(cat)} for cat in categories]
    scored.sort(key=lambda x: x["score"], reverse=True)
    # If all scores are zero, return first N categories with 0.0 to keep response shape predictable
    if all(d["score"] == 0 for d in scored):
        return [{"label": cat, "score": 0.0} for cat in categories[:top_k]]
    return [{"label": d["label"], "score": float(d["score"])} for d in scored[:top_k]]