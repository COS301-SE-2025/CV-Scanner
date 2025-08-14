import os, json, time, glob
from typing import Dict, List
from config_store import load_categories, last_modified
from bart_model import classify_text_by_categories

INBOX = os.environ.get("WORKER_INBOX", "inbox")      # drop *.json jobs here
OUTBOX = os.environ.get("WORKER_OUTBOX", "outbox")   # results go here
os.makedirs(INBOX, exist_ok=True)
os.makedirs(OUTBOX, exist_ok=True)

def read_job(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_result(job_id: str, result: Dict):
    out_path = os.path.join(OUTBOX, f"{job_id}.result.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

def main_loop(poll_sec: float = 2.0):
    print("[worker] starting...")
    cats = load_categories()
    cats_mtime = last_modified()
    print("[worker] categories loaded:", list(cats.keys()))

    while True:
        # hot-reload categories if admin edited them
        new_mtime = last_modified()
        if new_mtime != cats_mtime:
            cats = load_categories()
            cats_mtime = new_mtime
            print("[worker] categories reloaded:", list(cats.keys()))

        # process any pending jobs: *.json with {"id":"...", "text":"..."}
        for path in glob.glob(os.path.join(INBOX, "*.json")):
            try:
                job = read_job(path)
                job_id = job.get("id") or os.path.splitext(os.path.basename(path))[0]
                text = job.get("text") or ""
                if not text.strip():
                    print(f"[worker] skip empty text in {path}")
                    os.remove(path); continue

                res = classify_text_by_categories(text, cats, top_k=3)
                applied = {cat: [x["label"] for x in info["top_k"]] for cat, info in res.items()}
                write_result(job_id, {"applied": applied, "raw": res})
                print(f"[worker] done {job_id} -> outbox")
            except Exception as e:
                print(f"[worker] error on {path}: {e}")
            finally:
                # remove job file regardless (simple at-least-once)
                try: os.remove(path)
                except: pass

        time.sleep(poll_sec)

if __name__ == "__main__":
    main_loop()
