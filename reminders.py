"""What still needs a human: prints a short Markdown to-do list for the weekly GitHub run, which keeps it in one issue.

    python reminders.py        after build_site.py (reads web/public/data/site.json and data/raw/605/)

Items: hand-downloaded Rule 605 reports (Citadel, Interactive Brokers) missing for the latest month on disk,
and fees.csv older than FEES_DUE_DAYS. Prints "Nothing due." when the list is empty.
"""
import json
from datetime import date
from pathlib import Path

SITE = Path("web/public/data/site.json")
RAW = Path("data/raw/605")
FEES_DUE_DAYS = 80  # re-check fees every quarter; the reminder appears a week or two before

# reporters whose sites refuse scripts: code -> (name, where to click)
HAND = {
    "CDRG": ("Citadel Securities", "citadelsecurities.com/rule-605-606-statements, the OTC Market Maker column: "
             "605a1 (txt) and 605a2 (csv), saved as data/raw/605/cdrg/CDRG<YYYYMM>.txt and .csv"),
    "IBBD": ("Interactive Brokers", "interactivebrokers.com > Regulatory Reports > Rule 605 > View Report (IBKR, IBBD): "
             "Detailed ZIP and Summary CSV, saved under data/raw/605/ibbd/"),
}


def main():
    meta = json.loads(SITE.read_text(encoding="utf-8"))["meta"]
    month = str(meta["month"]).replace("-", "")[:6]  # YYYYMM
    today = date.today()
    items = []
    for code, (name, how) in HAND.items():
        if not list((RAW / code.lower()).glob(f"{code}{month}.*")):
            items.append(f"- **{name}** Rule 605 report for {month[:4]}-{month[4:]} (code {code}) is not on disk. {how}")
    checked = meta.get("feesChecked")
    age = (today - date.fromisoformat(checked)).days if checked else None
    if age is None or age >= FEES_DUE_DAYS:
        when = f"last checked {checked}, {age} days ago" if checked else "never checked"
        items.append(f"- **fees.csv** is due for its quarterly check ({when}): `python update_fees.py` lists the gaps, "
                     f"`python update_fees.py <ID>` fills a row, then `python build_site.py` and push.")
    if not items:
        print("Nothing due.")
        return
    print(f"Checked {today}. Fills on the site: {month[:4]}-{month[4:]}; payments: {meta['quarter']}; fees checked: {checked or 'never'}.\n")
    print("\n".join(items))
    print("\nEverything else (S3 brokers, Virtu, Jane Street, FINRA 606 zips) is fetched automatically every Monday.")


if __name__ == "__main__":
    main()
