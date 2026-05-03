"""
Reads pending scrape jobs from Supabase, runs pinterest-dl,
writes scraped pins back to Supabase.

Usage: python3 scripts/1-scrape.py (from pinterest-worker/)
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
    "ENHYPEN": r"\b(enhypen|jungwon|heeseung|jay\b|jake\b|sunghoon|sunoo|ni-ki|niki)\b",
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


def parse_dump_files(dump_dir):
    """Parse pinterest-dl dump files to extract pin data."""
    pins = []
    dump_path = Path(dump_dir)
    if not dump_path.exists():
        return pins

    # Look for JSON files in the dump directory
    for json_file in sorted(dump_path.glob("**/*.json")):
        try:
            with open(json_file) as f:
                data = json.load(f)

            # pinterest-dl dumps API responses; extract pin data from various formats
            if isinstance(data, list):
                for item in data:
                    pin = extract_pin(item)
                    if pin:
                        pins.append(pin)
            elif isinstance(data, dict):
                # Could be a single response or nested
                if "resource_response" in data:
                    results = data.get("resource_response", {}).get("data", [])
                    if isinstance(results, list):
                        for item in results:
                            pin = extract_pin(item)
                            if pin:
                                pins.append(pin)
                    elif isinstance(results, dict):
                        pin = extract_pin(results)
                        if pin:
                            pins.append(pin)
                else:
                    pin = extract_pin(data)
                    if pin:
                        pins.append(pin)
        except (json.JSONDecodeError, KeyError):
            continue

    return pins


def extract_pin(item):
    """Extract pin data from a pinterest-dl dump item."""
    if not isinstance(item, dict):
        return None

    # Try various field names pinterest-dl might use
    image_url = (
        item.get("origin") or
        item.get("src") or
        item.get("image_url") or
        item.get("url") or
        item.get("images", {}).get("orig", {}).get("url") if isinstance(item.get("images"), dict) else None
    )

    if not image_url:
        # Check nested image structures
        images = item.get("images") or item.get("image_large_url") or item.get("image")
        if isinstance(images, str):
            image_url = images
        elif isinstance(images, dict):
            for key in ["orig", "original", "736x", "564x", "474x"]:
                if key in images:
                    val = images[key]
                    image_url = val.get("url") if isinstance(val, dict) else val
                    if image_url:
                        break

    if not image_url or not isinstance(image_url, str):
        return None

    # Skip non-image URLs
    if not any(ext in image_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp", "pinimg.com"]):
        return None

    return {
        "url": item.get("link") or item.get("pin_url"),
        "image_url": image_url,
        "title": item.get("alt") or item.get("title") or item.get("grid_title") or "",
        "description": item.get("description") or item.get("closeup_description") or "",
        "save_count": int(item.get("save_count") or item.get("repin_count") or item.get("aggregated_pin_data", {}).get("aggregated_stats", {}).get("saves", 0) or 0),
        "width": item.get("images", {}).get("orig", {}).get("width") if isinstance(item.get("images"), dict) else item.get("width"),
        "height": item.get("images", {}).get("orig", {}).get("height") if isinstance(item.get("images"), dict) else item.get("height"),
    }


def parse_caption_files(output_dir):
    """Parse caption JSON files written by pinterest-dl --caption json.
    Format: { id, src, alt, origin, resolution: { x, y } }
    """
    pins = []
    out_path = Path(output_dir)
    if not out_path.exists():
        return pins

    for json_file in sorted(out_path.glob("*.json")):
        try:
            with open(json_file) as f:
                data = json.load(f)
            if not isinstance(data, dict):
                continue
            src = data.get("src")
            if not src or not isinstance(src, str):
                continue
            res = data.get("resolution", {})
            pins.append({
                "url": data.get("origin"),
                "image_url": src,
                "title": data.get("alt") or "",
                "description": "",
                "save_count": 0,
                "width": res.get("x"),
                "height": res.get("y"),
            })
        except (json.JSONDecodeError, KeyError):
            continue

    return pins


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

    output_dir = TMP_DIR / job_id
    dump_dir = TMP_DIR / f"{job_id}_dump"

    # Build pinterest-dl command
    if job_type == "board":
        cmd = [
            "pinterest-dl", "scrape", query,
            "-n", str(target),
            "-o", str(output_dir),
            "--caption", "json",
            "--dump", str(dump_dir),
            "--verbose",
        ]
    else:
        cmd = [
            "pinterest-dl", "search", query,
            "-n", str(target),
            "-o", str(output_dir),
            "--caption", "json",
            "--dump", str(dump_dir),
            "--verbose",
        ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        print(f"  stdout: {result.stdout[-200:] if result.stdout else '(empty)'}")
        if result.returncode != 0:
            print(f"  stderr: {result.stderr[-300:] if result.stderr else '(empty)'}")
            # Don't fail immediately - we might still have dump files
            if not dump_dir.exists() and not output_dir.exists():
                raise Exception(f"pinterest-dl failed (exit {result.returncode}): {result.stderr[-200:]}")
    except subprocess.TimeoutExpired:
        supabase.table("pinterest_scrape_jobs").update({
            "status": "failed",
            "error_message": "Timed out after 600s",
        }).eq("id", job_id).execute()
        print(f"  x Timed out")
        return
    except Exception as e:
        supabase.table("pinterest_scrape_jobs").update({
            "status": "failed",
            "error_message": str(e)[:500],
        }).eq("id", job_id).execute()
        print(f"  x Failed: {e}")
        return

    # Collect pins from dump files and caption files
    pins = parse_dump_files(dump_dir)
    pins.extend(parse_caption_files(output_dir))

    # Also check for images that were downloaded (extract URLs from filenames/captions)
    if not pins:
        # Last resort: look for any downloaded images and use their URLs
        for img in sorted(Path(output_dir).glob("*.*")) if output_dir.exists() else []:
            if img.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                # Check for companion JSON caption
                caption_file = img.with_suffix(".json")
                if caption_file.exists():
                    try:
                        with open(caption_file) as f:
                            cap = json.load(f)
                        pin = extract_pin(cap)
                        if pin:
                            pins.append(pin)
                    except:
                        pass

    # Deduplicate by image URL
    seen_urls = set()
    unique_pins = []
    for p in pins:
        if p["image_url"] not in seen_urls:
            seen_urls.add(p["image_url"])
            unique_pins.append(p)
    pins = unique_pins

    print(f"  Found {len(pins)} pins from pinterest-dl output")

    if len(pins) == 0:
        supabase.table("pinterest_scrape_jobs").update({
            "status": "failed",
            "error_message": "No pins found in output. pinterest-dl may need cookies or a different client.",
        }).eq("id", job_id).execute()
        return

    inserted = 0
    skipped = 0
    for pin in pins:
        image_url = pin["image_url"]
        image_hash = hashlib.sha256(image_url.encode()).hexdigest()

        title = pin.get("title", "")
        desc = pin.get("description", "")
        combined = f"{title} {desc} {query}"

        save_count = pin.get("save_count", 0)

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

    print(f"  -> Inserted: {inserted}, Skipped (dupes): {skipped}")

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

    print("\nDone. Review pins at /admin/pinterest -> Review Pins tab.")


if __name__ == "__main__":
    main()
