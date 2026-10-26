"""
Join broker payments (Rule 606) with broker execution quality (Rule 605).

Usage:
    pip install duckdb matplotlib
    python pfof_vs_execution.py                       # latest 605 month + latest 606 quarter
    python pfof_vs_execution.py --month 202608 --quarter 2026Q3

Needs: summary_605 (parse_605_summary.py), routing_606 (parse_606.py), firms.csv
       with crd_606 filled in for each broker.

Outputs:
    reports/pfof_vs_execution_<month>_<quarter>.csv   the table behind the chart
    reports/pfof_vs_execution_<month>_<quarter>.png   the chart

Metrics (market orders, per stock group):
    payment_cph            net payment the broker received from venues, cents per 100 shares,
                           averaged across venues weighted by each venue's share of the
                           broker's market orders, then averaged over the quarter's months.
                           Positive = broker was paid. Venues reporting no payment count as 0.
    payment_bps            payment_cph / average share price (from the broker's 605 report)
                           = payment in basis points of trade value. Per-share payment is
                           distorted when one broker's customers trade much cheaper stocks.
    payment_pct_of_spread  payment_bps / the broker's average quoted spread (605), as a %:
                           the share of the spread the market maker hands to the broker.
                           Same unit as pct_of_spread_paid, so the two compare directly.
                           (Robinhood's 606 states 12.35%; this gives 12.1-13.5%.)
    effective_over_quoted  from the broker's own Rule 605 summary, "all orders under $200k":
                           the share of the quoted spread the customer paid (lower = better).
"""

import argparse
from pathlib import Path

import duckdb

DB = Path("data/pfof.duckdb")
FIRMS = Path("firms.csv")
OUT = Path("reports")
ALL_UNDER_200K = 199999

def build(con, month, quarter):
    firms = f"read_csv('{FIRMS.as_posix()}', header=true, all_varchar=true)"
    return f"""
    WITH monthly AS (
        SELECT crd, quarter, month, segment,
               sum(market_pct * coalesce(pmt_market_cph, 0)) / nullif(sum(market_pct), 0)
                   AS payment_cph
        FROM routing_606
        WHERE quarter = '{quarter}' AND segment IN ('SP500', 'OtherStocks')
          AND market_pct > 0
        GROUP BY ALL
    ),
    pay AS (
        SELECT crd, segment, avg(payment_cph) AS payment_cph, count(*) AS months
        FROM monthly GROUP BY ALL
    ),
    exq AS (
        SELECT reporter_id,
               CASE sp500 WHEN 'Y' THEN 'SP500' ELSE 'OtherStocks' END AS segment,
               effective_over_quoted, pct_price_improved, effective_spread_pct,
               quoted_spread_pct, avg_order_dollars, avg_midpoint_price
        FROM summary_605
        WHERE report_month = '{month}' AND order_type = 'M'
          AND order_size_bucket = {ALL_UNDER_200K}
    )
    SELECT f.reporter_id, f.short_name, f.firm_type, f.crd_606,
           CASE e.segment WHEN 'SP500' THEN 'S&P 500' ELSE 'Other stocks' END AS stocks,
           -- cents per 100 shares / share price = basis points of trade value
           round(p.payment_cph / nullif(e.avg_midpoint_price, 0), 2) AS payment_bps,
           -- bps / (quoted spread as a fraction x 10,000) x 100%
           round(p.payment_cph / nullif(e.avg_midpoint_price, 0)
                 / nullif(e.quoted_spread_pct, 0) / 100, 1) AS payment_pct_of_spread,
           round(10000 * e.quoted_spread_pct, 2) AS quoted_spread_bps,
           round(p.payment_cph, 2)               AS payment_cph,
           round(e.avg_midpoint_price, 2)        AS avg_price,
           p.months                              AS months_606,
           round(100 * e.effective_over_quoted, 1) AS pct_of_spread_paid,
           round(100 * e.pct_price_improved, 1)  AS pct_price_improved,
           round(e.avg_order_dollars, 0)         AS avg_order_dollars
    FROM {firms} f
    JOIN exq e ON upper(e.reporter_id) = upper(f.reporter_id)
    LEFT JOIN pay p ON p.crd = f.crd_606 AND p.segment = e.segment
    WHERE f.firm_type IN ('broker', 'clearing_firm')
    ORDER BY stocks DESC, payment_pct_of_spread DESC NULLS LAST
    """


# Reference palette (dataviz skill): surface, inks, recessive grid/baseline, two series
SURFACE, INK, INK_2, MUTED = "#fcfcfb", "#0b0b0b", "#52514e", "#898781"
GRID, BASELINE = "#e1e0d9", "#c3c2b7"
PAID_TO_BROKER, PAID_BY_CUSTOMER = "#2a78d6", "#eb6834"
GROUPS = ["S&P 500", "Other stocks"]


