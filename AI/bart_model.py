
from typing import Dict, List, Tuple
from transformers import pipeline


_zsc = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")


    out: Dict[str, Dict] = {}
    for cat, labels in categories.items():
        if not labels:  
            out[cat] = {"labels": [], "scores": [], "top_k": []}
            continue

        
        res = _zsc(
            text,
            candidate_labels=labels,
            multi_label=multi_label,
            hypothesis_template=hypothesis_template,
        )

       
        pairs: List[Tuple[str, float]] = list(zip(res["labels"], map(float, res["scores"])))

      
        top = sorted(pairs, key=lambda p: p[1], reverse=True)[:max(0, top_k)]

        out[cat] = {
            "labels": [lbl for lbl, _ in pairs],
            "scores": [score for _, score in pairs],
            "top_k": [{"label": lbl, "score": score} for lbl, score in top],
        }
    return out