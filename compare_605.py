"""
Side-by-side execution quality comparison across firms for one month.

Usage:
    python compare_605.py              # latest month in the database
    python compare_605.py 202608       # a specific month

Compares the "all orders under $200k" row (order_size_bucket = 199999), which is
each firm's own aggregate, so no re-weighting across size buckets is needed.
Writes reports/compare_605_<month>.csv and prints the table.

Reading the metrics:
  pct_price_improved     share of orders filled better than the quote   (higher = better)
  effective_spread_pct   cost paid vs midpoint, as % of price            (lower = better)
  effective_over_quoted  cost as a fraction of the quoted spread         (lower = better)
  avg_execution_time     time to fill (unit to verify, likely ms)        (lower = better)
"""

import sys
from pathlib import Path

import duckdb

DB = Path("data/pfof.duckdb")
FIRMS = Path("firms.csv")
OUT = Path("reports")

ALL_UNDER_200K = 199999  # aggregate bucket code - verify against the FIF Rule 605 fact sheet


def print_table(cols, rows):
    cells = [[("" if v is None else str(v)) for v in r] for r in rows]
    widths = [max(len(c), *(len(r[i]) for r in cells)) if cells else len(c)
              for i, c in enumerate(cols)]
    print("  ".join(c.ljust(w) for c, w in zip(cols, widths)))
    print("  ".join("-" * w for w in widths))
    for r in cells:
        print("  ".join(v.ljust(w) for v, w in zip(r, widths)))


def main():
    con = duckdb.connect(str(DB), read_only=True)
    month = sys.argv[1] if len(sys.argv) > 1 else con.execute(
        "SELECT max(report_month) FROM summary_605").fetchall()[0][0]

    firms = f"read_csv('{FIRMS.as_posix()}', header=true, all_varchar=true)"
    query = f"""
        SELECT
            s.reporter_id,
            coalesce(f.name, '?')       AS name,
            coalesce(f.firm_type, '?')  AS firm_type,
            CASE s.sp500 WHEN 'Y' THEN 'S&P 500' ELSE 'Other' END AS stocks,
            CASE s.order_type WHEN 'M' THEN 'market' WHEN 'ML' THEN 'marketable limit'
                 ELSE s.order_type END  AS order_type,
            round(100 * s.pct_price_improved, 1)      AS pct_price_improved,
            round(100 * s.effective_spread_pct, 4)    AS effective_spread_pct,
            round(s.effective_over_quoted, 3)         AS effective_over_quoted,
            round(s.avg_execution_time, 0)            AS avg_execution_time,
            round(s.avg_order_dollars, 0)             AS avg_order_dollars
        FROM summary_605 s
        LEFT JOIN {firms} f ON upper(f.reporter_id) = upper(s.reporter_id)
        WHERE s.report_month = '{month}'
          AND s.order_size_bucket = {ALL_UNDER_200K}
          AND s.order_type IN ('M', 'ML')
        ORDER BY stocks DESC, order_type, effective_over_quoted
    """

    OUT.mkdir(exist_ok=True)
    out = OUT / f"compare_605_{month}.csv"
    con.execute(f"COPY ({query}) TO '{out.as_posix()}' (HEADER, DELIMITER ',')").fetchall()

    cur = con.execute(query)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    print(f"Execution quality, {month}, all orders under $200k (best first by effective/quoted)\n")
    print_table(cols, rows)
    print(f"\nSaved {out}")

    missing = con.execute(f"""
        SELECT DISTINCT s.reporter_id FROM summary_605 s
        LEFT JOIN {firms} f ON upper(f.reporter_id) = upper(s.reporter_id)
        WHERE f.reporter_id IS NULL
    """).fetchall()
    if missing:
        print(f"Note: add these reporter ids to firms.csv: {[m[0] for m in missing]}")


if __name__ == "__main__":
    main()