def spearman(xs, ys):
    """Rank correlation, ties get their average rank (no scipy/pandas needed)."""
    def ranks(v):
        order = sorted(range(len(v)), key=v.__getitem__)
        r = [0.0] * len(v)
        k = 0
        while k < len(v):
            j = k
            while j + 1 < len(v) and v[order[j + 1]] == v[order[k]]:
                j += 1
            for m in range(k, j + 1):
                r[order[m]] = (k + j) / 2 + 1
            k = j + 1
        return r

    if len(xs) < 3:
        return None
    rx, ry = ranks(xs), ranks(ys)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    cov = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    var = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return cov / var if var else None


def correlations(rows, cols):
    """Per stock group: (rank correlation broker-paid vs customer-paid, n), brokers only."""
    i = {c: n for n, c in enumerate(cols)}
    out = {}
    for g in GROUPS:
        pairs = [(r[i["payment_pct_of_spread"]], r[i["pct_of_spread_paid"]]) for r in rows
                 if r[i["stocks"]] == g and r[i["firm_type"]] == "broker"
                 and r[i["payment_pct_of_spread"]] is not None
                 and r[i["pct_of_spread_paid"]] is not None]
        out[g] = (spearman([p for p, _ in pairs], [c for _, c in pairs]), len(pairs))
    return out


