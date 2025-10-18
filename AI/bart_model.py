# Lightweight zero-shot classifier using MiniLM instead of BART.
from typing import Dict, List, Tuple
import logging

_pipeline = None
_pipeline_error = None

try:
    from transformers import pipeline  # type: ignore
    # 🪶 much smaller and faster than facebook/bart-large-mnli
    _pipeline = pipeline(
        "zero-shot-classification",
        model="cross-encoder/nli-miniLM2-L6-v2",
        device=-1   # use CPU; your main app already auto-selects GPU if available
    )
except Exception as e:
    _pipeline = None
    _pipeline_error = e
    logging.getLogger("bart_model").warning("Failed to load MiniLM pipeline: %s", e)


def classify_text_by_categories(text: str, categories, top_k: int = 3):
    """
    Zero-shot classifier with normalized scores.
    Supports:
      - categories as dict: { "Skills": ["Python","Java"], ... }
      - categories as list: ["Python","Java",...]
    """
    try:
        top_k = int(top_k or 3)
    except Exception:
        top_k = 3


    if _pipeline is not None:
        try:
            if isinstance(categories, dict):
                out = {}
                for cat, labels in categories.items():
                    if not labels:
                        out[cat] = {"labels": [], "scores": [], "top_k": []}
                        continue
                    res = _pipeline(text, candidate_labels=labels, multi_label=True)
                    pairs = list(zip(res["labels"], map(float, res["scores"])))
                    # normalize
                    total = sum(score for _, score in pairs) or 1.0
                    pairs = [(lbl, score / total) for lbl, score in pairs]
                    top = sorted(pairs, key=lambda p: p[1], reverse=True)[:top_k]
                    out[cat] = {
                        "labels": [lbl for lbl, _ in pairs],
                        "scores": [sc for _, sc in pairs],
                        "top_k": [{"label": lbl, "score": sc} for lbl, sc in top],
                    }
                return out

            elif isinstance(categories, (list, tuple)):
                res = _pipeline(text, candidate_labels=categories, multi_label=True)
                pairs = list(zip(res["labels"], map(float, res["scores"])))
                total = sum(score for _, score in pairs) or 1.0
                pairs = [(lbl, score / total) for lbl, score in pairs]
                top = sorted(pairs, key=lambda p: p[1], reverse=True)[:top_k]
                return [{"label": lbl, "score": sc} for lbl, sc in top]
        except Exception as e:
            logging.getLogger("bart_model").warning("HF pipeline failed, falling back: %s", e)

    # -------------------------
    # Heuristic fallback
    # -------------------------
    import re
    from collections import Counter
    tokens = re.findall(r"\w+", text.lower())
    ctr = Counter(tokens)

    def score_label(label: str) -> float:
        words = [w for w in re.findall(r"\w+", label.lower()) if len(w) > 1]
        return sum(ctr.get(w, 0) for w in words)

    if isinstance(categories, dict):
        out = {}
        for cat, labels in categories.items():
            raw_scores = [score_label(lbl) for lbl in labels]
            total = sum(raw_scores) or 1.0
            norm_scores = [sc / total for sc in raw_scores]
            pairs = list(zip(labels, norm_scores))
            top = sorted(pairs, key=lambda p: p[1], reverse=True)[:top_k]
            out[cat] = {
                "labels": labels,
                "scores": norm_scores,
                "top_k": [{"label": lbl, "score": sc} for lbl, sc in top],
            }
        return out

    elif isinstance(categories, (list, tuple)):
        raw_scores = [score_label(lbl) for lbl in categories]
        total = sum(raw_scores) or 1.0
        norm_scores = [sc / total for sc in raw_scores]
        pairs = list(zip(categories, norm_scores))
        top = sorted(pairs, key=lambda p: p[1], reverse=True)[:top_k]
        return [{"label": lbl, "score": sc} for lbl, sc in top]

    return []