"""
Load Rule 606(a) quarterly XML reports into DuckDB.

Input : data/raw/606/<YYYY>Q<N>/*.xml   (unpacked FINRA bulk zips)
Output: data/pfof.duckdb
    routing_606   one row per broker x month x segment x venue (routing % and payments)
    segment_606   one row per broker x month x segment (order-type mix)
    files_606     every file seen, with status (loaded / superseded / failed)

Usage:
    python parse_606.py
    python parse_606.py --find fidelity      # look up a broker's CRD by name

Handles UTF-8 and UTF-16 files, and keeps only the latest version when a
broker re-submitted a report (V1, V2 ... and upload date in the filename).
"""

import argparse
import csv
import hashlib
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import duckdb

RAW = Path("data/raw/606")
DB = Path("data/pfof.duckdb")

SEGMENTS = {"rSP500": "SP500", "rOtherStocks": "OtherStocks", "rOptions": "Options"}
ORDER_TYPES = {"Market": "market", "MarketableLimit": "marketable_limit",
               "NonMarketableLimit": "nonmarketable_limit", "Other": "other"}

# Canonical market-maker names, matched on the cleaned venue name.
# (pattern, canonical name, 605 reporter id). Extend as you meet new venues.
VENUE_RULES = [
    (r"CITADEL", "Citadel Securities", "CDRG"),
    (r"VIRTU", "Virtu Americas", "NITE"),
    (r"JANE STREET", "Jane Street", "JNST"),
    (r"\bG1\b|G1 EXECUTION", "G1 Execution", "ETMM"),
    (r"HRT|HUDSON RIVER", "HRT Financial", "HRTF"),
    (r"TWO SIGMA", "Two Sigma Securities", "SOHO"),
    (r"UBS", "UBS Securities", None),
    (r"CROSSSTREAM", "CrossStream ATS (Fidelity)", "XSTM"),
    (r"NASDAQ", "Nasdaq", None),
    (r"NYSE ARCA", "NYSE Arca", None),
    (r"NEW YORK STOCK EXCHANGE|^NYSE$", "NYSE", None),
    (r"CBOE|EDGX|BZX|BYX|EDGA", "Cboe", None),
    (r"MORGAN STANLEY", "Morgan Stanley", None),
    (r"WOLVERINE", "Wolverine Execution Services", None),
    (r"\bDASH\b|\bIMC\b", "Dash / IMC", None),
    (r"GOLDMAN", "Goldman Sachs", None),
    (r"MATRIX EXECUTIONS", "Matrix Executions", None),
    (r"MEMX|MEMBERS EXCHANGE", "MEMX", None),
    (r"INVESTORS EXCHANGE|\bIEX\b", "IEX", None),
    (r"KNIGHT", "Virtu Americas", "NITE"),  # Knight Link is Virtu's (ex-Knight Capital)
    (r"\bGTS", "GTS Securities", None),  # also "GTSM" (its MPID)
    (r"STONEX", "StoneX Financial", None),
]

FNAME = re.compile(
    r"^(?P<crd>\d+)_606_NMS_(?P<y>\d{4})_Q(?P<q>\d)(?P<ctx>.*?)_V(?P<v>\d+)(?:_V\d+)*"
    r"(?:_(?P<up>\d{8}))?\.xml$", re.IGNORECASE)


