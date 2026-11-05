// The two brokers side by side in one real table, what decides first: what a trade costs (dollars above the fair price per
// $10,000 traded, and the rank on the same stocks and order sizes, both for this month, the page's stock group and order
// type) and every fee (from each broker's own pages). The other price measures (the share of the spread, the same-stock
// gap in points, orders that beat the quoted price, typical order size, execution speed) wait behind "More measures",
// closed until asked for (open without a script). A neutral tick and the word "better" (for screen readers) mark the
// better value where one is better; rows without a direction are context. An (i) sits in a narrow column of its own right
// after the label, so a row header is only its label. The row of names stays at the top of the window while the table
// scrolls past (the page's one sticky row); on a phone each row restacks as the label and then the two values under the
// names, the ARIA roles keeping it a table for screen readers.
import { useId, useState } from "react";
import { sameStockNote, sameStockRank, sameStockWords, type SameRank } from "../../lib/broker";
import type { Data, Fee, FeeKey, Filters, Firm, Metric } from "../../lib/data";
import { dayLong, ms, pct } from "../../lib/format";
import { fairText, METRICS, type MetricKey } from "../../lib/metrics";
import { brokerPath, href, pagePath } from "../../lib/routes";
import { Card, Icon, Info } from "../ui";
import { capital, feeBlank, feeDollars, feeRate, gapWords, ordersWord, pairFilters, placesFor, roundOrder, SAME_LEVEL, stocksWord } from "./pair";

interface Row {
  key: string; label: string; note?: string; info?: string;
  /** what the (i) is named after, "About <topic>": the label unless it reads badly mid-sentence */
  topic?: string;
  better: "low" | "high" | null;
  /** the figures compared, per side */
  v: [number | null, number | null];
  /** a figure as shown, per side */
  fmt: (v: number, i: 0 | 1) => string;
  /** shown in place of a missing value, per side */
  blank: [string, string];
}
interface Group { title: string; sub: string; rows: Row[] }

/** Which side is better, decided on the figures as shown (two values that print the same are level). */
function winner(r: Row): 0 | 1 | null {
  const [a, b] = r.v;
  if (r.better == null || a == null || b == null || r.fmt(a, 0) === r.fmt(b, 1)) return null;
  return (r.better === "low" ? a < b : a > b) ? 0 : 1;
}

