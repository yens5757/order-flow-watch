// The reading column of "How we measure": one card per question a visitor brings, in the order the contents list them,
// each kept to what a first-time reader needs (the owner's rule: few words; detail one press away). Every month,
// quarter, count, name and figure is read from site.json, so the words stay right after each monthly and quarterly
// report; the only fixed numbers are the illustration's.
import type { ReactNode } from "react";
import { andList, cents, money, placeBrokers, SP_GAP } from "../../lib/broker";
import { files606, type Data } from "../../lib/data";
import { dayLong, DOT, monthLong, pct, quarterLong, signed, usd2 } from "../../lib/format";
import { METRICS } from "../../lib/metrics";
import { brokerPath, href, pagePath } from "../../lib/routes";
import { Card, Icon } from "../ui";
import { titleOf } from "./Contents";
import { Spread } from "./Spread";

const RULE_605 = "https://www.ecfr.gov/current/title-17/section-242.605";
const RULE_606 = "https://www.ecfr.gov/current/title-17/section-242.606";
const FINRA_605 = "https://www.finra.org/filing-reporting/regulation-nms/sec-rule-605-reports";
/** Brokers that publish their reports on their own sites, not yet read here: named only while they are missing. */
const NOT_YET: [string, string][] = [["TRAD", "TradeStation"], ["TKNG", "Ally"], ["FFSI", "Firstrade"]];

/** A source outside the site: teal with the external-link icon (DESIGN.md, Links), its hit area 44px tall. */
const Src = ({ to, children }: { to: string; children: ReactNode }) => (
  <a className="mx-src" href={to}>{children}<Icon name="ext" size={14} /></a>
);
/** A link to another page of the site, in running text: ink, underlined in teal. */
export const Go = ({ to, children }: { to: string; children: ReactNode }) => <a className="ulink mx-hit" href={to}>{children}</a>;

/** The quarter a late filer's payment comes from: the one before the latest (metric() in lib/data.ts). */
const prevQuarter = (d: Data): string | null => d.meta.quarters[d.meta.quarters.indexOf(d.meta.quarter) - 1] ?? null;
/** Brokers that haven't filed the latest payment report yet, by name. */
const lateFilers = (d: Data) => (d.meta.payFallback ?? []).map((id) => d.byId[id]?.short ?? id);
const many = (xs: unknown[], one: string, more: string) => (xs.length > 1 ? more : one);

/** The answer to "how do you get these numbers?": three sources, each with the period it covers. */
export function Sources({ d }: { d: Data }) {
  const late = lateFilers(d), prev = prevQuarter(d);
  const checked = d.meta.feesChecked;
  return (
    <Card id="sources" title={titleOf("sources")} sub="Three public sources, read the same way for every broker."
      foot={<>Any firm's price reports: <Src to={FINRA_605}>FINRA's list</Src></>}>
      <dl className="mx-rows mx-srcs">
        <div>
          <dt>Prices<small><Src to={RULE_605}>SEC Rule 605</Src> reports, monthly</small></dt>
          <dd>{monthLong(d.meta.month)}</dd>
        </div>
        <div>
          <dt>
            What brokers are paid<small><Src to={RULE_606}>SEC Rule 606</Src> reports, quarterly</small>
            {late.length > 0 && prev && <small>{andList(late)}: {quarterLong(prev)}, the latest {many(late, "it has", "they have")} filed</small>}
          </dt>
          <dd>{quarterLong(d.meta.quarter)}</dd>
        </div>
        <div>
          <dt>Fees<small>Each broker's own price list, last checked</small></dt>
          <dd>{checked ? dayLong(checked) : "Not recorded"}</dd>
        </div>
      </dl>
    </Card>
  );
}

/** What the figure on every broker page means: the worked example drawn on the scale, then, one press away, one real
 *  broker's report turned into the same dollars (the middle broker on S&P 500 stocks, so no broker is singled out). */
