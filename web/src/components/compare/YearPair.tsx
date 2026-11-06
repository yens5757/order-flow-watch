// What a typical year of trading costs at each of the two: the broker pages' habit (lib/broker.ts HABIT: 24 trades of
// $2,000, half S&P 500 and half other stocks; trade prices and commissions), the difference as the heading when both years
// are complete, "at least" when a part is missing, ranked only among the brokers whose commission is confirmed, both on
// the small scale, then one priced line for the money the figures leave out (lib/cash.ts: where $1,000 of cash earns
// more and where moving the account out costs less, on the calculator's own arithmetic), and "Change" into the calculator
// on exactly these inputs. A figure below zero is said in words ("$0.22 ahead"). Like the broker page's yearly card, the
// page holds two copies (`at`): "flow" after the answer on phones and tablets, "side" in the right column on a desktop,
// under cost by order size.
import { cents, HABIT, scaleOf, SP_GAP, yearPool, yearRankWords, type Year } from "../../lib/broker";
import { cashPair, yearSaid } from "../../lib/cash";
import { calcSearch, type CostLine } from "../../lib/cost";
import type { Data, Firm } from "../../lib/data";
import { num, usd2 } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { PricedText } from "../broker/YearCard";
import { Scale } from "../broker/Scale";
import { Icon } from "../ui";

/** The part that is counted, as its row shows it, never rounded up: "At least $8.95". */
const atLeast = (l: CostLine) => `At least ${l.total <= 0 ? "$0" : l.total < 100 ? usd2(l.total) : `$${Math.floor(l.total).toLocaleString("en-US")}`}`;

/** Why a year is incomplete, in plain words; a missing part is left out of the total, never counted as $0. */
function why(d: Data, F: Firm, l: CostLine): string[] {
  const out: string[] = [];
  const fee = d.fees[F.id];
  if (l.missing.includes("commission")) {
    out.push(fee && !fee.retail ? `${F.short} offers advisor-managed accounts only, with no public price list, so its fees aren't counted.`
      : fee?.varies.includes("commission") ? `${F.short}'s commission varies (by order size, balance or program), so it isn't counted.`
        : `${F.short}'s commission isn't confirmed yet, so it isn't counted.`);
  }
  const prices = l.missing.filter((m) => /prices$/.test(m));
  if (prices.length) out.push(`${F.short}'s ${prices.join(" and ")} aren't reported this month, so they aren't counted.`);
  return out;
}

export function YearPair({ d, A, B, years, at }: { d: Data; A: Firm; B: Firm; years: [Year, Year]; at: "flow" | "side" }) {
  const hid = `cmp-year-h-${at}`;
  const pairs: [Firm, Year][] = [[A, years[0]], [B, years[1]]];
  const done = (y: Year) => y.line != null && y.line.missing.length === 0;
  const [la, lb] = [years[0].line, years[1].line];
  // the heading answers when both years are complete: "About $9 a year less at Fidelity"
  let heading = "A typical year", answer = false;
  if (la && lb && done(years[0]) && done(years[1])) {
    const c = cents(la.total) - cents(lb.total), dollars = Math.round(Math.abs(c) / 100);
    heading = dollars >= 1 ? `About $${num(dollars)} a year less at ${c > 0 ? B.short : A.short}` : "Less than $1 a year apart";
    answer = true;
  }
  const ranked = pairs.filter(([, y]) => y.rank != null && y.line);
  const pool = years[0].complete;
  const scale = ranked.length && pool.length
    ? scaleOf(pool.map((c) => ({ name: c.short, v: c.total })), null, ranked.map(([F, y]) => ({ name: F.short, v: y.line!.total })))
    : null;
  const notes = pairs.flatMap(([F, y]) => (y.line ? why(d, F, y.line) : []));
  const cash = cashPair(d, A, B);

  return (
    <section className={`card cmp-year cmp-year-${at}`} aria-labelledby={hid}>
      <h2 id={hid} className={answer ? "cmp-year-a" : undefined}>{heading}</h2>
      <p className="cmp-sub">for {HABIT.trades} trades of ${num(HABIT.size)}, half S&amp;P{SP_GAP}500 and half other stocks</p>
      <dl className="cmp-rows">
        {pairs.map(([F, y]) => (
          <div key={F.id}>
            <dt>
              {F.short}
              <small>{yearRankWords(y) ?? (y.line ? "Not ranked: part of its year is missing" : "No price report this month")}</small>
            </dt>
            {!y.line ? <dd className="unknown">No estimate</dd>
              : done(y) ? <dd>{yearSaid(y.line.total)}</dd>
                : <dd>{atLeast(y.line)}</dd>}
          </div>
        ))}
      </dl>
      {scale && <Scale sets={[{ data: scale }]} fmt={yearSaid} small />}
      {ranked.length > 0 && <p className="cmp-note">Ranked among {yearPool(pool.length)}.</p>}
      {notes.map((n) => <p key={n} className="cmp-note">{n}</p>)}
      {cash && <p className="cmp-note cmp-cash"><PricedText line={cash} nw="cmp-nw" /></p>}
      <div className="cmp-act">
        <p>Idle cash and margin aren't counted; the calculator asks.</p>
        <a className="btn btn-ghost" href={href(pagePath("calculator")) + calcSearch(HABIT, A.slug)}>
          <Icon name="tune" size={20} />Change<span className="sr-only"> the trades in the calculator</span>
        </a>
      </div>
    </section>
  );
}