def clean_name(s):
    s = re.sub(r"[.,()&]", " ", (s or "").upper())
    s = re.sub(r"\b(LLC|L L C|LP|L P|INC|INCORPORATED|CORP|CORPORATION|CO|LTD)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def canonical_venue(name, mic):
    cleaned = clean_name(name)
    for pattern, canon, rid in VENUE_RULES:
        if re.search(pattern, cleaned):
            return canon, rid
    return cleaned.title() or (mic or "?"), None


def parse_xml(path):
    """Parse bytes so ElementTree honours the declared encoding (UTF-8 or UTF-16)."""
    data = path.read_bytes()
    try:
        return ET.fromstring(data)
    except ET.ParseError:
        # Some files declare UTF-8 but are UTF-16 (or vice versa): decode, drop the declaration.
        for enc in ("utf-16", "utf-8-sig", "latin-1"):
            try:
                text = data.decode(enc)
                text = re.sub(r"^\s*<\?xml[^>]*\?>", "", text)
                return ET.fromstring(text)
            except (UnicodeDecodeError, ET.ParseError):
                continue
        raise


def txt(el, tag):
    c = el.find(tag)
    return c.text.strip() if c is not None and c.text else None


def num(el, tag):
    v = txt(el, tag)
    try:
        return float(v.replace(",", "")) if v is not None else None
    except ValueError:
        return None


def bulk_load(con, table, rows):
    """Fast load: write rows to a temp CSV and let DuckDB read it in one go
    (row-by-row INSERTs are very slow for ~100k+ rows)."""
    if not rows:
        return
    cols = con.execute(f"DESCRIBE {table}").fetchall()
    spec = "{" + ", ".join(f"'{c[0]}': '{c[1]}'" for c in cols) + "}"
    tmp = DB.parent / f"_{table}.tmp.csv"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        csv.writer(f, quoting=csv.QUOTE_MINIMAL).writerows(
            ["" if v is None else v for v in r] for r in rows)
    con.execute(f"INSERT INTO {table} SELECT * FROM read_csv('{tmp.as_posix()}', "
                f"header=false, columns={spec}, quote='\"', escape='\"', "
                f"nullstr='', strict_mode=false)").fetchall()
    tmp.unlink(missing_ok=True)


def latest_files():
    """Group by (CRD, context, year, quarter) and keep the highest version / latest upload."""
    seen, status = {}, []
    for path in sorted(RAW.glob("*Q*/*.xml")):
        m = FNAME.match(path.name)
        if not m:
            status.append((str(path), None, "SKIPPED", "unrecognised filename"))
            continue
        ctx = m["ctx"].strip("_").upper()
        # A re-submission sometimes gets a new context label instead of a new version
        # (e.g. SOFI -> SOFIUPDATED). Treat it as the same report, and let it win.
        base_ctx = re.sub(r"[_-]?(UPDATED|REVISED|CORRECTED|AMENDED)$", "", ctx)
        corrected = int(base_ctx != ctx)
        key = (m["crd"], base_ctx, m["y"], m["q"])
        rank = (corrected, int(m["v"]), m["up"] or "")
        if key not in seen or rank > seen[key][0]:
            if key in seen:
                status.append((str(seen[key][1]), m["crd"], "SUPERSEDED", "newer version exists"))
            seen[key] = (rank, path)
        else:
            status.append((str(path), m["crd"], "SUPERSEDED", "newer version exists"))

    # Different contexts are usually separate reports (business lines, clearing paths), but a
    # broker sometimes uploads the same file twice under two contexts (Webull 2024Q4). Drop exact copies.
    kept, hashes = [], set()
    for key, (_, path) in sorted(seen.items(), key=lambda kv: str(kv[1][1])):
        h = (key[0], key[2], key[3], hashlib.md5(path.read_bytes()).hexdigest())
        if h in hashes:
            status.append((str(path), key[0], "SUPERSEDED", "identical copy of another context"))
            continue
        hashes.add(h)
        kept.append((key, path))
    return kept, status


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--find", help="print CRD + broker name for files whose broker name matches")
    args = ap.parse_args()

    files, status = latest_files()

    if args.find:
        pat = re.compile(args.find, re.IGNORECASE)
        found = set()
        for (crd, ctx, y, q), path in files:
            try:
                bd = txt(parse_xml(path), "bd")
            except ET.ParseError:
                continue
            if bd and pat.search(bd):
                found.add((crd, ctx, bd))
        for crd, ctx, bd in sorted(found):
            print(f"CRD {crd:>8}  context={ctx or '-':<20} {bd}")
        return

    routing, segments = [], []
    print(f"Parsing {len(files)} report files...")
    for k, ((crd, ctx, y, q), path) in enumerate(files, 1):
        if k % 250 == 0 or k == len(files):
            print(f"  {k}/{len(files)} files parsed, {len(routing)} venue rows so far")
        try:
            root = parse_xml(path)
        except ET.ParseError as e:
            status.append((str(path), crd, "FAILED", f"XML parse error: {e}"))
            continue
        bd = txt(root, "bd")
        n_before = len(routing)
        for monthly in root.findall("rMonthly"):
            yr, mon = txt(monthly, "year"), txt(monthly, "mon")
            month = f"{yr}{int(mon):02d}" if yr and mon and mon.isdigit() else None
            for tag, seg in SEGMENTS.items():
                s = monthly.find(tag)
                if s is None:
                    continue
                segments.append((crd, ctx, bd, f"{y}Q{q}", month, seg,
                                 num(s, "ndoPct"), num(s, "ndoMarketPct"),
                                 num(s, "ndoMarketableLimitPct"),
                                 num(s, "ndoNonmarketableLimitPct"), num(s, "ndoOtherPct")))
                for v in s.findall("rVenues/rVenue"):
                    name = txt(v, "name") or txt(v, "n")
                    mic = txt(v, "mic")
                    canon, rid = canonical_venue(name, mic)
                    row = [crd, ctx, bd, f"{y}Q{q}", month, seg, name, mic, canon, rid,
                           num(v, "orderPct"), num(v, "marketPct"), num(v, "marketableLimitPct"),
                           num(v, "nonMarketableLimitPct"), num(v, "otherPct")]
                    for ot in ORDER_TYPES:
                        row += [num(v, f"netPmtPaidRecv{ot}OrdersUsd"),
                                num(v, f"netPmtPaidRecv{ot}OrdersCph")]
                    row += [txt(v, "materialAspects"), str(path)]
                    routing.append(tuple(row))
        status.append((str(path), crd, "LOADED", f"{len(routing) - n_before} venue rows"))

    pay_cols = ", ".join(f"pmt_{o}_usd DOUBLE, pmt_{o}_cph DOUBLE" for o in ORDER_TYPES.values())
    con = duckdb.connect(str(DB))
    con.execute(f"""
        CREATE OR REPLACE TABLE routing_606 (
            crd VARCHAR, context VARCHAR, broker VARCHAR, quarter VARCHAR, month VARCHAR,
            segment VARCHAR, venue_name VARCHAR, venue_mic VARCHAR, venue VARCHAR,
            venue_605_id VARCHAR, order_pct DOUBLE, market_pct DOUBLE,
            marketable_limit_pct DOUBLE, nonmarketable_limit_pct DOUBLE, other_pct DOUBLE,
            {pay_cols}, material_aspects VARCHAR, source_file VARCHAR)""").fetchall()
    con.execute("""
        CREATE OR REPLACE TABLE segment_606 (
            crd VARCHAR, context VARCHAR, broker VARCHAR, quarter VARCHAR, month VARCHAR,
            segment VARCHAR, ndo_pct DOUBLE, ndo_market_pct DOUBLE,
            ndo_marketable_limit_pct DOUBLE, ndo_nonmarketable_limit_pct DOUBLE,
            ndo_other_pct DOUBLE)""").fetchall()
    con.execute("CREATE OR REPLACE TABLE files_606 (source_file VARCHAR, crd VARCHAR, "
                "status VARCHAR, message VARCHAR)").fetchall()

    print("Writing to DuckDB...")
    bulk_load(con, "routing_606", routing)
    bulk_load(con, "segment_606", segments)
    bulk_load(con, "files_606", status)

    counts = con.execute("SELECT status, count(*) FROM files_606 GROUP BY 1 ORDER BY 1").fetchall()
    total = con.execute("SELECT count(*), count(DISTINCT crd), count(DISTINCT quarter) "
                        "FROM routing_606").fetchall()[0]
    print("files:", ", ".join(f"{s}={n}" for s, n in counts))
    print(f"routing_606: {total[0]} venue rows, {total[1]} brokers, {total[2]} quarter(s) -> {DB}")
    failed = con.execute("SELECT source_file, message FROM files_606 "
                         "WHERE status='FAILED' LIMIT 5").fetchall()
    for f, msg in failed:
        print(f"  FAILED {f}: {msg}")
    con.close()


if __name__ == "__main__":
    main()
