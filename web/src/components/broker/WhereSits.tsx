// "Where <broker> sits": every broker by price above the fair price per $10,000 traded, cheapest first, as a real table.
// The broker's neighbourhood (it and three either side) shows first; "See all" expands in place. Every row is in the page:
// the neighbourhood is a CSS rule that only applies with a script (broker.css), so without one the whole table shows.
// Rows carry their broker's id (data-id), so the page can animate the re-ranking when the stock switch flips.
import { useRef } from "react";
import { andList, money, payment, payWhen, type Group, type Pay, type Place } from "../../lib/broker";
import type { Data, Firm } from "../../lib/data";
import { monthLong, ordinal, quarterLong } from "../../lib/format";
import { brokerPath, href } from "../../lib/routes";
import { Icon } from "../ui";

interface Row { id: string; slug: string; short: string; self: boolean; rank: number | null; cost: number; last: Place | null | undefined; pay: Pay }

const NEAR = 3; // rows either side of the broker

/** What the broker is paid, the same at every width: "$0.83", "$0.00", and words only where a number would mislead
 *  ("Pays $0.07" rather than a minus sign, "No report"). On a phone the restacked row adds the column's name ("Paid"),
 *  since its heading is out of sight. */
function PayCell({ pay }: { pay: Pay }) {
  const late = pay.fallback && <><span aria-hidden="true">*</span><span className="sr-only"> (from {payWhen(pay)})</span></>;
  switch (pay.kind) {
    case "none": return <span className="word">No report</span>;
    case "missing": return <span className="word">Not reported</span>;
    case "pays": case "fees": return <><span className="word">Pays </span>{money(Math.abs(pay.v ?? 0))}{late}</>;
    default: return <><span className="k" aria-hidden="true">Paid </span>{money(pay.v ?? 0)}{late}</>;
  }
}

function Table({ d, v, firm, month }: { d: Data; v: Group; firm: Firm; month: string }) {
  const all = v.places.length;
  // the brokers, plus this firm in its place when it is a clearing firm (shown, not ranked)
  const rows: Row[] = v.places.map((p) => ({
    id: p.m.id, slug: p.m.f.slug, short: p.m.f.short, self: p.m.id === firm.id, rank: p.rank, cost: p.m.cost10k!,
    last: v.last ? v.last.get(p.m.id) ?? null : undefined, pay: p.m.id === firm.id ? v.pay : payment(d, p.m, v.sp),
  }));
  if (!v.me && v.m.cost10k != null) {
    const at = rows.findIndex((r) => r.cost > v.m.cost10k!);
    rows.splice(at < 0 ? rows.length : at, 0, { id: firm.id, slug: firm.slug, short: firm.short, self: true, rank: null, cost: v.m.cost10k, last: v.last ? null : undefined, pay: v.pay });
  }
  const i = Math.max(0, rows.findIndex((r) => r.self));
  const start = Math.max(0, Math.min(i - NEAR, rows.length - (2 * NEAR + 1))), end = Math.min(rows.length, start + 2 * NEAR + 1);
  const near = (k: number) => k >= start && k < end;
  const ranked = rows.slice(start, end).filter((r) => r.rank != null);
  const span = ranked.length ? `, showing ${ordinal(ranked[0].rank!)} to ${ordinal(ranked[ranked.length - 1].rank!)} of ${all}` : "";

  // footnotes, each shown with the neighbourhood only when a row there needs it
  const noReport = rows.filter((r) => r.pay.kind === "none"), late = rows.filter((r) => r.pay.fallback), missing = rows.filter((r) => r.pay.kind === "missing");
  const nearNeeds = (list: Row[]) => list.some((r) => near(rows.indexOf(r)));
  const lateQ = late[0]?.pay.quarter;

  return (
    <div className="bp-tbl" data-g={v.g}>
      <table role="table">
        <caption className="sr-only">
          Brokers by price above the fair price per $10,000 traded, {v.name}, {month}<span className="bp-cap-near">{span}</span>
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col" className="c-rk">Rank</th>
            <th role="columnheader" scope="col" className="c-nm">Broker</th>
            <th role="columnheader" scope="col" className="c-pr">Above fair price</th>
            {v.last && <th role="columnheader" scope="col" className="c-lm">Last month</th>}
            <th role="columnheader" scope="col" className="c-pd">Broker is paid</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((r, k) => (
            <tr key={r.id} role="row" data-id={r.id} className={[r.self ? "you" : "", near(k) ? "" : "far"].filter(Boolean).join(" ") || undefined}>
              <td role="cell" className="c-rk">{r.rank ?? <><span aria-hidden="true">–</span><span className="sr-only">not ranked, a clearing firm</span></>}</td>
              <th role="rowheader" scope="row" className="c-nm">
                {r.self ? <>{r.short}<span className="sr-only"> (this page)</span></> : <a href={href(brokerPath(r.slug))}>{r.short}</a>}
              </th>
              <td role="cell" className="c-pr">{money(r.cost)}</td>
              {v.last && (
                <td role="cell" className="c-lm">
                  <span className="k" aria-hidden="true">Last month </span>
                  {r.last ? `${r.last.tied ? "tied " : ""}${ordinal(r.last.rank)}`
                    : r.rank == null ? <><span aria-hidden="true">–</span><span className="sr-only">not ranked</span></> : "not listed"}
                </td>
              )}
              <td role="cell" className="c-pd"><PayCell pay={r.pay} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {noReport.length > 0 && (
        <p className={`bp-fn${nearNeeds(noReport) ? "" : " far"}`}>No report: files no payment report of its own (another firm routes its orders).</p>
      )}
      {late.length > 0 && lateQ && (
        <p className={`bp-fn${nearNeeds(late) ? "" : " far"}`}>
          * From {quarterLong(lateQ)}, the latest {andList(late.map((r) => r.short))} {late.length > 1 ? "have" : "has"} filed.
        </p>
      )}
      {missing.length > 0 && (
        <p className={`bp-fn${nearNeeds(missing) ? "" : " far"}`}>Not reported: not in this quarter's payment report for these orders.</p>
      )}
    </div>
  );
}

export function WhereSits({ d, firm, views, all, setAll }: { d: Data; firm: Firm; views: Group[]; all: boolean; setAll: (v: boolean) => void }) {
  const month = monthLong(d.meta.month);
  const more = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    setAll(!all);
    // "Show fewer" shortens the card under a reader who scrolled down it (a phone): bring the button back into view
    if (all) requestAnimationFrame(() => more.current?.scrollIntoView({ block: "nearest" }));
  };
  return (
    <section className={`card bp-where${all ? " all" : ""}`} id="where" aria-labelledby="where-h">
      <h2 id="where-h">Where {firm.short} sits</h2>
      <p className="bp-sub">Per $10,000 traded, cheapest first · {month}</p>
      {views.map((v) => <Table key={v.g} d={d} v={v} firm={firm} month={month} />)}
      <button ref={more} type="button" className="btn btn-ghost bp-more js-only" aria-expanded={all} aria-controls="where" onClick={toggle}>
        {/* one label span: inside the flex button, the per-group counts would otherwise sit a gap apart from "See all" */}
        <span>{all ? "Show fewer" : <>See all {views.map((v) => <span key={v.g} data-g={v.g}>{v.places.length}</span>)}</>}</span><Icon name="down" size={20} />
      </button>
    </section>
  );
}
