# Thin wrapper around Hugging Face zero-shot BART.
from typing import Dict, List, Tuple
from transformers import pipeline

# Load once per process
_zsc = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def classify_text_by_categories(
    text: str,
    categories: Dict[str, List[str]],
    top_k: int = 3,
    hypothesis_template: str = "This candidate has {}.",
    multi_label: bool = True,
) -> Dict[str, Dict]:
    """
    Returns:
      {
        "Skills": {
          "labels": ["Writer","Coder","Backend",...],
          "scores": [0.81, 0.64, 0.33,...],
          "top_k": [{"label": "Writer", "score": 0.81}, ... up to k]
        },
        ...
      }
    """
    out: Dict[str, Dict] = {}
    for cat, labels in categories.items():
        if not labels:  # skip empty categories
            out[cat] = {"labels": [], "scores": [], "top_k": []}
            continue

        # Independent scoring + clearer NLI template
        res = _zsc(
            text,
            candidate_labels=labels,
            multi_label=multi_label,
            hypothesis_template=hypothesis_template,
        )

        # Pair up labels with scores (already aligned by HF)
        pairs: List[Tuple[str, float]] = list(zip(res["labels"], map(float, res["scores"])))

        # Top-k by score (descending)
        top = sorted(pairs, key=lambda p: p[1], reverse=True)[:max(0, top_k)]

        out[cat] = {
            "labels": [lbl for lbl, _ in pairs],
            "scores": [score for _, score in pairs],
            "top_k": [{"label": lbl, "score": score} for lbl, score in top],
        }
    return out