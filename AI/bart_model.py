


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