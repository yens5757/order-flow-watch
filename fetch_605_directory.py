"""
Download FINRA's Rule 605 directory: the firm name and category behind each reporter code.

Source: https://www.finra.org/filing-reporting/regulation-nms/sec-rule-605-reports
        (one paginated table per category)

Usage:
    pip install requests
    python fetch_605_directory.py

Saves:
    reporters_605.csv   reporter_id, name, category  (public directory data, safe to commit)
"""

import csv
import html
import re
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "https://www.finra.org/filing-reporting/regulation-nms/sec-rule-605-reports/"
CATEGORIES = {
    "167516": "Broker-Dealer",
    "167501": "OTC Market Maker",
    "167506": "Exchange Market Maker",
    "167496": "Alternative Trading System",
    "167511": "Single Dealer Trading System",
}
OUT = Path("reporters_605.csv")
DELAY = 5.0  # finra.org rate-limits (429) at 2s

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (rule605-research; personal academic project)"
# 429 included: back off 5s, 10s, 20s... (honours Retry-After when sent)
retry = Retry(total=6, backoff_factor=5, status_forcelist=[429, 500, 502, 503, 504],
              allowed_methods=["GET"])
session.mount("https://", HTTPAdapter(max_retries=retry))


def table_rows(page_html):
    """Yield (name, reporter_id) from the directory table on one page."""
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page_html, re.S):
        cells = [html.unescape(re.sub(r"<[^>]+>|\s+", " ", c)).strip()
                 for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) >= 2 and cells[1]:
            yield cells[0], cells[1].upper()


def main():
    # Keep earlier results: finra.org rate-limits hard, so a run may only get some categories
    found = {}
    if OUT.exists():
        with open(OUT, encoding="utf-8") as f:
            found = {r["reporter_id"]: (r["name"], r["category"]) for r in csv.DictReader(f)}

    for page_id, category in CATEGORIES.items():
        try:
            for page in range(20):  # safety cap; categories are a few pages at most
                time.sleep(DELAY)
                r = session.get(f"{BASE}{page_id}", params={"page": page}, timeout=60)
                r.raise_for_status()
                new = [(n, rid) for n, rid in table_rows(r.text)
                       if found.get(rid, (None, None))[1] != category]
                for name, rid in new:
                    found[rid] = (name, category)
                if not new:
                    break
        except requests.RequestException as e:
            print(f"{category}: FAILED ({type(e).__name__}) - re-run later to fill it in")
            continue
        print(f"{category}: {sum(1 for v in found.values() if v[1] == category)} firms")

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["reporter_id", "name", "category"])
        for rid in sorted(found):
            w.writerow([rid, *found[rid]])
    print(f"\n{len(found)} reporters -> {OUT}")


if __name__ == "__main__":
    main()
