"""Fill fees.csv by hand, one broker at a time, without touching the CSV in an editor.

    python update_fees.py                 what is still blank, per broker, and the page to open
    python update_fees.py CHAS            asks for each cell of Schwab's row; Enter keeps what is there
    python update_fees.py CHAS --dry-run  shows the row that would be written, writes nothing

Answers: a number (0, 0.65, 11.575), NA (the broker does not offer that product), - (clear the cell),
Enter (keep). Rates are percent, for a $25,000 balance / a standard account only: no new-account offers,
no paid tiers (Gold, Premium). Blank means "not checked", NA means "not offered"; never put 0 for unknown.
Afterwards: python build_site.py, then git commit -am "Fees: ..." and git push.
"""
import csv
import sys
from datetime import date
from pathlib import Path

FEES = Path("fees.csv")
FIRMS = Path("firms.csv")
CELLS = [
    ("commission_stock", "Commission per online stock trade, $"),
    ("options_per_contract", "Options fee per contract, $ (NA if the broker has no options trading)"),
    ("margin_rate_25k", "Margin rate at a $25,000 balance, % (standard tier; NA if no margin)"),
    ("cash_yield", "Interest on uninvested cash in a standard account, % (money-market default: its 7-day yield)"),
    ("transfer_out_full", "Fee for a full account transfer out (ACATS), $"),
]
# pages to open for the rows scripts could not read; every other row lists the pages it came from
PAGES = {
    "CHAS": "https://www.schwab.com/pricing (and its margin-rates page)",
    "MSSB": "https://us.etrade.com/what-we-offer/pricing-and-rates",
    "SOFI": "https://www.sofi.com/invest/pricing/",
    "CNBS": "coinbase.com: the fee schedule for stock trading",
    "WBUS": "https://www.webull.com/trading-investing/margin (standard column, not Premium)",
}


def load():
    with FEES.open(encoding="utf-8", newline="") as f:
        r = csv.DictReader(f)
        return r.fieldnames, list(r)


def names():
    with FIRMS.open(encoding="utf-8", newline="") as f:
        return {r["reporter_id"]: r["name"] for r in csv.DictReader(f)}


def missing(row):
    out = [c for c, _ in CELLS if row[c] == ""]
    if row["sipc"] == "":
        out.append("sipc")
    return out


def show_todo(rows):
    name = names()
    for r in rows:
        if r["retail_self_directed"] != "Y":
            continue
        gaps = missing(r)
        if not gaps:
            continue
        page = PAGES.get(r["reporter_id"]) or (r["source_urls"].split() or ["find its fee schedule"])[0]
        print(f"{r['reporter_id']:5} {name.get(r['reporter_id'], ''):28} {', '.join(gaps)}")
        print(f"      open: {page}")
    print("\nRun: python update_fees.py <ID>")


def ask(prompt):
    try:
        return input(prompt).strip()
    except EOFError:
        return ""


def number(text):
    """'$0.65' -> '0.65', '11.575%' -> '11.575'; raises ValueError otherwise."""
    v = text.replace("$", "").replace("%", "").replace(",", "").strip()
    float(v)
    return v


def edit(row, dry_run):
    today = date.today().isoformat()
    print(f"\n{row['reporter_id']} ({names().get(row['reporter_id'], '?')}), last checked {row['checked_on']}, confidence {row['confidence']}")
    if row["notes"]:
        print(f"notes: {row['notes']}\n")
    print("Enter keeps the current value; NA = not offered; - = clear.\n")
    changed = False
    for col, label in CELLS:
        while True:
            v = ask(f"{label} [{row[col] or 'blank'}]: ")
            if v == "":
                break
            if v == "-":
                row[col], changed = "", True
                break
            if v.upper() == "NA":
                row[col], changed = "NA", True
                break
            try:
                row[col], changed = number(v), True
                break
            except ValueError:
                print("  a number, NA, - or Enter")
    v = ask(f"SIPC member? Y/N [{row['sipc'] or 'blank'}]: ").upper()
    if v in ("Y", "N"):
        row["sipc"], changed = v, True
    if not row["crd"]:
        v = ask("CRD number, if the page shows one [blank]: ")
        if v.isdigit():
            row["crd"], changed = v, True
    urls = ask("Page(s) you read, space-separated (added to source_urls): ").split()
    for u in urls:
        if u.startswith("http") and u not in row["source_urls"].split():
            row["source_urls"] = f"{row['source_urls']} {u}".strip()
            changed = True
    note = ask("Note, e.g. where a figure comes from or a caveat (optional): ")
    if note:
        row["notes"] = f"{row['notes']} | {today} by hand: {note}".strip(" |")
        changed = True
    if changed:
        while True:
            v = ask(f"Confidence high/medium/low [{row['confidence']}]: ").lower()
            if v == "":
                break
            if v in ("high", "medium", "low"):
                row["confidence"] = v
                break
        row["checked_on"] = today
    if not changed:
        print("\nNothing changed.")
        return False
    print()
    for k in [c for c, _ in CELLS] + ["sipc", "crd", "checked_on", "confidence", "source_urls"]:
        print(f"  {k:22} {row[k] or 'blank'}")
    if dry_run:
        print("\n--dry-run: not written.")
        return False
    return True


def save(fields, rows):
    with FEES.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    fields, rows = load()
    if not args:
        show_todo(rows)
        return
    rid = args[0].upper()
    row = next((r for r in rows if r["reporter_id"] == rid), None)
    if row is None:
        sys.exit(f"{rid} is not in fees.csv; ids: {' '.join(r['reporter_id'] for r in rows)}")
    if edit(row, "--dry-run" in sys.argv):
        save(fields, rows)
        print(f"\nWritten to {FEES}. Next: python build_site.py, then git commit -am \"Fees: {rid}\" and git push.")


if __name__ == "__main__":
    main()