export function FairPrice({ d }: { d: Data }) {
  const month = monthLong(d.meta.month);
  const places = placeBrokers(d, "Y");
  const n = places.length;
  const mid = n ? places[Math.floor((n - 1) / 2)].m : null;
  return (
    <Card id="fair-price" title={titleOf("fair-price")}>
      <div className="mx-prose">
        <p>
          Halfway between the best price to buy and the best price to sell is the fair price. What your trade pays past it is
          a cost no statement shows.
        </p>
      </div>
      <Spread />
      <div className="mx-fig">
        <p className="mx-amt">$1.00</p>
        <p className="mx-per">above the fair price<br />per $10,000 traded</p>
      </div>
      <div className="mx-prose mx-after">
        <p>
          100 shares at $100.01 cost $1 more than at the fair price. That cent is a third of the way to the best price to buy:
          the trade paid 33% of the spread. A sale at $99.99 costs the same.
        </p>
      </div>
      {mid && mid.cust != null && mid.qsBps != null && mid.cost10k != null && (
        <details className="mx-more-d">
          <summary><span>How a report becomes dollars</span><Icon name="down" size={20} /></summary>
          <div className="mx-prose">
            <p>
              Each monthly report gives the share of the spread customers paid and how wide the spreads were. For{" "}
              <Go to={href(brokerPath(mid.f.slug))}>{mid.f.short}</Go>, {n % 2 ? "the middle" : "near the middle"} of {n} brokers,
              on S&P{SP_GAP}500 stocks in {month}:
            </p>
          </div>
          <dl className="mx-rows mx-calc">
            <div><dt>Fair price to the best price, per $10,000</dt><dd>{usd2(mid.qsBps / 2)}</dd></div>
            <div><dt>Share of that its customers paid<small>“{METRICS.cust.short}” in the explorer</small></dt><dd>{pct(mid.cust, 1)}</dd></div>
            <div>
              <dt>{cents(mid.cost10k) < 0 ? "Below" : "Above"} the fair price, per $10,000 traded<small>“{METRICS.cost10k.label}” in the explorer</small></dt>
              <dd>{money(Math.abs(mid.cost10k))}</dd>
            </div>
          </dl>
        </details>
      )}
    </Card>
  );
}

/** Averages flatter some brokers, so each is also compared on the same stocks and order sizes (same_stock.py). */
export function SameStocks({ d }: { d: Data }) {
  const sp = d.sameStock.brokers.filter((x) => x.sp === "Y" && x.cells >= 100).sort((a, b) => a.gap - b.gap);
  const name = (id: string) => d.byId[id]?.short ?? id;
  return (
    <Card id="same-stocks" title={titleOf("same-stocks")} sub={`Market orders under $200,000${DOT}${monthLong(d.meta.detailMonth)}`}>
      <div className="mx-prose">
        <p>
          Averages flatter brokers whose customers trade big, busy stocks. So each broker is also compared with the others on
          the same stocks and order sizes, in points of the spread: below zero, its customers paid less.
          {sp.length > 1 && <> On S&P{SP_GAP}500 stocks the gap runs from {name(sp[0].id)} at {signed(sp[0].gap, 1)} to {name(sp[sp.length - 1].id)} at {signed(sp[sp.length - 1].gap, 1)}.</>}
        </p>
        {/* the answer card's sentence rule (lib/broker.ts gradeOf, priceSentence): words follow the ranks, never a margin */}
        <p>
          Broker pages rank this gap beside the average price. Their sentence goes by thirds of the brokers: the best third
          is “better than most”, the middle third “near the middle”, the worst third “worse than most”.
        </p>
      </div>
      <a className="go mx-go" href={`${href(pagePath("brokers"))}?m=gap`}>Every broker's gap<Icon name="arrow" size={20} /></a>
    </Card>
  );
}

