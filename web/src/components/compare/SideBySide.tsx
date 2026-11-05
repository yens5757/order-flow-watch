// The two brokers side by side in one real table: prices (this month, the page's stock group and order type) and fees (from
// each broker's own pages). A neutral tick and the word "better" (for screen readers) mark the better value where one is
// better; rows without a direction are context. Each measure's (i) sits in a narrow column of its own right after the
// label, so a row header is only its label. The row of names stays at the top of the window while the table scrolls past
// (the page's one sticky row); on a phone each row restacks as the label and then the two values under the names, the
// ARIA roles keeping it a table for screen readers.
import { money } from "../../lib/broker";
import type { Fee, FeeKey, Filters, Firm, Metric } from "../../lib/data";
import { dayLong, ms, pct, signed } from "../../lib/format";
import { METRICS, type MetricKey } from "../../lib/metrics";
import { brokerPath, href, pagePath } from "../../lib/routes";
import { Card, Icon, Info } from "../ui";
import { feeBlank, feeDollars, feeRate, ordersWord, roundOrder, stocksWord } from "./pair";

interface Row {
  key: string; label: string; note?: string; info?: string;
  better: "low" | "high" | null;
  v: [number | null, number | null];
  fmt: (v: number) => string;
  /** shown in place of a missing value, per side */
  blank: [string, string];
}
interface Group { title: string; sub: string; rows: Row[] }

/** Which side is better, decided on the figures as shown (two values that print the same are level). */
function winner(r: Row): 0 | 1 | null {
  const [a, b] = r.v;
  if (r.better == null || a == null || b == null || r.fmt(a) === r.fmt(b)) return null;
  return (r.better === "low" ? a < b : a > b) ? 0 : 1;
}

export function SideBySide({ f, A, B, rA, rB, feeA, feeB, monthName }: {
  f: Filters; A: Firm; B: Firm; rA: Metric; rB: Metric; feeA?: Fee; feeB?: Fee; monthName: string;
}) {
  const measured = (k: MetricKey, fmt: (v: number) => string, o: Partial<Row> = {}): Row => ({
    key: k, label: METRICS[k].label, info: METRICS[k].desc, better: METRICS[k].better,
    v: [METRICS[k].get(rA), METRICS[k].get(rB)], fmt, blank: ["No price", "No price"], ...o,
  });
  const fee = (k: FeeKey, label: string, fmt: (v: number) => string, better: "low" | "high", o: Partial<Row> = {}): Row => ({
    key: k, label, better, v: [feeA?.[k] ?? null, feeB?.[k] ?? null], fmt, blank: [feeBlank(feeA, k), feeBlank(feeB, k)], ...o,
  });
  const checked = [...new Set([feeA, feeB].filter((x): x is Fee => !!x).map((x) => x.checked).filter(Boolean))];
  const groups: Group[] = [
    {
      title: "Prices", sub: `${monthName} · ${stocksWord(f.sp)} · ${ordersWord(f.ot)}`,
      rows: [
        measured("cost10k", money),
        measured("cust", (v) => pct(v, 1)),
        measured("gap", (v) => `${signed(v, 1)} pt`, { blank: ["Not enough data", "Not enough data"], note: f.ot === "ML" ? "market orders" : undefined }),
        measured("pi", (v) => pct(v, 0)),
        measured("sz", roundOrder),
        measured("speed", ms),
      ],
    },
    {
      title: "Fees", sub: checked.length ? `Checked ${checked.map((c) => dayLong(c)).join(" and ")}` : "Not checked yet",
      rows: [
        fee("commission", METRICS.commission.label, feeDollars, "low", { info: METRICS.commission.desc }),
        fee("optionsFee", METRICS.optionsFee.label, feeDollars, "low"),
        fee("marginRate", METRICS.marginRate.label, feeRate, "low", { note: "on a $25,000 loan" }),
        fee("cashYield", METRICS.cashYield.label, feeRate, "high", { note: "standard account" }),
        fee("transferOut", "Transfer-out fee", feeDollars, "low", { note: "your whole account" }),
      ],
    },
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
          : winner(r) === i ? <span className="c-win"><Icon name="check" size={18} className="tk-a" /><span className="sr-only">better: </span>{r.fmt(v)}<Icon name="check" size={18} className="tk-b" /></span>
            : r.fmt(v)}
      </td>
    );
  };

  return (
    <Card title="Side by side" className="cmp-sbs"
      foot={<>
        <p><span className="sr-only">A tick</span><Icon name="check" size={16} className="cmp-tick" /> marks the better value; rows without one are context, not a score.</p>
        <p>
          Prices from each broker's SEC Rule 605 report for {monthName}, orders under $200,000. Fees from each broker's own
          pages; the sources are on its page.{" "}
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
            {g.rows.map((r) => (
              <tr key={r.key} role="row">
                <th role="rowheader" scope="row" className="c-lab">{r.label}{r.note && <small>{r.note}</small>}</th>
                <td role="cell" className="c-i">{r.info && <Info topic={r.label}>{r.info}</Info>}</td>
                {cell(r, 0)}{cell(r, 1)}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </Card>
  );
}
