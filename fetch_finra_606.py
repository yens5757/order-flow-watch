"""
Download FINRA's quarterly Rule 606 bulk zips and unpack them.

Source: https://www.finra.org/finra-data/606-nms-data/bulk-file
URL pattern: https://cdn.finra.org/606reportBulk/<YYYY>/606_NMS_<YYYY>_Q<N>.zip

Usage:
    pip install requests
    python fetch_finra_606.py                 # 2024 Q2 -> latest available
    python fetch_finra_606.py --refresh 2026Q3  # re-download a quarter FINRA has republished

Saves:
    data/raw/606/zips/606_NMS_<YYYY>_Q<N>.zip   (untouched originals)
    data/raw/606/<YYYY>Q<N>/...                  (unpacked XML files)
"""

import argparse
import time
import zipfile
from datetime import date
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

URL = "https://cdn.finra.org/606reportBulk/{y}/606_NMS_{y}_Q{q}.zip"
RAW = Path("data/raw/606")
FIRST = (2024, 2)  # FINRA's central repository starts at 2024 Q2
DELAY = 2.0

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0 (rule606-research; personal academic project)"
retry = Retry(total=5, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504],
              allowed_methods=["GET"])
session.mount("https://", HTTPAdapter(max_retries=retry))


def quarters():
    y, q = FIRST
    today = date.today()
    last = (today.year, (today.month - 1) // 3 + 1)
    while (y, q) <= last:
        yield y, q
        y, q = (y + 1, 1) if q == 4 else (y, q + 1)


def safe_extract(zip_path, dest):
    """Unzip, refusing any entry that would land outside dest (zip-slip guard)."""
    dest = dest.resolve()
    with zipfile.ZipFile(zip_path) as z:
        for member in z.infolist():
            target = (dest / member.filename).resolve()
            if not str(target).startswith(str(dest)):
                print(f"  refusing suspicious path in zip: {member.filename}")
                continue
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with z.open(member) as src, open(target, "wb") as out:
                out.write(src.read())
        return len(z.infolist())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--refresh", nargs="*", default=[], help="quarters to re-download, e.g. 2026Q2")
    args = p.parse_args()
    refresh = {s.upper() for s in args.refresh}

    zips = RAW / "zips"
    zips.mkdir(parents=True, exist_ok=True)

    for y, q in quarters():
        label = f"{y}Q{q}"
        zpath = zips / f"606_NMS_{y}_Q{q}.zip"
        if zpath.exists() and label not in refresh:
            print(f"{label}: already downloaded")
        else:
            url = URL.format(y=y, q=q)
            time.sleep(DELAY)
            try:
                r = session.get(url, timeout=600)
            except requests.RequestException as e:
                print(f"{label}: FAILED ({e}) - re-run to retry")
                continue
            if r.status_code in (403, 404):
                print(f"{label}: not published yet")
                continue
            r.raise_for_status()
            tmp = zpath.with_suffix(".part")
            tmp.write_bytes(r.content)
            tmp.replace(zpath)
            print(f"{label}: downloaded {len(r.content) / 1e6:.1f} MB")

        if zpath.exists():
            n = safe_extract(zpath, RAW / label)
            print(f"{label}: unpacked {n} files -> {RAW / label}")


if __name__ == "__main__":
    main()