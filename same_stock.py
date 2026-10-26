"""
Compare execution quality on the SAME stocks, so differences in what customers trade drop out.

For every cell = symbol x lot size x order-size bucket (plain market orders, MXXNN, under $200k),
each firm's share of the spread paid (EFQ) is compared with the dollar-weighted average of the
OTHER firms of the same kind in that cell (leave-one-out). A firm's score is its dollar-weighted
average gap, in percentage points of the spread: negative = cheaper than peers on the same stocks.

Usage:
    python parse_605_detail.py      # first
    python pfof_vs_execution.py     # for the payment figures joined below
    python same_stock.py

Outputs:
    reports/same_stock_brokers_<month>.csv         score per broker x stock group, with payment
    reports/same_stock_market_makers_<month>.csv   score per market maker x stock group
"""

import csv
from pathlib import Path

import duckdb

DB = Path("data/pfof.duckdb")
FIRMS = Path("firms.csv")
OUT = Path("reports")
MIN_PEERS = 3            # cells need at least this many OTHER firms
EFQ_RANGE = (-5, 5)      # drop cells with absurd ratios (tiny or stale quoted spreads)

MARKET_MAKERS = {"CDRG": "Citadel Securities", "NITE": "Virtu Americas", "JNST": "Jane Street",
                 "ETMM": "G1 Execution", "HRTF": "HRT Financial", "SOHW": "Two Sigma Securities"}


def scores(con, month, ids):
    id_list = ", ".join(f"'{i}'" for i in ids)
    return con.execute(f"""
        WITH cells AS (
            SELECT reporter_id, sp500, symbol, lot, size_bucket,
                   sum(dollars) AS w, sum(dollars * efq) / sum(dollars) AS efq,
                   sum(shares_exec) AS shares
            FROM detail_605
            WHERE report_month = '{month}' AND order_type = 'MXXNN' AND size_bucket < 200000
              AND reporter_id IN ({id_list}) AND dollars > 0
              AND efq BETWEEN {EFQ_RANGE[0]} AND {EFQ_RANGE[1]}
            GROUP BY ALL
        ),
        tot AS (
            SELECT sp500, symbol, lot, size_bucket, sum(w) AS w_all, sum(w * efq) AS we_all, count(*) AS n
            FROM cells GROUP BY ALL
        ),
        gaps AS (
            SELECT c.reporter_id, c.sp500, c.w, c.efq,
                   (t.we_all - c.w * c.efq) / (t.w_all - c.w) AS peer_efq
            FROM cells c JOIN tot t USING (sp500, symbol, lot, size_bucket)
            WHERE t.n - 1 >= {MIN_PEERS} AND t.w_all > c.w
        )
        SELECT reporter_id, sp500,
               round(100 * sum(w * (efq - peer_efq)) / sum(w), 1) AS gap_pts,
               round(100 * sum(w * efq) / sum(w), 1)               AS own_efq,
               round(100 * sum(w * peer_efq) / sum(w), 1)          AS peers_same_stocks,
               count(*)                                            AS cells,
               round(sum(w) / 1e6, 1)                              AS dollars_m
        FROM gaps GROUP BY ALL ORDER BY sp500 DESC, gap_pts""").fetchall()


def main():
    con = duckdb.connect(str(DB), read_only=True)
    month = con.execute("SELECT max(report_month) FROM detail_605").fetchall()[0][0]
    quarter = con.execute("SELECT max(quarter) FROM routing_606").fetchall()[0][0]
    with open(FIRMS, encoding="utf-8") as f:
        brokers = {r["reporter_id"]: r["short_name"] for r in csv.DictReader(f) if r["firm_type"] == "broker"}
    pay_csv = OUT / f"pfof_vs_execution_{month}_{quarter}.csv"
    pay = {}
    if pay_csv.exists():
        with open(pay_csv, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                key = (r["reporter_id"], "Y" if r["stocks"] == "S&P 500" else "N")
                pay[key] = r["payment_pct_of_spread"] or None

    OUT.mkdir(exist_ok=True)
    head = ["firm", "stocks", "gap_pts_vs_peers", "own_efq_pct", "peers_on_same_stocks_pct", "cells", "dollars_m"]
    for label, ids, names in (("brokers", brokers, brokers), ("market_makers", MARKET_MAKERS, MARKET_MAKERS)):
        rows = scores(con, month, ids)
        path = OUT / f"same_stock_{label}_{month}.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(head + (["payment_pct_of_spread"] if label == "brokers" else []))
            for rid, sp, gap, own, peer, cells, dm in rows:
                extra = [pay.get((rid, sp))] if label == "brokers" else []
                w.writerow([names[rid], "S&P 500" if sp == "Y" else "Other stocks", gap, own, peer, cells, dm] + extra)
        print(f"\n{label} ({month}, plain market orders < $200k, same stock x lot x size cells):")
        print(f"  {'firm':22s} {'stocks':6s} {'gap vs peers':>12s} {'own':>6s} {'peers':>6s} {'cells':>7s}")
        for rid, sp, gap, own, peer, cells, dm in rows:
            print(f"  {names[rid]:22s} {'S&P' if sp == 'Y' else 'other':6s} {gap:>+10.1f}pt {own:>5.1f}% {peer:>5.1f}% {cells:>7,}")
        print(f"  -> {path}")


if __name__ == "__main__":
    main()
