"""
Export everything the website needs into one JSON file. The React app in web/ renders it.

Usage:
    python build_site.py        # after the parse_* scripts, pfof_vs_execution.py and same_stock.py
    cd web && npm run build     # -> web/dist/ (static site)

Reads : data/pfof.duckdb, firms.csv, reporters_605.csv, data/raw/context/ (symbols, VIX, FINRA OTC)
Writes: web/public/data/site.json

Only derived, aggregated numbers go into the file - no raw report files.
"""

import csv
import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import duckdb

import same_stock
import stats
from parse_606 import canonical_venue

DB = Path("data/pfof.duckdb")
FIRMS = Path("firms.csv")
REPORTERS = Path("reporters_605.csv")
CONTEXT = Path("data/raw/context")
OUT = Path("web/public/data/site.json")

SEG = {"SP500": "Y", "OtherStocks": "N"}
EFQ_RANGE = same_stock.EFQ_RANGE


def read_csv(path):
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def rows(con, sql):
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def rnd(v, n=4):
    return None if v is None else round(v, n)


def etf_symbols():
    out = set()
    for name, sym_col in (("nasdaqlisted.txt", "Symbol"), ("otherlisted.txt", "ACT Symbol")):
        path = CONTEXT / name
        if not path.exists():
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        hdr = lines[0].split("|")
        si, ei = hdr.index(sym_col), hdr.index("ETF")
        out |= {p[si] for p in (line.split("|") for line in lines[1:]) if len(p) > ei and p[ei] == "Y"}
    return out