def chart(rows, cols, path, month, quarter):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch

    i = {c: n for n, c in enumerate(cols)}
    data = {}  # (broker label, stock group) -> (broker paid %, customer paid %)
    for r in rows:
        name = r[i["short_name"]] + (" (clearing)" if r[i["firm_type"]] == "clearing_firm" else "")
        data[name, r[i["stocks"]]] = (r[i["payment_pct_of_spread"]], r[i["pct_of_spread_paid"]])

    def sort_key(name):
        pays = [data[name, g][0] for g in GROUPS
                if (name, g) in data and data[name, g][0] is not None]
        return (0, -sum(pays) / len(pays), name) if pays else (1, 0, name.lower())

    # Rows: brokers with a 606 report, most-paid first; then brokers without one
    brokers = sorted({n for n, _ in data}, key=sort_key)
    first_unmatched = next((k for k, b in enumerate(brokers) if sort_key(b)[0]), len(brokers))
    corr = correlations(rows, cols)

    plt.rcParams.update({"font.family": ["Segoe UI", "DejaVu Sans"], "font.size": 9.5})
    n = len(brokers)
    head, foot, row_h = 1.45, 1.05, 0.34  # inches
    height = head + foot + 0.45 + n * row_h
    fig, axes = plt.subplots(1, 2, figsize=(12.5, height), sharey=True, sharex=True,
                             facecolor=SURFACE)
    fig.subplots_adjust(left=0.12, right=0.985, wspace=0.08,
                        top=1 - head / height, bottom=(foot + 0.45) / height)

    vals = [v for pair in data.values() for v in pair if v is not None] or [0]
    lo, hi = min(min(vals), 0), max(vals)
    bar_h, gap = 0.36, 0.02

    def value_label(ax, x, y):
        ax.annotate(f"{x:.0f}%", (x, y), xytext=(3 if x >= 0 else -3, 0),
                    textcoords="offset points", ha="left" if x >= 0 else "right",
                    va="center", fontsize=7.5, color=INK_2)

    for ax, g in zip(axes, GROUPS):
        ax.set_facecolor(SURFACE)
        for side in ax.spines.values():
            side.set_visible(False)
        ax.grid(True, axis="x", color=GRID, linewidth=0.8)
        ax.set_axisbelow(True)
        ax.axvline(0, color=BASELINE, linewidth=1, zorder=1)
        for y, b in enumerate(brokers):
            paid, cost = data.get((b, g), (None, None))
            y_pay, y_cost = y - bar_h / 2 - gap, y + bar_h / 2 + gap
            if paid is not None:
                ax.barh(y_pay, paid, height=bar_h, color=PAID_TO_BROKER, zorder=2)
                value_label(ax, paid, y_pay)
            else:
                ax.annotate("no 606 report", (0, y_pay), xytext=(3, 0),
                            textcoords="offset points", va="center", fontsize=7.5,
                            color=MUTED, style="italic")
            if cost is not None:
                ax.barh(y_cost, cost, height=bar_h, color=PAID_BY_CUSTOMER, zorder=2)
                value_label(ax, cost, y_cost)
        if 0 < first_unmatched < n:
            ax.axhline(first_unmatched - 0.5, color=BASELINE, linewidth=0.8)
        ax.set_title(g, loc="left", color=INK, fontsize=11.5, fontweight="bold", pad=20)
        rho, k = corr[g]
        ax.text(0, 1.012, f"Rank correlation {rho:+.2f} across {k} brokers" if rho is not None
                else "Too few brokers for a correlation",
                transform=ax.transAxes, va="bottom", fontsize=9, color=INK_2)
        ax.tick_params(axis="y", length=0, labelsize=9.5, labelcolor=INK)
        ax.tick_params(axis="x", length=0, labelcolor=MUTED)
        ax.xaxis.set_major_formatter(lambda v, _: f"{v:.0f}%")
        ax.set_xlabel("% of the quoted spread", color=INK_2)

    axes[0].set_yticks(range(n), brokers)
    axes[0].set_ylim(n - 0.4, -0.6)  # first broker at the top
    pad = (hi - lo) * 0.09
    axes[0].set_xlim(lo - (pad if lo < 0 else pad / 3), hi + pad)

    def at(inches_from_top):
        return 1 - inches_from_top / height

    fig.text(0.012, at(0.32), "Do brokers that are paid more for order flow give worse fills?",
             fontsize=14, fontweight="bold", color=INK, va="center")
    fig.text(0.012, at(0.62),
             f"Each broker's market orders under $200k: what market makers pay the broker vs what "
             f"the customer pays, both as a share of the quoted spread.  Fills: {month[:4]}-{month[4:]} "
             f"(Rule 605).  Payments: {quarter} (Rule 606).",
             fontsize=9.5, color=INK_2, va="center")
    fig.legend(handles=[Patch(color=PAID_TO_BROKER, label="Broker is paid (payment for order flow)"),
                        Patch(color=PAID_BY_CUSTOMER, label="Customer pays (lower = better fill)")],
               loc="center left", bbox_to_anchor=(0.006, at(0.92)), ncol=2, frameon=False,
               fontsize=9.5, labelcolor=INK, handlelength=1.4, handleheight=0.9,
               columnspacing=2.0)

    notes = [
        "Rank correlation: +1 = the more a broker is paid, the more its customers pay; 0 = no link. "
        "Computed over brokers with both reports (clearing firms excluded).",
        "Customer pays = effective spread / quoted spread; below 0% means filled better than the midpoint. "
        "Broker is paid = net payment from venues per share / quoted spread, weighted by routing share.",
        "Rule 605 figures are share-weighted, so a broker with mostly tiny orders (e.g. Wealthfront) "
        "is dominated by its few large ones. Brokers with no 606 report of their own are probably routed by "
        "their clearing firm, so their payment is not visible.",
        "Sources: SEC Rule 605 reports (public.s3.com/rule605); Rule 606(a) reports via FINRA bulk data.",
    ]
    for k, line in enumerate(notes):
        fig.text(0.012, (foot - 0.2 - k * 0.19) / height, line, fontsize=7.8, color=MUTED, va="center")

    fig.savefig(path, dpi=170, facecolor=SURFACE)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", help="605 month, YYYYMM (default: latest)")
    ap.add_argument("--quarter", help="606 quarter, e.g. 2026Q3 (default: latest)")
    args = ap.parse_args()

    con = duckdb.connect(str(DB), read_only=True)
    month = args.month or con.execute("SELECT max(report_month) FROM summary_605").fetchall()[0][0]
    quarter = args.quarter or con.execute("SELECT max(quarter) FROM routing_606").fetchall()[0][0]

    cur = con.execute(build(con, month, quarter))
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()

    OUT.mkdir(exist_ok=True)
    stem = OUT / f"pfof_vs_execution_{month}_{quarter}"
    con.execute(f"COPY ({build(con, month, quarter)}) TO '{stem.as_posix()}.csv' "
                f"(HEADER, DELIMITER ',')").fetchall()

    widths = [max(len(c), *(len("" if r[k] is None else str(r[k])) for r in rows))
              for k, c in enumerate(cols)] if rows else [len(c) for c in cols]
    print(f"605 month {month} vs 606 quarter {quarter} (market orders under $200k)\n")
    print("  ".join(c.ljust(w) for c, w in zip(cols, widths)))
    for r in rows:
        print("  ".join(("" if v is None else str(v)).ljust(w) for v, w in zip(r, widths)))

    chart(rows, cols, f"{stem}.png", month, quarter)
    print(f"\nSaved {stem}.csv and {stem}.png")
    if month[:4] + "Q" + str((int(month[4:]) - 1) // 3 + 1) != quarter:
        print(f"Note: 605 month {month} is not inside 606 quarter {quarter} - "
              f"payment rates are a proxy until that quarter's 606 reports are published.")


if __name__ == "__main__":
    main()
