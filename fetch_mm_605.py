"""
Download amended Rule 605 reports that market makers publish on their own sites (not on public.s3.com).

    Virtu       virtu-www.s3...amazonaws.com/uploads/documents/NITE<YYYYMM>.zip   (zip holds csv, pdf, txt)
    Jane Street janestreet.com/static/execution-quality-reports/JNST<YYYYMM>.zip / .csv
    Citadel     citadelsecurities.com blocks scripted downloads (403): save CDRG<YYYYMM>.csv / .txt
                by hand into data/raw/605/cdrg/ - the parsers pick them up like any other firm.

Usage:
    python fetch_mm_605.py            # every month from 2026-08 (first amended month) to last month

Saves to data/raw/605/<firm>/ like fetch_s3_605.py, so parse_605_summary.py / parse_605_detail.py
load them with no extra step. An existing file is downloaded again only if the server's copy
has a different size (a corrected report).
"""

import time
import zipfile
from datetime import date
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

OUT = Path("data/raw/605")
FIRST = (2026, 8)
DELAY = 2.0
SOURCES = {
    "nite": ["https://virtu-www.s3.dualstack.us-east-1.amazonaws.com/uploads/documents/NITE{m}.zip"],
    "jnst": ["https://www.janestreet.com/static/execution-quality-reports/JNST{m}.zip",
             "https://www.janestreet.com/static/execution-quality-reports/JNST{m}.csv"],
}

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (rule605-research; personal academic project)"
retry = Retry(total=4, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET", "HEAD"])
session.mount("https://", HTTPAdapter(max_retries=retry))


def months():
    y, m = FIRST
    today = date.today()
    while (y, m) < (today.year, today.month):
        yield f"{y}{m:02d}"
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def republished(url, path):
    """True if the server's copy has a different size from the local one."""
    time.sleep(DELAY)
    try:
        r = session.head(url, timeout=60)
    except requests.RequestException:
        return False  # can't tell; check again next run
    size = r.headers.get("Content-Length")
    return r.ok and size is not None and int(size) != path.stat().st_size


def extract_summary(zip_path):
    """Virtu ships the summary csv inside the zip; put a copy beside it for parse_605_summary.py."""
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            if name.lower().endswith(".csv"):
                (zip_path.parent / Path(name).name).write_bytes(z.read(name))


def main():
    for firm, urls in SOURCES.items():
        for m in months():
            for template in urls:
                url = template.format(m=m)
                target = OUT / firm / url.rsplit("/", 1)[1]
                if target.exists() and not republished(url, target):
                    continue
                time.sleep(DELAY)
                try:
                    r = session.get(url, timeout=300)
                except requests.RequestException as e:
                    print(f"  {target.name}: FAILED ({e}) - re-run to retry")
                    continue
                if r.status_code in (403, 404):
                    print(f"  {target.name}: not published yet")
                    continue
                r.raise_for_status()
                target.parent.mkdir(parents=True, exist_ok=True)
                tmp = target.with_suffix(target.suffix + ".part")
                tmp.write_bytes(r.content)
                tmp.replace(target)
                print(f"  {target.name}: {len(r.content) / 1e6:.1f} MB")
                if target.suffix == ".zip":
                    extract_summary(target)
    cdrg = sorted((OUT / "cdrg").glob("CDRG*.csv")) if (OUT / "cdrg").exists() else []
    print(f"Citadel: {len(cdrg)} month(s) on disk (manual download: citadelsecurities.com/rule-605-606-statements)")


if __name__ == "__main__":
    main()
