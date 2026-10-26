"""
Download context data used alongside the 605/606 reports. All sources are free and keyless.

Usage:
    pip install requests
    python fetch_context.py                 # everything
    python fetch_context.py --only vix sp500

Saves under data/raw/context/ (raw, never modified):
    sp500_wikipedia.html, sp500_symbols.txt   S&P 500 members (current list; used to flag 605 detail rows)
    nasdaqlisted.txt, otherlisted.txt         Nasdaq Trader symbol directory (exchange, ETF flag)
    vix.csv                                   CBOE VIX daily close (FRED series VIXCLS)
    finra_otc_firm_weekly.json                FINRA OTC transparency: weekly non-ATS volume per firm (market-maker share)
    edgar/<ticker>_companyfacts.json          SEC XBRL company facts for listed brokers
    edgar/<ticker>_submissions.json           SEC filing index for the same companies
"""

import argparse
import html
import json
import re
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

OUT = Path("data/raw/context")
DELAY = 1.0

# Listed parents of tracked brokers (SEC CIK). eToro files as a foreign issuer (IFRS facts).
EDGAR_COMPANIES = {
    "HOOD": 1783879,   # Robinhood Markets
    "SCHW": 316709,    # Charles Schwab
    "SOFI": 1818874,   # SoFi Technologies
    "BULL": 1866364,   # Webull Corp
    "ETOR": 1493318,   # eToro Group
    "XYZ": 1512673,    # Block (Cash App Investing)
    "MS": 895421,      # Morgan Stanley (E*TRADE)
}
OTC_START = "2024-04-01"  # matches the 606 history (2024 Q2 onwards)

session = requests.Session()
# FRED stalls on non-browser user agents; SEC's data API accepts this one (see edgar())
session.headers["User-Agent"] = "Mozilla/5.0 (rule605-research; personal academic project)"
SEC_UA = {"User-Agent": "rule605-research personal academic project"}
retry = Retry(total=5, backoff_factor=3, status_forcelist=[429, 500, 502, 503, 504],
              allowed_methods=["GET", "POST"])
session.mount("https://", HTTPAdapter(max_retries=retry))


def save(name, content):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_bytes(content if isinstance(content, bytes) else content.encode("utf-8"))
    tmp.replace(path)
    print(f"  saved {path} ({path.stat().st_size / 1024:,.0f} KB)")


def get(url, **kw):
    time.sleep(DELAY)
    r = session.get(url, timeout=60, **kw)
    r.raise_for_status()
    return r


def sp500():
    page = get("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies").text
    save("sp500_wikipedia.html", page)
    table = page[page.index('id="constituents"'):]
    table = table[:table.index("</table>")]
    syms = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", table, re.S)[1:]:
        cell = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if cell:
            syms.append(html.unescape(re.sub(r"<[^>]+>", "", cell[0])).strip())
    if len(syms) < 490:
        raise RuntimeError(f"only {len(syms)} S&P 500 symbols parsed - page layout changed?")
    save("sp500_symbols.txt", "\n".join(syms))


def symbols():
    for name in ("nasdaqlisted.txt", "otherlisted.txt"):
        save(name, get(f"https://www.nasdaqtrader.com/dynamic/SymDir/{name}").content)


def vix():
    save("vix.csv", get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS").content)


def finra_otc():
    """Weekly non-ATS OTC volume per firm, NMS stocks, paged 5,000 rows at a time."""
    url = "https://api.finra.org/data/group/otcMarket/name/weeklySummary"
    rows, offset = [], 0
    while True:
        body = {"limit": 5000, "offset": offset,
                "compareFilters": [{"compareType": "equal", "fieldName": "summaryTypeCode",
                                    "fieldValue": "OTC_W_FIRM"}],
                "dateRangeFilters": [{"fieldName": "weekStartDate", "startDate": OTC_START,
                                      "endDate": time.strftime("%Y-%m-%d")}]}
        time.sleep(DELAY)
        r = session.post(url, json=body, headers={"Accept": "application/json"}, timeout=120)
        r.raise_for_status()
        page = r.json()
        rows += page
        print(f"  FINRA OTC: {len(rows):,} rows")
        if len(page) < 5000:
            break
        offset += 5000
    save("finra_otc_firm_weekly.json", json.dumps(rows))


def edgar():
    for ticker, cik in EDGAR_COMPANIES.items():
        for kind, url in (("companyfacts", f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"),
                          ("submissions", f"https://data.sec.gov/submissions/CIK{cik:010d}.json")):
            try:
                save(f"edgar/{ticker}_{kind}.json", get(url, headers=SEC_UA).content)
            except requests.RequestException as e:
                print(f"  {ticker} {kind}: FAILED ({e})")


SOURCES = {"sp500": sp500, "symbols": symbols, "vix": vix, "finra_otc": finra_otc, "edgar": edgar}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--only", nargs="*", choices=SOURCES, help="fetch only these sources")
    args = p.parse_args()
    for name in args.only or SOURCES:
        print(f"[{name}]")
        try:
            SOURCES[name]()
        except (requests.RequestException, RuntimeError, ValueError) as e:
            print(f"  FAILED: {e} - re-run to retry")


if __name__ == "__main__":
    main()
