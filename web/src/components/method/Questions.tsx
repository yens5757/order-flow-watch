// "Common questions": plain answers for first-time visitors, each a native disclosure (it opens without a script, and
// the keyboard and screen readers know it as a button). Names and figures come from the data, so an answer stays true
// after a rebuild; a question whose answer the data can't give is left out.
import { useMemo, type ReactNode } from "react";
import { andList, cents, money, payment, placeBrokers, SP_GAP } from "../../lib/broker";
import { brokerRows, type Data, type Metric } from "../../lib/data";
import { monthLong, signed } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { median } from "../../lib/stats";
import { Card, Icon } from "../ui";
import { titleOf } from "./Contents";
import { whereHolds } from "./evidence";
import { Go } from "./Sections";

/** "from $0.09 below to $1.77 above the fair price", "from $0.03 to $1.77 above the fair price" */
function span(lo: number, hi: number): string {
  if (cents(lo) < 0) return `from ${money(-lo)} below to ${money(hi)} above the fair price`;
  return cents(lo) === 0 ? `from the fair price to ${money(hi)} above it` : `from ${money(lo)} to ${money(hi)} above the fair price`;
}

function questions(d: Data): [string, ReactNode][] {
  const month = monthLong(d.meta.month);
  const items: [string, ReactNode][] = [];
  const places = placeBrokers(d, "Y");

  // a broker page can show its price below the fair price: say what that means, and who it is this month
  const better = places.filter((p) => cents(p.m.cost10k!) < 0).map((p) => p.m.f.short);
  items.push(["What does “below the fair price” mean?", <>
    <p>
      That customers did better than the fair price on average: they paid less on buys and got more on sales.
      {better.length > 0 && <> On S&P{SP_GAP}500 stocks in {month}, {andList(better)} customers did.</>}
    </p>
  </>]);

  // what a stock trade costs in commission, against what the price costs
  const retail = d.brokers.map((b) => d.fees[b.id]).filter((f) => f?.retail);
  const known = retail.filter((f) => f.commission != null);
  const free = known.filter((f) => f.commission === 0).length;
  if (known.length && places.length > 1) {
    items.push(["Does $0 commission mean free?", <>
      <p>
        No. {free === known.length ? `All ${known.length}` : `${free} of the ${known.length}`} brokers whose commission is
        confirmed charge $0 per stock trade, yet on S&P{SP_GAP}500 stocks in {month} customers paid{" "}
        {span(places[0].m.cost10k!, places[places.length - 1].m.cost10k!)} per $10,000 traded, a cost no statement shows.
      </p>
      <p><Go to={href(pagePath("calculator"))}>Add up both for your own trades</Go></p>
    </>]);
  }

  items.push(["What is payment for order flow?", <>
    <p>
      Most brokers send your stock order to a trading firm, which handles the trade and pays the broker a fraction of a cent
      per share. Rule 606 makes those payments public. The worry is that a broker paid more lets you keep less of the spread.
    </p>
    <p><a className="ulink mx-hit" href="#evidence">What the data shows</a></p>
  </>]);

  // why the cheapest broker on the home page's ranking (S&P 500 market orders, all sizes) looks cheapest
  const rows = brokerRows(d, { sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false })
    .filter((r) => r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!);
  const best: Metric | undefined = rows[0];
  if (best) {
    const gaps = rows.filter((r) => r.gap != null).sort((a, b) => a.gap! - b.gap!);
    const gapMed = median(gaps.map((r) => r.gap!)) ?? 0;
    const payMed = median(rows.filter((r) => r.pay10k != null && r.pay10k > 0.005).map((r) => r.pay10k!)) ?? 0;
    const pts = (v: number) => `${signed(v, 1)} points`;
    // "pays its trading firm" only when a trading firm's own rate is below zero (lib/broker.ts payment)
    const paidHow = (r: Metric) => (payment(d, r, "Y").kind === "pays" ? "pays its trading firm" : "is paid nothing");
    const unpaid = gaps.filter((r) => r.pay10k != null && r.pay10k <= 0.005 && r.gap! > gapMed).sort((a, b) => b.gap! - a.gap!).slice(0, 2);
    const clientele = whereHolds(d, "clientele");
    const c = best.cost10k!;
    items.push([`Why does ${best.f.short} look cheapest?`, <>
      <p>
        {best.f.short}'s customers got the best prices on S&P{SP_GAP}500 stocks in {month},{" "}
        {cents(c) === 0 ? "the fair price" : `${money(Math.abs(c))} ${cents(c) < 0 ? "below" : "above"} the fair price`} per $10,000 traded
        {best.gap == null ? "."
          : gaps[0].id === best.id ? <>, and it leads on the same stocks and order sizes too ({pts(best.gap)} against other brokers).</>
            : <>; on the same stocks and order sizes it is at {pts(best.gap)} ({gaps[0].f.short} leads at {pts(gaps[0].gap!)}).</>}
        {best.pay10k != null && (best.pay10k <= 0.005 ? <> It {paidHow(best)} for orders.</> : best.pay10k < payMed ? <> It is also paid less than most brokers.</> : null)}
      </p>
      {(unpaid.length > 0 || clientele) && (
        <p>
          {unpaid.length > 0 && <>
            Low payment alone doesn't explain it: {andList(unpaid.map((r) => `${r.f.short} ${paidHow(r)}`))}, yet{" "}
            {unpaid.length > 1 ? "both get" : "it gets"} worse prices than most on the same stocks and order sizes
            ({unpaid.map((r) => `${r.f.short} ${pts(r.gap!)}`).join(", ")}).{" "}
          </>}
          {clientele && <>The clearest pattern is who the customers are: brokers whose customers place bigger orders get better prices, even at the same order size.</>}
        </p>
      )}
    </>]);
  }

  items.push(["Which broker is best?", <>
    <p>
      It depends on how you trade. With a few trades a year, interest on idle cash or a transfer fee can matter more than the
      price, and options aren't in the price reports at all.
    </p>
    <p>
      <Go to={href(pagePath("calculator"))}>Put in your own habits</Go> (an estimate from averages, not a bill), then{" "}
      <Go to={href(pagePath("compare"))}>compare two brokers</Go>.
    </p>
  </>]);

  // registration: the account's broker-dealer (fees.csv) first, as the broker pages do
  const n = d.brokers.length;
  const matched = d.brokers.filter((b) => d.fees[b.id]?.crd ?? b.crd).length;
  items.push(["Is my broker registered?", <>
    <p>
      {matched === n ? `All ${n}` : `${matched} of the ${n}`} brokers here are matched to their FINRA BrokerCheck record.
      Each broker's page links it and says whether the firm is a SIPC member. SIPC protects up to $500,000 if a firm fails;
      it doesn't cover a poor price.
    </p>
    <p><Go to={href(pagePath("brokers"))}>Find your broker</Go></p>
  </>]);

  items.push(["Who pays for this site?", <>
    <p>
      Nobody. There are no ads, no affiliate links and no money from brokers, so no broker can pay for a better place.
      Every number comes from the reports brokers must file by law, read the same way for every broker, and the site
      checks for new reports every week.
    </p>
  </>]);
  return items;
}

export function Questions({ d }: { d: Data }) {
  const items = useMemo(() => questions(d), [d]);
  return (
    <Card id="questions" title={titleOf("questions")}>
      <div className="mx-faq">
        {items.map(([q, a]) => (
          <details key={q}>
            <summary><span className="mx-q">{q}</span><Icon name="down" size={20} /></summary>
            <div className="mx-a">{a}</div>
          </details>
        ))}
      </div>
    </Card>
  );
}
