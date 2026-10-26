"""
Load amended Rule 605 *summary* reports (Rule 605(a)(2), Aug 2026+) into DuckDB.

Input : data/raw/605/<firm>/<ID><YYYYMM>.csv   (e.g. data/raw/605/hood/HOOD202608.csv)
Output: data/pfof.duckdb, table `summary_605` (+ `load_log_605`)

Usage:
    pip install duckdb
    python parse_605_summary.py

The table is rebuilt from the raw files on every run, so it is always
consistent with what is on disk. Raw files are never modified.
"""

import re
from datetime import datetime
from pathlib import Path

import duckdb

RAW = Path("data/raw/605")
DB = Path("data/pfof.duckdb")

# Header of the amended summary report, as published (verified on HOOD202608.csv).
EXPECTED = [
    "DsgntParticipant", "RprtEntityCd", "RptDate", "Sp500", "OrderSize", "OrderType",
    "AvgOrderQty", "AvgOrderSize", "ExctdOrderMidPtAvg", "PctExctdAtQuotOrBetter",
    "PctExctdPI", "WghtdAvgPctPI", "AvgEffctvSprdPct", "AvgPctQuotSprd", "AvgEFQPct",
    "AvgRealSprdPct15sec", "AvgRealSprdPct1min", "WghtdAvgExctnTime",
]

# Raw column -> (clean name, DuckDB type)
COLUMNS = {
    "DsgntParticipant":       ("designated_participant", "VARCHAR"),
    "RprtEntityCd":           ("reporter_id", "VARCHAR"),
    "RptDate":                ("report_month", "VARCHAR"),     # YYYYMM
    "Sp500":                  ("sp500", "VARCHAR"),            # Y / N
    "OrderSize":              ("order_size_bucket", "INTEGER"),  # $ notional bucket code
    "OrderType":              ("order_type", "VARCHAR"),       # M = market, ML = marketable limit
    "AvgOrderQty":            ("avg_order_shares", "DOUBLE"),
    "AvgOrderSize":           ("avg_order_dollars", "DOUBLE"),
    "ExctdOrderMidPtAvg":     ("avg_midpoint_price", "DOUBLE"),
    "PctExctdAtQuotOrBetter": ("pct_at_quote_or_better", "DOUBLE"),
    "PctExctdPI":             ("pct_price_improved", "DOUBLE"),
    "WghtdAvgPctPI":          ("avg_price_improvement_pct", "DOUBLE"),
    "AvgEffctvSprdPct":       ("effective_spread_pct", "DOUBLE"),
    "AvgPctQuotSprd":         ("quoted_spread_pct", "DOUBLE"),
    "AvgEFQPct":              ("effective_over_quoted", "DOUBLE"),  # lower = better
    "AvgRealSprdPct15sec":    ("realized_spread_pct_15s", "DOUBLE"),
    "AvgRealSprdPct1min":     ("realized_spread_pct_1m", "DOUBLE"),
    "WghtdAvgExctnTime":      ("avg_execution_time", "DOUBLE"),  # likely ms - verify
}

FILE_RE = re.compile(r"^([A-Za-z0-9]+?)(\d{6})\.csv$")


def find_summary_files():
    """Yield (path, folder_firm, filename_id, month) for files named <ID><YYYYMM>.csv."""
    for path in sorted(RAW.glob("*/*.csv")):
        m = FILE_RE.match(path.name)
        if m:
            yield path, path.parent.name.upper(), m.group(1).upper(), m.group(2)


def read_header(path):
    with open(path, encoding="utf-8-sig") as f:
        return [c.strip() for c in f.readline().split(",")]


def main():
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB))

    def q(sql, params=None):
        """Run SQL and fully fetch the result (works on DuckDB 1.x and 2.x)."""
        return con.execute(sql, params).fetchall() if params else con.execute(sql).fetchall()

    select_cols = ", ".join(
        f'TRY_CAST(NULLIF(TRIM("{raw}"), \'\') AS {typ}) AS {clean}'
        for raw, (clean, typ) in COLUMNS.items()
    )

    loaded, log = [], []
    for path, folder_firm, file_id, month in find_summary_files():
        header = read_header(path)
        if header != EXPECTED:
            missing = [c for c in EXPECTED if c not in header]
            extra = [c for c in header if c not in EXPECTED]
            msg = f"header mismatch (missing={missing}, extra={extra})"
            log.append((str(path), folder_firm, month, "SKIPPED", msg, 0))
            print(f"SKIP  {path}: {msg}")
            continue

        # Read everything as text, then cast explicitly, so bad values become NULL
        # instead of crashing, and we can count them.
        tmp = f"t{len(loaded)}"
        q(
            f"CREATE TEMP TABLE {tmp} AS "
            f"SELECT {select_cols}, '{path.as_posix()}' AS source_file "
            f"FROM read_csv('{path.as_posix()}', header=true, all_varchar=true)"
        )

        n = q(f"SELECT count(*) FROM {tmp}")[0][0]
        warnings = []
        ids = [r[0] for r in q(f"SELECT DISTINCT reporter_id FROM {tmp}")]
        months = [r[0] for r in q(f"SELECT DISTINCT report_month FROM {tmp}")]
        if ids != [file_id]:
            warnings.append(f"reporter_id in file {ids} != filename {file_id}")
        if file_id != folder_firm:
            warnings.append(f"filename id {file_id} != folder {folder_firm}")
        if months != [month]:
            warnings.append(f"report_month in file {months} != filename {month}")
        nulls = q(
            f"SELECT count(*) FROM {tmp} WHERE pct_price_improved IS NULL "
            f"OR effective_spread_pct IS NULL"
        )[0][0]
        if nulls:
            warnings.append(f"{nulls} row(s) with missing key metrics")

        status = "LOADED_WITH_WARNINGS" if warnings else "LOADED"
        log.append((str(path), folder_firm, month, status, "; ".join(warnings), n))
        loaded.append(tmp)
        print(f"{'WARN' if warnings else 'OK  '}  {path} ({n} rows) {'; '.join(warnings)}")

    if not loaded:
        print(f"No summary CSVs found under {RAW}/<firm>/<ID><YYYYMM>.csv")
        return

    q(
        "CREATE OR REPLACE TABLE summary_605 AS "
        + " UNION ALL ".join(f"SELECT * FROM {t}" for t in loaded)
    )

    # Duplicate check: one row per firm x month x S&P flag x order type x size bucket
    dups = q(
        "SELECT reporter_id, report_month, sp500, order_type, order_size_bucket, count(*) c "
        "FROM summary_605 GROUP BY ALL HAVING c > 1"
    )
    if dups:
        print(f"WARNING: {len(dups)} duplicate key(s) in summary_605, e.g. {dups[:3]}")

    q(
        "CREATE OR REPLACE TABLE load_log_605 (source_file VARCHAR, folder VARCHAR, "
        "report_month VARCHAR, status VARCHAR, message VARCHAR, row_count INTEGER, "
        "loaded_at TIMESTAMP)"
    )
    now = datetime.now()
    for row in log:
        q("INSERT INTO load_log_605 VALUES (?, ?, ?, ?, ?, ?, ?)", list(row) + [now])

    total = q("SELECT count(*), count(DISTINCT reporter_id) FROM summary_605")[0]
    print(f"\nsummary_605: {total[0]} rows from {total[1]} firm(s) -> {DB}")
    con.close()


if __name__ == "__main__":
    main()
