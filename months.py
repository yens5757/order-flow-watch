"""Which Rule 605 month the analysis and the website read.

Firms post a month's 605 report any time up to the rule's deadline, a month after the month ends, and firms the site
doesn't track can post first: on 5 Nov 2026 two of them (TFEX, MAXM) had October up while no tracked broker did.
Taking max(report_month) then picked a month with no broker in it: pfof_vs_execution.py crashed drawing an empty chart
and the website would have shown October with nothing to compare. The month to read is instead the newest one that
nearly every tracked broker (firms.csv, firm_type broker) has filed: at least SHARE as many of them as filed the month
before it. One or two late filers (a hand download waiting for the owner) don't hold the site back, and a broker that
stops filing doesn't freeze it: the month after counts against the new, smaller set.
"""
from pathlib import Path

FIRMS = Path("firms.csv")
SHARE = 0.9  # a month counts once 90% as many tracked brokers have filed it as filed the month before


def broker_counts(con, table, firms=FIRMS):
    """[(report_month, tracked brokers with rows that month)], oldest month first. `table`: summary_605 or detail_605."""
    return con.execute(f"""
        SELECT t.report_month, count(DISTINCT upper(t.reporter_id))
        FROM {table} t
        JOIN read_csv('{Path(firms).as_posix()}', header=true, all_varchar=true) f
          ON upper(t.reporter_id) = upper(f.reporter_id)
        WHERE f.firm_type = 'broker'
        GROUP BY 1 ORDER BY 1""").fetchall()


def latest_month(con, table, firms=FIRMS, share=SHARE):
    """The newest month in `table` that nearly every tracked broker has filed (YYYYMM)."""
    counts = broker_counts(con, table, firms)
    for k in range(len(counts) - 1, -1, -1):
        month, n = counts[k]
        if n >= share * (counts[k - 1][1] if k else 0):
            return month
    # no tracked broker in the table at all (a fresh database): the newest month in it
    return con.execute(f"SELECT max(report_month) FROM {table}").fetchall()[0][0]
