// What a typical year of trading costs at this broker: trade prices plus commissions at one stated habit (lib/broker.ts
// HABIT), "at least" when a part is missing, ranked only among the brokers whose commission is confirmed (all the habit
// needs besides prices), and a "Change" link that opens the calculator on exactly these inputs with this broker picked, so
// it shows the same figure. The note and "Change" sit in a ruled footer right under the card's content. The page holds
// two copies (`at`): "flow" after the price card on phones and tablets, "side" heading the right column on a desktop.
import { calcSearch } from "../../lib/cost";
import { HABIT, scaleOf, SP_GAP, yearHeadline, yearly, yearPool, yearRankWords, type Year } from "../../lib/broker";
import type { Data, Firm } from "../../lib/data";
import { num, usd2 } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { Icon } from "../ui";
import { Scale } from "./Scale";

/** The typical (median) year, rounded: it is no broker's own figure. */
const about = (v: number) => `about ${Math.abs(v) < 1 ? usd2(v) : `$${num(Math.round(v))}`}`;

export function YearCard({ d, firm, y, at }: { d: Data; firm: Firm; y: Year; at: "flow" | "side" }) {
  const hid = `year-h-${at}`, cls = `card bp-year bp-year-${at}`;
  const fee = d.fees[firm.id];
  const l = y.line;
  const habit = `for ${HABIT.trades} trades of $${num(HABIT.size)}, half S&P${SP_GAP}500 and half other stocks`;
  const calculator = href(pagePath("calculator")) + calcSearch(HABIT, firm.slug);

  if (!l) {
    return (
      <section className={cls} aria-labelledby={hid}>
        <h2 id={hid}>No yearly estimate</h2>
        <p className="bp-sub">There is no price report for {firm.short} this month to build one from.</p>
      </section>
    );
  }

  // what is missing, in plain words; a missing part is left out of the total, never counted as $0
  const noCommission = l.missing.includes("commission");
  const why: string[] = [];
  if (noCommission) {
    why.push(fee && !fee.retail ? `${firm.short} offers advisor-managed accounts only, with no public price list, so fees aren't counted.`
      : fee?.varies.includes("commission") ? `${firm.short}'s commission varies (by order size, balance or program), so it isn't counted.`
        : `${firm.short}'s commission isn't confirmed yet, so it isn't counted.`);
  }
  const noPrices = l.missing.filter((m) => /prices$/.test(m));
  if (noPrices.length) why.push(`${noPrices.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" and ")} aren't reported this month, so they aren't counted.`);
  const ranked = yearRankWords(y);
  const scale = scaleOf(y.complete.map((c) => ({ name: c.short, v: c.total })), y.rank != null ? { name: firm.short, v: l.total } : null);

  return (
    <section className={cls} aria-labelledby={hid}>
      <h2 id={hid}>{yearHeadline(l)}</h2>
      <p className="bp-sub">{habit}</p>
      <dl className="bp-rows">
        <div><dt>Trade prices</dt><dd>{yearly(l.spread)}</dd></div>
        <div>
          <dt>Commissions</dt>
          {noCommission
            ? <dd className="unknown">{fee?.varies.includes("commission") ? "Varies" : "Not confirmed"}</dd>
            : <dd>{yearly(l.commissions)}</dd>}
        </div>
      </dl>
      <p className="bp-yr-rank">{ranked ?? `Not ranked: only ${yearPool(y.complete.length)} are.`}</p>
      {scale && <Scale sets={[{ data: scale }]} fmt={usd2} typFmt={about} small />}
      {why.map((w) => <p key={w} className="bp-note">{w}</p>)}
      {l.total < 0 && !l.missing.length && <p className="bp-note">Below zero: its prices beat the fair price.</p>}
      <div className="bp-act">
        <p>Idle cash and margin aren't counted; the calculator asks.</p>
        <a className="btn btn-ghost" href={calculator}>
          <Icon name="tune" size={20} />Change<span className="sr-only"> the trades in the calculator</span>
        </a>
      </div>
    </section>
  );
}