def main():
    con = duckdb.connect(str(DB), read_only=True)
    firms = [f for f in read_csv(FIRMS) if f["firm_type"] in ("broker", "clearing_firm")]
    brokers = {f["reporter_id"]: f for f in firms if f["firm_type"] == "broker"}
    crds = sorted({f["crd_606"] for f in firms if f["crd_606"]})
    crd_list = ", ".join(f"'{c}'" for c in crds)
    ids = ", ".join(f"'{f['reporter_id']}'" for f in firms)
    directory = {r["reporter_id"]: r for r in read_csv(REPORTERS)}
    month = con.execute("SELECT max(report_month) FROM summary_605").fetchall()[0][0]
    quarter = con.execute("SELECT max(quarter) FROM routing_606").fetchall()[0][0]
    detail_month = con.execute("SELECT max(report_month) FROM detail_605").fetchall()[0][0]

    # ---- Rule 605 summary rows, all firms (drives the filters in the explorer)
    exec_rows = rows(con, """
        SELECT reporter_id AS id, report_month AS m, sp500 AS sp, order_type AS ot, order_size_bucket AS b,
               effective_over_quoted AS efq, pct_price_improved AS pi, pct_at_quote_or_better AS aq,
               quoted_spread_pct AS qs, avg_order_dollars AS sz, avg_midpoint_price AS px,
               avg_execution_time AS t, realized_spread_pct_1m AS rs1
        FROM summary_605 WHERE order_type IN ('M', 'ML')""")
    exec_cols = ["id", "m", "sp", "ot", "b", "efq", "pi", "aq", "qs", "sz", "px", "t", "rs1"]
    exec_out = [[r[c] if c in ("id", "m", "sp", "ot", "b") else rnd(r[c], 6) for c in exec_cols] for r in exec_rows]

    reporters = {}
    for r in rows(con, "SELECT reporter_id AS id, any_value(designated_participant) AS dp FROM summary_605 GROUP BY 1"):
        d = directory.get(r["id"], {})
        reporters[r["id"]] = {"name": d.get("name") or r["id"],
                              "cat": d.get("category") or ("Exchange" if r["dp"] != "T" else "Unclassified")}

    # ---- Rule 606: payment rates, dollar totals, venue mix
    pay = rows(con, f"""
        WITH m AS (
            SELECT crd, quarter, month, segment,
                   sum(market_pct * coalesce(pmt_market_cph, 0)) / nullif(sum(market_pct), 0) AS m_cph,
                   sum(marketable_limit_pct * coalesce(pmt_marketable_limit_cph, 0))
                       / nullif(sum(marketable_limit_pct), 0) AS ml_cph
            FROM routing_606 WHERE crd IN ({crd_list}) AND segment IN ('SP500', 'OtherStocks') GROUP BY ALL)
        SELECT crd, quarter, segment, avg(m_cph) AS m_cph, avg(ml_cph) AS ml_cph FROM m GROUP BY ALL""")
    pay_out = [[p["crd"], p["quarter"], SEG[p["segment"]], rnd(p["m_cph"], 2), rnd(p["ml_cph"], 2)] for p in pay]
    usd = rows(con, f"""
        SELECT crd, quarter, segment,
               sum(coalesce(pmt_market_usd, 0) + coalesce(pmt_marketable_limit_usd, 0)
                   + coalesce(pmt_nonmarketable_limit_usd, 0) + coalesce(pmt_other_usd, 0)) AS usd
        FROM routing_606 WHERE crd IN ({crd_list}) GROUP BY ALL""")
    usd_out = [[u["crd"], u["quarter"], u["segment"], rnd(u["usd"], 0)] for u in usd]
    venues = rows(con, f"""
        WITH n AS (SELECT crd, quarter, segment, count(DISTINCT month) AS months
                   FROM routing_606 WHERE crd IN ({crd_list}) GROUP BY ALL)
        SELECT r.crd, r.quarter, r.segment, r.venue,
               sum(coalesce(r.market_pct, 0)) / any_value(n.months) AS mkt,
               sum(coalesce(r.marketable_limit_pct, 0)) / any_value(n.months) AS ml,
               sum(r.market_pct * r.pmt_market_cph) / nullif(sum(r.market_pct), 0) AS m_cph,
               sum(r.marketable_limit_pct * r.pmt_marketable_limit_cph) / nullif(sum(r.marketable_limit_pct), 0) AS ml_cph
        FROM routing_606 r JOIN n USING (crd, quarter, segment)
        WHERE r.crd IN ({crd_list}) AND r.segment IN ('SP500', 'OtherStocks')
        GROUP BY ALL HAVING sum(coalesce(r.market_pct, 0)) + sum(coalesce(r.marketable_limit_pct, 0)) > 0""")
    venue_out = [[v["crd"], v["quarter"], SEG[v["segment"]], v["venue"], rnd(v["mkt"], 1), rnd(v["ml"], 1),
                  rnd(v["m_cph"], 2), rnd(v["ml_cph"], 2)] for v in venues]

    # ---- Per broker x stock group, market orders < $200k: payment % of spread, cost, market maker's margin
    base = {(r["id"], r["sp"]): r for r in exec_rows if r["m"] == month and r["ot"] == "M" and r["b"] == 199999}
    pay_now = {(p["crd"], SEG[p["segment"]]): p["m_cph"] for p in pay if p["quarter"] == quarter}
    money = []
    for rid, f in brokers.items():
        for sp in "YN":
            e = base.get((rid, sp))
            if not e or e["efq"] is None:
                continue
            cph = pay_now.get((f["crd_606"], sp))
            pay_pct = cph / e["px"] / e["qs"] / 100 if cph is not None and e["px"] and e["qs"] else None
            mm = 100 * e["rs1"] / e["qs"] if e["rs1"] is not None and e["qs"] else None
            money.append({"id": rid, "sp": sp, "cust": rnd(100 * e["efq"], 2), "pay": rnd(pay_pct, 2),
                          "mmKeeps": rnd(mm, 2), "sz": rnd(e["sz"], 0), "t": rnd(e["t"], 1),
                          "pi": rnd(100 * e["pi"], 2) if e["pi"] is not None else None})

    # ---- Same-stock scores (detailed 605) and what routing alone would predict
    gaps = {}
    same = {"brokers": [], "marketMakers": []}
    for label, ids_map in (("brokers", {k: f["short_name"] for k, f in brokers.items()}),
                           ("marketMakers", same_stock.MARKET_MAKERS)):
        for rid, sp, gap, own, peer, cells, dm in same_stock.scores(con, detail_month, ids_map):
            same[label].append({"id": rid, "sp": sp, "gap": gap, "own": own, "peers": peer, "cells": cells})
            gaps[(label, rid, sp)] = (gap, cells)
    mm_gap = {(name, sp): gaps[("marketMakers", rid, sp)][0]
              for rid, name in same_stock.MARKET_MAKERS.items() for sp in "YN" if ("marketMakers", rid, sp) in gaps}
    shares = defaultdict(dict)
    for v in venues:
        if v["quarter"] == quarter:
            shares[(v["crd"], SEG[v["segment"]])][v["venue"]] = v["mkt"] or 0
    implied = []
    for rid, f in brokers.items():
        for sp in "YN":
            mix = shares.get((f["crd_606"], sp))
            actual = gaps.get(("brokers", rid, sp))
            if not mix or not actual or actual[1] < 100:
                continue
            tot = sum(mix.values())
            cov = sum(s for vn, s in mix.items() if (vn, sp) in mm_gap)
            if tot and cov / tot > 0.5:
                implied.append({"id": rid, "sp": sp, "actual": actual[0], "coverage": round(cov / tot, 3),
                                "implied": round(sum(s * mm_gap[(vn, sp)] for vn, s in mix.items() if (vn, sp) in mm_gap) / cov, 1)})

    # ---- The evidence table: each claim with its rank correlation, permutation p-value and 95% interval
    evidence = []
    by_key = {(m["id"], m["sp"]): m for m in money}

    def add(claim, sp, pairs, expect):
        """expect = the sign of rho that would support the claim (+1 or -1).
        pairs are (x, y) or (x, y, control): a third value makes it a partial correlation."""
        pairs = [p for p in pairs if None not in p]
        cols = list(zip(*pairs)) if pairs else [(), ()]
        res = stats.test(list(cols[0]), list(cols[1]), list(cols[2]) if len(cols) > 2 else None)
        if res:
            evidence.append({"claim": claim, "sp": sp, "expect": expect, **res})

    for sp in "YN":
        same_b = {r["id"]: r for r in same["brokers"] if r["sp"] == sp and r["cells"] >= 100}
        add("Paid more → customers pay more of the spread", sp, [(m["pay"], m["cust"]) for m in money if m["sp"] == sp], 1)
        # brokers paid most have customers in cheap, wide-spread stocks; hold share price equal
        add("Paid more → customers pay more, at equal share price", sp,
            [(m["pay"], m["cust"], base[(m["id"], sp)]["px"]) for m in money if m["sp"] == sp], 1)
        add("Paid more → worse prices on the same stocks", sp,
            [(by_key.get((k, sp), {}).get("pay"), r["gap"]) for k, r in same_b.items()], 1)
        add("Bigger typical order (clientele) → better prices on the same stocks", sp,
            [(by_key.get((k, sp), {}).get("sz"), r["gap"]) for k, r in same_b.items()], -1)
        add("Slower fills → better prices on the same stocks", sp,
            [(by_key.get((k, sp), {}).get("t"), r["gap"]) for k, r in same_b.items()], -1)
        add("Routing mix predicts a broker's same-stock prices", sp,
            [(r["implied"], r["actual"]) for r in implied if r["sp"] == sp], 1)
        add("More orders price-improved → customers pay less", sp, [(m["pi"], m["cust"]) for m in money if m["sp"] == sp], -1)

    # ---- Detailed 605 breakdowns: lot type, price tier, order mix
    etfs = sorted(etf_symbols())
    con.execute("CREATE TEMP TABLE etf AS SELECT unnest(?::VARCHAR[]) AS symbol", [etfs]).fetchall()
    bid = ", ".join(f"'{b}'" for b in brokers)
    mkt = f"""FROM detail_605 WHERE report_month = '{detail_month}' AND order_type = 'MXXNN' AND size_bucket < 200000
              AND dollars > 0 AND efq BETWEEN {EFQ_RANGE[0]} AND {EFQ_RANGE[1]} AND reporter_id IN ({bid})"""
    lots = rows(con, f"""SELECT reporter_id AS id, sp500 AS sp, lot, sum(dollars * efq) / sum(dollars) * 100 AS efq,
                         sum(orders) AS orders, sum(dollars) AS dollars {mkt} GROUP BY ALL""")
    tiers = rows(con, f"""SELECT reporter_id AS id,
                 CASE WHEN symbol IN (SELECT symbol FROM etf) THEN 'ETF' ELSE 'Stock' END AS kind,
                 CASE WHEN midpoint < 5 THEN 0 WHEN midpoint < 20 THEN 1 WHEN midpoint < 100 THEN 2 ELSE 3 END AS tier,
                 sum(dollars * efq) / sum(dollars) * 100 AS efq, sum(dollars) AS dollars
                 {mkt} AND sp500 = 'N' GROUP BY ALL""")
    mix = rows(con, f"""SELECT reporter_id AS id, sum(orders) AS orders,
                 sum(orders) FILTER (WHERE order_type LIKE 'M%') / sum(orders) * 100 AS market,
                 sum(orders) FILTER (WHERE lot = 'FRACT') / sum(orders) * 100 AS fractional
                 FROM detail_605 WHERE report_month = '{detail_month}' AND reporter_id IN ({bid}) GROUP BY 1""")

    # ---- Context: market makers' share of off-exchange volume (FINRA), VIX
    otc = []
    otc_path = CONTEXT / "finra_otc_firm_weekly.json"
    if otc_path.exists():
        vol, tot = defaultdict(Counter), Counter()
        for r in json.loads(otc_path.read_text(encoding="utf-8")):
            q = f"{r['weekStartDate'][:4]}Q{(int(r['weekStartDate'][5:7]) - 1) // 3 + 1}"
            v = r.get("totalWeeklyShareQuantity") or 0
            # same name cleaning as 606 venues: "HRT FINANCIAL LP" -> "HRT Financial"
            vol[q][canonical_venue(r.get("marketParticipantName") or "?", None)[0]] += v
            tot[q] += v
        recent = Counter()
        for q in sorted(tot)[-4:]:
            recent.update(vol[q])
        top = [n for n, _ in recent.most_common(6)]
        otc = [{"q": q, "firm": n, "share": round(100 * vol[q][n] / tot[q], 2)} for q in sorted(tot) for n in top]
    vix = defaultdict(list)
    vix_path = CONTEXT / "vix.csv"
    if vix_path.exists():
        for r in read_csv(vix_path):
            k = list(r)
            try:
                vix[r[k[0]][:7]].append(float(r[k[1]]))
            except ValueError:
                pass

    data = {
        "meta": {"built": date.today().isoformat(), "month": month, "detailMonth": detail_month,
                 "months": sorted({r["m"] for r in exec_rows}), "quarter": quarter,
                 "quarters": sorted({p["quarter"] for p in pay}),
                 "vix": {m: round(sum(v) / len(v), 1) for m, v in sorted(vix.items()) if m >= "2024-04"}},
        "firms": [{"id": f["reporter_id"], "name": f["name"], "short": f["short_name"], "type": f["firm_type"],
                   "crd": f["crd_606"] or None} for f in firms],
        "marketMakers": [{"id": k, "name": v} for k, v in same_stock.MARKET_MAKERS.items()],
        "reporters": reporters,
        "execCols": exec_cols, "exec": exec_out,
        "pay": pay_out, "usd": usd_out, "venues": venue_out,
        "money": money, "sameStock": same, "implied": implied, "evidence": evidence,
        "lots": [{k: rnd(v, 2) if isinstance(v, float) else v for k, v in r.items()} for r in lots],
        "tiers": [{k: rnd(v, 2) if isinstance(v, float) else v for k, v in r.items()} for r in tiers],
        "orderMix": [{k: rnd(v, 1) if isinstance(v, float) else v for k, v in r.items()} for r in mix],
        "otc": otc,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"{len(exec_out)} 605 rows, {len(evidence)} tests, {len(implied)} routing checks -> {OUT} "
          f"({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
