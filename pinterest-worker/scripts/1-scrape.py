"""
Reads pending scrape jobs from Supabase, runs pinterest-dl,
writes scraped pins back to Supabase.

Usage: python scripts/1-scrape.py (from pinterest-worker/)
"""
import os
import json
import hashlib
import subprocess
import re
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TMP_DIR = Path("tmp")
TMP_DIR.mkdir(exist_ok=True)

GROUP_PATTERNS = {
    "BTS": r"\b(bts|bangtan|jungkook|jimin|v\b|taehyung|jin|suga|rm|j-hope|jhope)\b",
    "BLACKPINK": r"\b(blackpink|jennie|lisa|rose|jisoo|bp\b)\b",
    "Stray Kids": r"\b(stray kids|skz|bang chan|hyunjin|han\b|felix|seungmin|i\.n|lee know|changbin)\b",
    "aespa": r"\b(aespa|karina|winter|giselle|ningning)\b",
    "TWICE": r"\b(twice|nayeon|jeongyeon|momo|sana|jihyo|mina|dahyun|chaeyoung|tzuyu)\b",
    "NewJeans": r"\b(newjeans|minji|hanni|danielle|haerin|hyein)\b",
    "SEVENTEEN": r"\b(seventeen|svt|s\.coups|jeonghan|joshua|jun\b|hoshi|wonwoo|woozi|dk|mingyu|the8|seungkwan|vernon|dino)\b",
    "IVE": r"\b(ive\b|wonyoung|yujin|gaeul|liz|leeseo|rei)\b",
    "EXO": r"\b(exo\b|baekhyun|chanyeol|sehun|kai\b|d\.o|chen|xiumin|suho|lay)\b",
    "LE SSERAFIM": r"\b(le sserafim|lesserafim|sakura|chaewon|yunjin|kazuha|eunchae)\b",
    "ENHYPEN": r"\b(enhypen|jungwon|heeseung|jay\b|jake\b|sunghoon|sunoo|ni-ki)\b",
    "TXT": r"\b(txt|tomorrow x together|yeonjun|soobin|beomgyu|taehyun|hueningkai)\b",
    "ITZY": r"\b(itzy|yeji|lia|ryujin|chaeryeong|yuna)\b",
    "Red Velvet": r"\b(red velvet|irene|seulgi|wendy|joy\b|yeri)\b",
    "(G)I-DLE": r"\b(g\)?i-?dle|miyeon|minnie|soyeon|yuqi|shuhua)\b",
    "ATEEZ": r"\b(ateez|hongjoong|seonghwa|yunho|yeosang|san\b|mingi|wooyoung|jongho)\b",
}


def detect_group(text):
    if not text:
        return None
    text_lower = text.lower()
    for group, pattern in GROUP_PATTERNS.items():
        if re.search(pattern, text_lower):
            return group
    return None


def scrape_job(job):
    job_id = job["id"]
    query = job["query"]
    target = job.get("target_count", 100)
    job_type = job.get("job_type", "search")

    label = query[:60] + ("..." if len(query) > 60 else "")
    print(f"\n-> Scraping ({job_type}): '{label}' (target: {target} pins)")

    supabase.table("pinterest_scrape_jobs").update({
        "status": "scraping"
    }).eq("id", job_id).execute()

    output_file = TMP_DIR / f"{job_id}.json"

    # Build pinterest-dl command based on job type
    if job_type == "board":
        cmd = [
            "pinterest-dl", "scrape", query,
            "-n", str(target),
            "-o", str(TMP_DIR / job_id),
            "--json", str(output_file),
            "--no-download",
        ]
    else:
        cmd = [
            "pinterest-dl", "search", query,
            "-n", str(target),
            "-o", str(TMP_DIR / job_id),
            "--json", str(output_file),
            "--no-download",
        ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            raise Exception(f"pinterest-dl failed: {result.stderr}")
    except Exception as e:
        supabase.table("pinterest_scrape_jobs").update({
            "status": "failed",
            "error_message": str(e)[:500],
        }).eq("id", job_id).execute()
        print(f"  x Failed: {e}")
        return

    if not output_file.exists():
        supabase.table("pinterest_scrape_jobs").update({
            "status": "failed",
            "error_message": "No output file generated",
        }).eq("id", job_id).execute()
        return

    with open(output_file) as f:
        pins = json.load(f)

    print(f"  OK Got {len(pins)} pins from Pinterest")

    inserted = 0
    skipped = 0
    for pin in pins:
        image_url = pin.get("origin") or pin.get("src") or pin.get("image_url")
        if not image_url:
            continue

        image_hash = hashlib.sha256(image_url.encode()).hexdigest()

        title = pin.get("alt") or pin.get("title") or ""
        desc = pin.get("description") or ""
        combined = f"{title} {desc}"

        save_count = int(pin.get("save_count", 0) or 0)
        if save_count < 100:
            skipped += 1
            continue

        detected_group = detect_group(combined)

        try:
            supabase.table("pinterest_scraped").insert({
                "job_id": job_id,
                "source_pin_url": pin.get("url"),
                "source_image_url": image_url,
                "source_image_hash": image_hash,
                "original_title": title[:200] if title else None,
                "original_description": desc[:500] if desc else None,
                "save_count": save_count,
                "detected_group": detected_group,
                "width": pin.get("width"),
                "height": pin.get("height"),
                "status": "new",
            }).execute()
            inserted += 1
        except Exception as e:
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                skipped += 1
            else:
                print(f"    Insert error: {e}")

    print(f"  -> Inserted: {inserted}, Skipped (dupes/low-engagement): {skipped}")

    supabase.table("pinterest_scrape_jobs").update({
        "status": "completed",
        "scraped_count": inserted,
        "completed_at": "now()",
    }).eq("id", job_id).execute()


def main():
    result = supabase.table("pinterest_scrape_jobs").select("*").eq("status", "pending").execute()
    jobs = result.data

    if not jobs:
        print("No pending scrape jobs. Add jobs from /admin/pinterest first.")
        return

    print(f"Found {len(jobs)} pending job(s).")

    for job in jobs:
        scrape_job(job)

    print("\nDone. Now approve pins in /admin/pinterest, then run: npm run process")


if __name__ == "__main__":
    main()
