"""
Does the payment vs execution-quality link hold within each order-size bucket?

Rule 605 metrics are share-weighted, so a broker's "all orders under $200k" row is
dominated by its largest orders (e.g. Wealthfront: mostly fractional-share orders, but
the aggregate reflects its few $20k+ orders). Comparing brokers bucket by bucket removes
that size-mix effect.

Usage:
    python pfof_vs_execution.py      # first: writes the payment table this script reads
    python by_order_size.py          # latest 605 month + latest 606 quarter
    python by_order_size.py --month 202608 --quarter 2026Q2

Outputs:
    reports/by_order_size_<month>_<quarter>.csv   per-bucket rank correlation + median
                                                   share of spread paid, per stock group
"""

import argparse
from pathlib import Path

import duckdb

DB = Path("data/pfof.duckdb")
OUT = Path("reports")

BUCKETS = {0: "< $250", 250: "$250-1k", 1000: "$1k-5k", 5000: "$5k-10k", 10000: "$10k-20k",
           20000: "$20k-50k", 50000: "$50k-200k", 199999: "all < $200k", 200000: ">= $200k"}


def build(pay_csv, month):
    labels = " ".join(f"WHEN {k} THEN '{v}'" for k, v in BUCKETS.items())
    return f"""
    WITH p AS (
        SELECT reporter_id, CASE stocks WHEN 'S&P 500' THEN 'Y' ELSE 'N' END AS sp500,
               payment_pct_of_spread AS payment
        FROM read_csv('{pay_csv.as_posix()}')
        WHERE payment_pct_of_spread IS NOT NULL AND firm_type = 'broker'
    ),
    e AS (
        SELECT p.sp500, p.payment, s.order_size_bucket AS bucket,
               100 * s.effective_over_quoted AS pct_of_spread_paid
        FROM p JOIN summary_605 s ON s.reporter_id = p.reporter_id AND s.sp500 = p.sp500
        WHERE s.report_month = '{month}' AND s.order_type = 'M'
          AND s.effective_over_quoted IS NOT NULL
    ),
    r AS (  -- Spearman: tied values get their average rank (many brokers are paid exactly 0)
        SELECT *,
               rank() OVER (PARTITION BY sp500, bucket ORDER BY payment)
                 + (count(*) OVER (PARTITION BY sp500, bucket, payment) - 1) / 2 AS rx,
               rank() OVER (PARTITION BY sp500, bucket ORDER BY pct_of_spread_paid)
                 + (count(*) OVER (PARTITION BY sp500, bucket, pct_of_spread_paid) - 1) / 2 AS ry
        FROM e
    )
    SELECT CASE sp500 WHEN 'Y' THEN 'S&P 500' ELSE 'Other stocks' END AS stocks,
           bucket, CASE bucket {labels} END AS order_size,
           count(*)                               AS brokers,
           round(corr(rx, ry), 2)                 AS rank_corr_payment_vs_spread_paid,
           round(median(pct_of_spread_paid), 1)   AS median_pct_of_spread_paid,
           round(min(pct_of_spread_paid), 1)      AS min_pct,
           round(max(pct_of_spread_paid), 1)      AS max_pct
    FROM r GROUP BY ALL
    ORDER BY stocks DESC, bucket
    """


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", help="605 month, YYYYMM (default: latest)")
    ap.add_argument("--quarter", help="606 quarter, e.g. 2026Q3 (default: latest)")
    args = ap.parse_args()

    con = duckdb.connect(str(DB), read_only=True)
    month = args.month or con.execute("SELECT max(report_month) FROM summary_605").fetchall()[0][0]
    quarter = args.quarter or con.execute("SELECT max(quarter) FROM routing_606").fetchall()[0][0]
    pay_csv = OUT / f"pfof_vs_execution_{month}_{quarter}.csv"
    if not pay_csv.exists():
        raise SystemExit(f"{pay_csv} not found - run pfof_vs_execution.py first")

    sql = build(pay_csv, month)
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    out = OUT / f"by_order_size_{month}_{quarter}.csv"
    con.execute(f"COPY ({sql}) TO '{out.as_posix()}' (HEADER, DELIMITER ',')").fetchall()

    widths = [max(len(c), *(len(str(r[k])) for r in rows)) for k, c in enumerate(cols)]
    print(f"605 month {month} vs 606 quarter {quarter}, market orders, brokers with a 606 match\n")
    print("  ".join(c.ljust(w) for c, w in zip(cols, widths)))
    for r in rows:
        print("  ".join(str(v).ljust(w) for v, w in zip(r, widths)))
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()
