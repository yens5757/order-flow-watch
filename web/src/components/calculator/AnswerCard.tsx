// The answer: what a year of the visitor's own trading costs at their broker, the amount at the Display size inside the
// broker pages' own words ("About $9 a year"), what it is for, one row per part with the rate behind it, its rank among
// the brokers whose every needed fee is confirmed, the gap to the cheapest and the neutral scale. All of it generated
// from the inputs in use (model.ts), so a figure here is always the one the arithmetic used.
import { scaleOf } from "../../lib/broker";
import { yearSaid } from "../../lib/cash";
import type { CostInputs, CostLine } from "../../lib/cost";
import type { Data } from "../../lib/data";
import { monthLong } from "../../lib/format";
import { Scale } from "../broker/Scale";
import { Icon, Info, Select } from "../ui";
import { about, gapLine, headline, partRows, pool, poolClause, rankWords, scopeLine, usd, whyWords, type Ranked } from "./model";

export function AnswerCard({ d, lines, ranked, me, pick, inp, onPick }: {
  d: Data; lines: CostLine[]; ranked: Ranked; me: CostLine | undefined; pick: string; inp: CostInputs; onPick: (id: string) => void;
}) {
  const month = monthLong(d.meta.month);
  const options = [...d.brokers].sort((a, b) => a.short.localeCompare(b.short)).map((f): [string, string] => [f.id, f.short]);
  const select = <div className="calc-pick"><Select label="Your broker" value={pick} onChange={onPick} options={options} /></div>;
  const short = d.byId[pick]?.short ?? "This broker";

  if (!me) {
    return (
      <section className="card calc-ans" aria-labelledby="calc-ans-h">
        {select}
        <h2 id="calc-ans-h" className="calc-none-h">No estimate for {short}</h2>
        <p className="calc-scope">There's no price report from {short} for orders of {usd(inp.size)} in {month} to build one from.</p>
      </section>
    );
  }

  const h = headline(me);
  const clause = poolClause(inp);
  const rank = rankWords(ranked, me, clause);
  const gap = gapLine(ranked, me);
  const ranked1 = ranked.ranks.has(me.id);
  const scale = ranked.complete.length >= 2
    ? scaleOf(ranked.complete.map((c) => ({ name: c.short, v: c.total })), ranked1 ? { name: me.short, v: me.total } : null)
    : null;
  const why = whyWords(d, me);

  return (
    <section className="card calc-ans" aria-labelledby="calc-ans-h">
      {select}
      <h2 id="calc-ans-h" className="calc-h">
        {h.pre && <span className="calc-w">{h.pre} </span>}<span className="calc-fig">{h.fig}</span>{h.post && <span className="calc-w"> {h.post}</span>}
      </h2>
      <p className="calc-scope">{scopeLine(inp)}</p>
      <dl className="calc-parts">
        {partRows(d, me, inp).map((r) => (
          <div key={r.key}>
            <dt>
              {r.label}
              {r.key === "spread" && (
                <Info topic="trade prices">
                  What {me.short}'s customers paid above the fair price, the midpoint of the best buy and sell quotes, on orders this
                  size: from its SEC Rule 605 report for {month}, times what you trade in a year.
                </Info>
              )}
              {r.note && <small>{r.note}</small>}
            </dt>
            <dd className={r.unknown ? "unknown" : undefined}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="calc-rank">
        <p>{rank ?? `Not ranked: only ${pool(ranked.complete.length, clause)} ${ranked.complete.length === 1 ? "is" : "are"}.`}</p>
        <a className="go" href="#breakdown">See all {lines.length}<Icon name="down" size={20} /></a>
      </div>
      {gap && <p className="calc-diff">{gap.lead}{gap.who && <> <span className="calc-nw">({gap.who})</span></>}</p>}
      {scale && <Scale sets={[{ data: scale }]} fmt={yearSaid} typFmt={about} />}
      {why.map((w) => <p key={w} className="calc-note">{w}</p>)}
    </section>
  );
}