/** What trading firms pay brokers for their customers' orders (Rule 606), and every gap in those reports, named. */
export function Payments({ d }: { d: Data }) {
  const q = quarterLong(d.meta.quarter), prev = prevQuarter(d);
  const late = lateFilers(d);
  const none = d.brokers.filter((b) => !files606(d, b.crd)).map((b) => b.short);
  const partial = [d.byId.SOFI && "SoFi's report covers only part of its orders", d.byId.FUTM && "moomoo's is filed by Futu Clearing"].filter(Boolean);
  return (
    <Card id="payments" title={titleOf("payments")} sub={`Market orders${DOT}${q}`}>
      <div className="mx-prose">
        <p>
          Brokers report each quarter what trading firms paid for their customers' orders. Weighted by where the orders went,
          that becomes dollars per $10,000 of orders.
        </p>
        <p>
          As percentages the two sides don't compare (one counts the whole spread, the other half of it), so compare them in
          dollars.
        </p>
      </div>
      <ul className="mx-list">
        {late.length > 0 && prev && (
          <li>{andList(late)} {many(late, "hasn't", "haven't")} filed for {q} yet: {many(late, "its", "their")} {quarterLong(prev)} report is used.</li>
        )}
        {none.length > 0 && (
          <li>{andList(none)} {many(none, "files", "file")} no payment report of {many(none, "its", "their")} own (another firm routes {many(none, "its", "their")} orders).</li>
        )}
        {partial.length > 0 && <li>{partial.join("; ")}.</li>}
      </ul>
    </Card>
  );
}

/** Where the fees come from, and the three words that stand in for a fee nobody could confirm. */
export function Fees({ d }: { d: Data }) {
  const checked = d.meta.feesChecked;
  return (
    <Card id="fees" title={titleOf("fees")}>
      <div className="mx-prose">
        <p>
          From each broker's own price list, {checked ? <>checked {dayLong(checked, "long")}</> : "on a date not recorded"} and
          every quarter; where its pages couldn't be read, from review sites, as its page says. Promotions and paid tiers are
          left out.
        </p>
      </div>
      <dl className="mx-terms">
        <div><dt>Not confirmed</dt><dd>Not found on its own pages, and never counted as $0.</dd></div>
        <div><dt>Not offered</dt><dd>The broker doesn't offer it.</dd></div>
        <div><dt>Varies</dt><dd>It depends on the balance or a program.</dd></div>
      </dl>
    </Card>
  );
}

/** Every limit of the data, stated plainly, with its size where the data has one. */
export function Limits({ d }: { d: Data }) {
  const q = d.meta.quarter;
  const usd = d.usd.filter((u) => u.q === q);
  const paid = usd.reduce((a, u) => a + Math.max(0, u.usd), 0);
  const options = usd.filter((u) => u.seg === "Options").reduce((a, u) => a + Math.max(0, u.usd), 0);
  // brokers with both a payment and a price report: the payment test's sample
  const both = d.evidence.find((e) => /^Paid more → customers pay more of the spread/.test(e.claim))?.n ?? null;
  const missing = NOT_YET.filter(([id]) => !d.byId[id]).map(([, name]) => name);
  return (
    <Card id="limits" title={titleOf("limits")}>
      <dl className="mx-terms">
        <div>
          <dt>Options</dt>
          <dd>Price reports cover stocks only, yet {paid > 0 ? `${Math.round((100 * options) / paid)}%` : "most"} of what these brokers were paid in {quarterLong(q)} was for options.</dd>
        </div>
        <div><dt>Orders that wait</dt><dd>Only orders that trade at once, under $200,000, count; a waiting limit order doesn't.</dd></div>
        <div><dt>Your own trades</dt><dd>Every figure is a month's average; yours can do better or worse. Taxes aren't counted.</dd></div>
        <div><dt>Few brokers</dt><dd>Only {both ?? "a few"} brokers publish both reports: small differences can't be told from chance, and a pattern doesn't prove a cause.</dd></div>
        {missing.length > 0 && <div><dt>Not covered yet</dt><dd>{andList(missing)} publish their reports on their own sites, not read here yet.</dd></div>}
      </dl>
    </Card>
  );
}