/** `d` gives the rank on the same stocks and order sizes: every broker's figure is needed to rank two. */
export function SideBySide({ d, f, A, B, rA, rB, feeA, feeB, monthName }: {
  d: Data; f: Filters; A: Firm; B: Firm; rA: Metric; rB: Metric; feeA?: Fee; feeB?: Fee; monthName: string;
}) {
  const [open, setOpen] = useState(false);
  const moreId = useId();
  const measured = (k: MetricKey, fmt: (v: number) => string, o: Partial<Row> = {}): Row => ({
    key: k, label: METRICS[k].label, info: METRICS[k].desc, better: METRICS[k].better,
    v: [METRICS[k].get(rA), METRICS[k].get(rB)], fmt, blank: ["No price", "No price"], ...o,
  });
  const fee = (k: FeeKey, label: string, fmt: (v: number) => string, better: "low" | "high", o: Partial<Row> = {}): Row => ({
    key: k, label, better, v: [feeA?.[k] ?? null, feeB?.[k] ?? null], fmt, blank: [feeBlank(feeA, k), feeBlank(feeB, k)], ...o,
  });
  const checked = [...new Set([feeA, feeB].filter((x): x is Fee => !!x).map((x) => x.checked).filter(Boolean))];
  const ml = f.ot === "ML" ? "market orders" : undefined;

  // the rank on the same stocks and order sizes, as the answer cards rank it (lib/broker.ts): market orders of every size
  // under $200,000, whatever order type the page shows
  const same: [SameRank | null, SameRank | null] = [sameStockRank(d, A.id, f.sp), sameStockRank(d, B.id, f.sp)];
  const pool = same[0] ?? same[1];
  const unranked = (F: Firm) => (F.type === "clearing_firm" ? "Not ranked" : "Not enough data");
  // two gaps within a point are "level" in the short answer above, so neither rank gets the tick then
  const level = rA.gap != null && rB.gap != null && Math.abs(rA.gap - rB.gap) < SAME_LEVEL;
  const sameRow: Row = {
    key: "same", label: "On the same stocks and order sizes", topic: "the same stocks and order sizes", note: `rank, cheapest first${ml ? ` · ${ml}` : ""}`,
    info: pool ? sameStockNote(d, pool, placesFor(d, { ...pairFilters(f), ot: "M" }).length) : undefined,
    better: level ? null : "low", v: [same[0]?.rank ?? null, same[1]?.rank ?? null], fmt: (_, i) => capital(sameStockWords(same[i]!)),
    blank: [unranked(A), unranked(B)],
  };

  const groups: Group[] = [
    {
      title: "Prices", sub: `${monthName} · ${stocksWord(f.sp)} · ${ordersWord(f.ot)}`,
      rows: [
        // no minus sign: a price below the fair price says "below" (lib/metrics.ts fairText)
        measured("cost10k", fairText, { note: "above the fair price", info: undefined }),
        sameRow,
      ],
    },
    {
      title: "Fees", sub: checked.length ? `Checked ${checked.map((c) => dayLong(c)).join(" and ")}` : "Not checked yet",
      rows: [
        fee("commission", METRICS.commission.label, feeDollars, "low"),
        fee("optionsFee", METRICS.optionsFee.label, feeDollars, "low"),
        fee("marginRate", METRICS.marginRate.label, feeRate, "low", { note: "on a $25,000 loan" }),
        fee("cashYield", METRICS.cashYield.label, feeRate, "high", { note: "standard account" }),
        fee("transferOut", "Transfer-out fee", feeDollars, "low", { note: "moving your whole account out" }),
      ],
    },
  ];
  // context and the analyst's units, one press away: the same prices as a share of the spread and in points of it, and
  // three figures with no better direction (the speed row has no tick: slower orders got better prices)
  const more: Row[] = [
    measured("cust", (v) => pct(v, 1)),
    measured("gap", gapWords, { blank: ["Not enough data", "Not enough data"], note: ml, ...(level ? { better: null } : {}) }),
    measured("pi", (v) => pct(v, 0)),
    measured("sz", roundOrder),
    measured("speed", ms),
  ];

  const sides: [Firm, Fee | undefined][] = [[A, feeA], [B, feeB]];
  const notes = sides.flatMap(([F, x]) =>
    !x ? [`${F.short} has no fee list here yet.`]
      : !x.retail ? [`${F.short} offers advisor-managed accounts only, with no public price list.`]
        : x.confidence === "medium" ? [`${F.short}'s fees are partly confirmed on its own pages.`]
          : x.confidence === "low" ? [`${F.short}'s fees are not yet confirmed on its own pages.`] : []);

  const cell = (r: Row, i: 0 | 1) => {
    const v = r.v[i];
    return (
      <td key={i} role="cell" className="c-v">
        {v == null ? <span className="c-na">{r.blank[i]}</span>
          // the tick leads the figure on a wide screen and follows it on a phone (where values line up on the left)
          : winner(r) === i ? <span className="c-win"><Icon name="check" size={18} className="tk-a" /><span className="sr-only">better: </span>{r.fmt(v, i)}<Icon name="check" size={18} className="tk-b" /></span>
            : r.fmt(v, i)}
      </td>
    );
  };
  const row = (r: Row) => (
    <tr key={r.key} role="row">
      <th role="rowheader" scope="row" className="c-lab">{r.label}{r.note && <small>{r.note}</small>}</th>
      <td role="cell" className="c-i">{r.info && <Info topic={r.topic ?? r.label}>{r.info}</Info>}</td>
      {cell(r, 0)}{cell(r, 1)}
    </tr>
  );

  return (
    <Card title="Side by side" className="cmp-sbs"
      foot={<>
        <p><span className="sr-only">A tick</span><Icon name="check" size={16} className="cmp-tick" /> marks the better value; rows without one are context, not a score.</p>
        <p>
          Prices: each broker's SEC Rule 605 report, {monthName}, orders under $200,000. Fees: each broker's own pages
          (sources on its page).{" "}
          <a className="cmp-a" href={href(pagePath("how-we-measure"))}>How we measure</a>
        </p>
        {notes.map((n) => <p key={n}>{n}</p>)}
      </>}>
      <table role="table" className="cmp-tbl">
        <caption className="sr-only">{A.short} and {B.short} side by side: prices and fees</caption>
        <thead role="rowgroup">
          <tr role="row">
            <td role="cell" className="c-lab" />
            <td role="cell" className="c-i" />
            {[A, B].map((F) => (
              <th key={F.id} role="columnheader" scope="col" className="c-v">
                <a className="cmp-nm" href={href(brokerPath(F.slug))}>{F.short}</a>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.title} role="rowgroup">
            <tr role="row" className="c-grp-row">
              <th role="rowheader" scope="rowgroup" colSpan={4} className="c-grp">{g.title}<span>{g.sub}</span></th>
            </tr>
            {g.rows.map(row)}
          </tbody>
        ))}
        {/* the disclosure's button only works with a script, so without one it is hidden and the rows below stay shown */}
        <tbody role="rowgroup" className="c-tog js-only">
          <tr role="row">
            <td role="cell" colSpan={4}>
              <button type="button" className="cmp-more-btn" aria-expanded={open} aria-controls={moreId} onClick={() => setOpen(!open)}>
                <span>{open ? "Fewer measures" : "More measures"}</span><Icon name="down" size={20} />
              </button>
            </td>
          </tr>
        </tbody>
        <tbody role="rowgroup" id={moreId} className={`c-more${open ? " open" : ""}`}>
          {more.map(row)}
        </tbody>
      </table>
    </Card>
  );
}
