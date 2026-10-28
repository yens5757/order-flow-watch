"""
Download Rule 605 reports from public.s3.com/rule605/ for selected firms.

Usage:
    pip install requests beautifulsoup4
    python fetch_s3_605.py                     # target firms, files modified since 2026-08-01
    python fetch_s3_605.py --since 2023-01-01 --from-month 000000  # go further back (old format too)
    python fetch_s3_605.py --all-firms         # every folder on the site (large!)
    python fetch_s3_605.py --all-firms --summary-only  # every folder, summary CSVs only (small)

Raw files are saved untouched under data/raw/605/<firm>/.
Keep data/raw/ out of any public repo (some firms forbid redistribution).
Firms sometimes upload a corrected report under the same name (Two Sigma, Oct 2026): a file the
listing shows as changed since our download, and whose size differs, is downloaded again.
"""

import argparse
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "https://public.s3.com/rule605/"
OUT = Path("data/raw/605")
DELAY = 2.0  # seconds between requests, be polite

TARGET_FIRMS = [
    "hood",  # Robinhood
    "chas",  # Charles Schwab
    "fibs",  # Fidelity Brokerage Services
    "vgrd",  # Vanguard
    "sofi",  # SoFi
    "mssb",  # Morgan Stanley / E*TRADE (broker-dealer)
    "webl",  # Webull (verify)
    "apex",  # Apex Clearing (SoFi's router)
    "albs",  # Albert
    "altr",  # Altruist
    "avnu",  # Avenue
    "edjo",  # Edward Jones
    "etor",  # eToro
    "fnet",  # Wells Fargo Advisors Financial Network
    "pwjc",  # UBS Financial Services
    "stsh",  # Stash
    "tptg",  # Cash App Investing
    "twtt",  # tastytrade
    "wlth",  # Wealthfront
    "wret",  # Wells Fargo Clearing Services
    "futm",  # moomoo
    "ttsi",  # Public.com
    "mlwm",  # Merrill
    "cnbs",  # Coinbase
    "jpm",   # J.P. Morgan (JPBD)
    "etmm",  # G1 Execution
    "hrtf",  # HRT
    "soho",  # Two Sigma
    "jleq",  # Jump Execution (JRET)
    "gtsm",  # GTS Securities
]

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2})")
MONTH_RE = re.compile(r"(\d{6})\.\w+$")  # report month at the end of the filename
SUMMARY_RE = re.compile(r"^[A-Za-z0-9]+?\d{6}\.csv$")  # <ID><YYYYMM>.csv, as in parse_605_summary.py

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (rule605-research; personal academic project)"
# Retry dropped connections and server errors with exponential backoff (2s, 4s, 8s, 16s, 32s)
retry = Retry(
    total=5,
    connect=5,
    read=5,
    backoff_factor=2,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "HEAD"],
)
session.mount("https://", HTTPAdapter(max_retries=retry))
session.mount("http://", HTTPAdapter(max_retries=retry))

failed = []  # files that still failed after retries


def list_dir(url):
    """Return [(name, full_url, is_dir, modified_datetime_or_None)] for an Apache index page."""
    time.sleep(DELAY)
    r = session.get(url, timeout=60)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    entries = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("?") or href.startswith("/") or href in ("../", "./"):
            continue  # sort links, parent dir
        row_text = a.parent.parent.get_text(" ") if a.parent and a.parent.parent else ""
        m = DATE_RE.search(row_text)
        modified = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M") if m else None
        entries.append((href.rstrip("/"), urljoin(url, href), href.endswith("/"), modified))
    return entries


def republished(url, path, modified):
    """True if the firm has uploaded a different file under this name since we downloaded it."""
    if modified is None:
        return False
    # The listing is in New York time; +5h makes it an upper bound in UTC
    downloaded = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).replace(tzinfo=None)
    if modified + timedelta(hours=5) <= downloaded:
        return False
    time.sleep(DELAY)
    try:
        r = session.head(url, timeout=60)
    except requests.RequestException:
        return False  # can't tell; check again next run
    size = r.headers.get("Content-Length")
    if not r.ok or size is None:
        return False
    if int(size) == path.stat().st_size:
        os.utime(path)  # re-dated but identical: mark it checked so it isn't asked about again
        return False
    return True


def crawl(url, dest, since, summary_only=False, from_month=None):
    for name, full, is_dir, modified in list_dir(url):
        if is_dir:
            crawl(full + "/", dest / name, since, summary_only, from_month)
            continue
        if modified and modified < since:
            continue
        if summary_only and not SUMMARY_RE.match(name):
            continue
        # Old-format reports re-uploaded after `since` would otherwise slip through the date filter
        m = MONTH_RE.search(name)
        if from_month and (not m or m.group(1) < from_month):
            continue
        target = dest / name
        if target.exists() and not republished(full, target, modified):
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        print(f"  {'corrected, downloading again' if target.exists() else 'downloading'} {full}")
        time.sleep(DELAY)
        tmp = target.with_suffix(target.suffix + ".part")
        try:
            with session.get(full, stream=True, timeout=300) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(1 << 20):
                        f.write(chunk)
            tmp.replace(target)
        except requests.RequestException as e:
            print(f"  FAILED (will retry next run): {e}")
            failed.append(full)
            tmp.unlink(missing_ok=True)
            time.sleep(DELAY * 5)  # back off harder after a failure


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--since", default="2026-08-01", help="only files modified on/after this date")
    p.add_argument("--all-firms", action="store_true", help="crawl every folder on the site")
    p.add_argument("--summary-only", action="store_true",
                   help="only download summary CSVs (<ID><YYYYMM>.csv), skip detailed reports")
    p.add_argument("--from-month", default="202608",
                   help="skip files whose report month (YYYYMM in the name) is earlier; "
                        "202608 = first month of the amended format. Use 000000 to keep all")
    args = p.parse_args()
    since = datetime.strptime(args.since, "%Y-%m-%d")

    if args.all_firms:
        firms = [n for n, _, is_dir, _ in list_dir(BASE) if is_dir]
    else:
        firms = TARGET_FIRMS

    for firm in firms:
        print(f"[{firm}]")
        try:
            crawl(urljoin(BASE, firm + "/"), OUT / firm, since, args.summary_only, args.from_month)
        except requests.RequestException as e:
            print(f"  skipped folder: {e}")

    if failed:
        print(f"\n{len(failed)} file(s) failed. Re-run the script to retry them:")
        for u in failed:
            print("  " + u)
    else:
        print("\nAll done.")


if __name__ == "__main__":
    main()