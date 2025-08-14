# Manages dynamic categories/tags in a JSON file (no hardcoding).
import json, os, threading, time
from typing import Dict, List

CONFIG_PATH = os.environ.get("CATEGORIES_JSON", "categories.json")
_lock = threading.Lock()

_DEFAULT: Dict[str, List[str]] = {}  # start empty; admin fills via API

def _ensure_file():
    if not os.path.exists(CONFIG_PATH):
        save_categories(_DEFAULT)

def load_categories() -> Dict[str, List[str]]:
    _ensure_file()
    with _lock:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

def save_categories(payload: Dict[str, List[str]]) -> None:
    # normalize: strip empties, dedupe, keep order
    norm: Dict[str, List[str]] = {}
    for cat, labels in payload.items():
        if not isinstance(labels, list): continue
        seen, out = set(), []
        for x in labels:
            if not isinstance(x, str): continue
            xx = x.strip()
            if not xx or xx.lower() in seen: continue
            seen.add(xx.lower())
            out.append(xx)
        norm[str(cat).strip()] = out
    with _lock:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(norm, f, indent=2, ensure_ascii=False)

def last_modified() -> float:
    _ensure_file()
    return os.path.getmtime(CONFIG_PATH)
