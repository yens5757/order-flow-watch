"""
Load amended Rule 605 *detailed* reports (per stock) into DuckDB.

Input : data/raw/605/<firm>/<ID><YYYYMM>.zip  (pipe-delimited .txt inside)
        or      data/raw/605/<firm>/<ID><YYYYMM>.txt  (Citadel publishes the .txt directly)
        data/raw/context/sp500_symbols.txt  (one ticker per line; from fetch_context.py)
Output: data/pfof.duckdb, tables `detail_605` and `sp500_symbols`

Usage:
    python parse_605_detail.py

One row per firm x month x symbol x lot size (ROUND / ODD / FRACT) x order-size bucket x order type.
Order type is a 5-character code. Decoded (and checked against the data):
    1st  M = market, L = limit
    2nd  Y = marketable (limit orders; X for market orders)
    3rd  Y = beyond-the-midpoint / executable non-marketable limit
    4th  Y = immediate-or-cancel
    5th  Y = submitted with a stop price
So MXXNN = plain market order, LYNNN = marketable limit, MXXNY = market order with a stop.

Weights: a broker routes its orders away, so its executed shares are in CvrdOrderExctdAwayQty;
a market maker fills them itself (CvrdOrderExctdQty). `shares_exec` is the sum of both.
Times (e.g. ExctdPIOrdWghtdAvgTime) are in milliseconds.

Zips are extracted once into data/cache/605/ (raw files are never modified).
"""

import re
import zipfile
from pathlib import Path

import duckdb

RAW = Path("data/raw/605")
CACHE = Path("data/cache/605")
SP500 = Path("data/raw/context/sp500_symbols.txt")
DB = Path("data/pfof.duckdb")
FILE_RE = re.compile(r"^([A-Z0-9]+?)(\d{6})\.(zip|txt)$")
FIRST_AMENDED_MONTH = "202608"

# raw column -> (clean name, type)
COLUMNS = {
    "RprtEntityCd": ("reporter_id", "VARCHAR"),
    "RptDate": ("report_month", "VARCHAR"),
    "Symbol": ("symbol", "VARCHAR"),
    "LotSizeFlag": ("lot", "VARCHAR"),
    "OrderSize": ("size_bucket", "INTEGER"),
    "OrderType": ("order_type", "VARCHAR"),
    "CvrdOrderCnt": ("orders", "DOUBLE"),
    "CvrdOrderSize": ("dollars", "DOUBLE"),
    "CvrdOrderQty": ("shares_covered", "DOUBLE"),
    "CvrdOrderExctdQty": ("shares_exec_here", "DOUBLE"),
    "CvrdOrderExctdAwayQty": ("shares_exec_away", "DOUBLE"),
    "ExctdOrderMidPtAvg": ("midpoint", "DOUBLE"),
    "ExctdOrderAvgQuotSprd": ("quoted_spread", "DOUBLE"),        # $ per share
    "AvgEffctvSprd": ("effective_spread", "DOUBLE"),             # $ per share
    "AvgEffctvSprdPct": ("effective_spread_pct", "DOUBLE"),
    "AvgEFQPct": ("efq", "DOUBLE"),                              # share of quoted spread paid
    "AvgRealSprdPct1sec": ("realized_pct_1s", "DOUBLE"),
    "AvgRealSprdPct15sec": ("realized_pct_15s", "DOUBLE"),
    "AvgRealSprdPct1min": ("realized_pct_1m", "DOUBLE"),
    "ExctdPIOrdersQty": ("pi_shares", "DOUBLE"),
    "ExctdPIOrdWghtdAvgAmtPerShare": ("pi_amount", "DOUBLE"),
    "ExctdPIOrdWghtdAvgTime": ("pi_time_ms", "DOUBLE"),
    "ExctdOrderAtQuotQty": ("at_quote_shares", "DOUBLE"),
    "ExctdOrderOutQuotQty": ("outside_quote_shares", "DOUBLE"),
    "ExctdOutQuotOrdWghtdAvgAmt": ("outside_amount", "DOUBLE"),
    "CvrdOrderQtyto1sec": ("shares_10ms_to_1s", "DOUBLE"),
}


