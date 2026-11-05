// Every broker by what its customers paid above the fair price per $10,000 traded, cheapest first, as a real table in the
// broker page's look (broker.css: bp-tbl), the visitor's broker on the Here row and what each broker is paid beside its
// price. From 1024px the whole table stands beside the answer; below that it opens on the picked broker and three either
// side, and "See all" shows the rest in place (home.css; without a script every row shows). Each name links to its page.
// Rows carry their broker's id (data-id), so the page can glide them to their new places when the stock switch flips.
import { useRef } from "react";
import { andList, money, payment, payWhen, type Group, type Pay } from "../../lib/broker";
import type { Data } from "../../lib/data";
import { monthLong, ordinal, quarterLong } from "../../lib/format";
import { brokerPath, href } from "../../lib/routes";
import { Card, Icon } from "../ui";

interface Row { id: string; slug: string; short: string; self: boolean; rank: number; cost: number; pay: Pay }

const NEAR = 3; // rows either side of the picked broker below 1024px

/** What the broker is paid, as on the broker page: "$0.83", "$0.00", and words only where a number would mislead ("Pays
 *  $0.07" rather than a minus sign, "No report"). The restacked phone row names the column ("Paid"), its heading being
 *  out of sight. */
function PayCell({ pay }: { pay: Pay }) {
  const late = pay.fallback && <><span aria-hidden="true">*</span><span className="sr-only"> (from {payWhen(pay)})</span></>;
  switch (pay.kind) {
    case "none": return <span className="word">No report</span>;
    case "missing": return <span className="word">Not reported</span>;
    case "pays": case "fees": return <><span className="word">Pays </span>{money(Math.abs(pay.v ?? 0))}{late}</>;
    default: return <><span className="k" aria-hidden="true">Paid </span>{money(pay.v ?? 0)}{late}</>;
  }
}

/** The page holds two copies (`at`) and CSS shows one, as the broker page does with its yearly card: "flow" after the
 *  yearly line below 1024px, "side" alone in the right column from there. The hidden copy is display:none, so it is
 *  neither read nor reached by Tab, and the page's order is the reading order at every width. */
export function Ranking({ d, g, all, setAll, at }: { d: Data; g: Group; all: boolean; setAll: (v: boolean) => void; at: "flow" | "side" }) {
  const month = monthLong(d.meta.month);
  const more = useRef<HTMLButtonElement>(null);
  const rows: Row[] = g.places.map((p) => ({
    id: p.m.id, slug: p.m.f.slug, short: p.m.f.short, self: p.m.id === g.m.id, rank: p.rank, cost: p.m.cost10k!,
    pay: p.m.id === g.m.id ? g.pay : payment(d, p.m, g.sp),
  }));
  const n = rows.length;
  // the neighbourhood: the picked broker and three either side (the first seven when it has no price here)
  const i = Math.max(0, rows.findIndex((r) => r.self));
  const start = Math.max(0, Math.min(i - NEAR, n - (2 * NEAR + 1))), end = Math.min(n, start + 2 * NEAR + 1);
  const near = (k: number) => k >= start && k < end;
  const span = n ? `, showing ${ordinal(rows[start].rank)} to ${ordinal(rows[end - 1].rank)} of ${n}` : "";

  // footnotes, each kept with the neighbourhood only when a row shown there needs it
  const noReport = rows.filter((r) => r.pay.kind === "none"), late = rows.filter((r) => r.pay.fallback), missing = rows.filter((r) => r.pay.kind === "missing");
  const far = (list: Row[]) => (list.some((r) => near(rows.indexOf(r))) ? "bp-fn" : "bp-fn far");
  const lateQ = late[0]?.pay.quarter;

  const toggle = () => {
    setAll(!all);
    // "Show fewer" shortens the card under a reader who scrolled down it: bring the button back into view
    if (all) requestAnimationFrame(() => more.current?.scrollIntoView({ block: "nearest" }));
  };

  return (
    <Card id={at === "flow" ? "rank" : undefined} className={`hm-rank hm-rank-${at}${all ? " all" : ""}`} title={`All ${n} brokers, cheapest first`}
      sub={<>Per $10,000 traded · {g.name}</>}>
      <div className="bp-tbl">
        <table role="table">
          <caption className="sr-only">
            Brokers by price above the fair price per $10,000 traded, {g.name}, {month}<span className="hm-cap-near">{span}</span>
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th role="columnheader" scope="col" className="c-rk">Rank</th>
              <th role="columnheader" scope="col" className="c-nm">Broker</th>
              <th role="columnheader" scope="col" className="c-pr">Above fair price</th>
              <th role="columnheader" scope="col" className="c-pd">Broker is paid</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((r, k) => (
              <tr key={r.id} role="row" data-id={r.id} className={[r.self ? "you" : "", near(k) ? "" : "far"].filter(Boolean).join(" ") || undefined}>
                <td role="cell" className="c-rk">{r.rank}</td>
                <th role="rowheader" scope="row" className="c-nm">
                  <a href={href(brokerPath(r.slug))}>{r.short}{r.self && <span className="sr-only"> (your broker)</span>}</a>
                </th>
                <td role="cell" className="c-pr">{money(r.cost)}</td>
                <td role="cell" className="c-pd"><PayCell pay={r.pay} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {noReport.length > 0 && <p className={far(noReport)}>No report: files no payment report of its own (another firm routes its orders).</p>}
      {late.length > 0 && lateQ && (
        <p className={far(late)}>* From {quarterLong(lateQ)}, the latest {andList(late.map((r) => r.short))} {late.length > 1 ? "have" : "has"} filed.</p>
      )}
      {missing.length > 0 && <p className={far(missing)}>Not reported: not in this quarter's payment report for these orders.</p>}
      {at === "flow" && (
        <button ref={more} type="button" className="btn btn-ghost hm-more js-only" aria-expanded={all} aria-controls="rank" onClick={toggle}>
          <span>{all ? "Show fewer" : `See all ${n}`}</span><Icon name="down" size={20} />
        </button>
      )}
    </Card>
  );
}