def detailed_files():
    """Yield (path, reporter_id, month) for amended-format detailed reports."""
    for path in sorted(RAW.glob("*/*")):
        m = FILE_RE.match(path.name)
        if m and m.group(2) >= FIRST_AMENDED_MONTH:
            yield path, m.group(1), m.group(2)


def cached_txt(path, rid, month):
    """Return a plain .txt path, extracting zips into the cache on first use (and again if the zip is replaced)."""
    if path.suffix == ".txt":
        return path
    out = CACHE / f"{rid}{month}.txt"
    if not out.exists() or out.stat().st_mtime < path.stat().st_mtime:
        CACHE.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(path) as z:
            name = next((n for n in z.namelist() if n.lower().endswith(".txt")), None)
            if name is None:
                return None
            tmp = out.with_suffix(".part")
            with z.open(name) as src, open(tmp, "wb") as dst:
                while chunk := src.read(1 << 22):
                    dst.write(chunk)
            tmp.replace(out)
    return out


def main():
    files = []
    for path, rid, month in detailed_files():
        txt = cached_txt(path, rid, month)
        if txt is None:
            print(f"SKIP  {path}: no .txt inside")
            continue
        files.append(txt.as_posix())
        print(f"OK    {path.name}")
    if not files:
        print(f"No detailed reports under {RAW}")
        return

    con = duckdb.connect(str(DB))
    select = ", ".join(f'TRY_CAST(NULLIF(TRIM("{raw}"), \'\') AS {typ}) AS {clean}'
                       for raw, (clean, typ) in COLUMNS.items())
    file_list = "[" + ", ".join(f"'{f}'" for f in files) + "]"
    con.execute(f"""
        CREATE OR REPLACE TABLE detail_605 AS
        SELECT {select},
               coalesce(TRY_CAST(NULLIF(TRIM("CvrdOrderExctdQty"), '') AS DOUBLE), 0)
             + coalesce(TRY_CAST(NULLIF(TRIM("CvrdOrderExctdAwayQty"), '') AS DOUBLE), 0) AS shares_exec
        FROM read_csv({file_list}, delim='|', header=true, all_varchar=true, union_by_name=true,
                      null_padding=true, ignore_errors=true)""").fetchall()

    if SP500.exists():
        syms = [s.strip() for s in SP500.read_text(encoding="utf-8").split() if s.strip()]
        con.execute("CREATE OR REPLACE TABLE sp500_symbols (symbol VARCHAR)").fetchall()
        con.executemany("INSERT INTO sp500_symbols VALUES (?)", [[s] for s in syms])
        # 605 files write class shares as "BRK B" or "BRK/B"; the S&P list uses "BRK.B"
        con.execute("""ALTER TABLE detail_605 ADD COLUMN sp500 VARCHAR""").fetchall()
        con.execute("""UPDATE detail_605 SET sp500 = CASE WHEN regexp_replace(symbol, '[ /]', '.', 'g')
                       IN (SELECT symbol FROM sp500_symbols) THEN 'Y' ELSE 'N' END""").fetchall()
    else:
        print(f"WARNING: {SP500} missing - run fetch_context.py; sp500 flag not set")

    rows = con.execute("""SELECT reporter_id, count(*), count(DISTINCT symbol), round(sum(dollars)/1e9, 2)
                          FROM detail_605 GROUP BY 1 ORDER BY 1""").fetchall()
    for rid, n, syms, bn in rows:
        print(f"  {rid:5s} {n:>8,} rows  {syms:>6,} symbols  ${bn:,.2f}B covered orders")
    total = con.execute("SELECT count(*), count(DISTINCT reporter_id) FROM detail_605").fetchall()[0]
    print(f"\ndetail_605: {total[0]:,} rows from {total[1]} reporters -> {DB}")
    con.close()


if __name__ == "__main__":
    main()
