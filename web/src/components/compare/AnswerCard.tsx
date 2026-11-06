// The answer, in the broker page's pattern: how much less one broker's customers paid above the fair price per $10,000
// traded (the one big figure), each broker's own figure and rank, both of them on the neutral scale among every broker,
// and one generated sentence on the two measures (on average, and on the same stocks and order sizes: pair.ts
// pairSentence). What each is paid and the fees have cards of their own, so the card doesn't restate them; its ruled
// foot says what it isn't, in one line. "Show as a table" under the scale lists every broker it places, the two compared
// on Here-tinted rows.
import { useRef } from "react";
import { money, ON_AVERAGE, rankWords, scaleOf, type Place } from "../../lib/broker";
import type { Data, Filters, Firm, Metric } from "../../lib/data";
import { FAIR_COL, fairText } from "../../lib/metrics";
import { brokerPath, href, pagePath } from "../../lib/routes";
import { Scale } from "../broker/Scale";
import { FairCell } from "../broker/WhereSits";
import { Info, TableToggle, useSideScroll } from "../ui";
import { capital, gapMoney, gapOf, noPrices, ordersWord, pairSentence, sideOf, stocksWord } from "./pair";

/** A no-break space: "of 25" and "on average" stay whole at a line end. */
const NB = " ";

function RankTable({ places, A, B, caption }: { places: Place[]; A: Firm; B: Firm; caption: string }) {
  const ours = (id: string) => id === A.id || id === B.id;
  const box = useRef<HTMLDivElement>(null);
  const { over } = useSideScroll(box);
  return (
    <TableToggle caption={caption} className="cmp-rank">
      {/* focusable only when it scrolls, so a keyboard can scroll it */}
      <div ref={box} className="tbox" tabIndex={over ? 0 : undefined} role={over ? "region" : undefined}
        aria-label={over ? `${caption}, scrolls sideways` : undefined}>
        <table className="tbl">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr><th scope="col">Rank</th><th scope="col">Broker</th><th scope="col" className="num">{FAIR_COL}</th></tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <tr key={p.m.id} className={ours(p.m.id) ? "here" : undefined}>
                <td>{p.rank}</td>
                <th scope="row">
                  {ours(p.m.id)
                    ? <>{p.m.f.short}<span className="sr-only"> (compared here)</span></>
                    : <a href={href(brokerPath(p.m.f.slug))}>{p.m.f.short}</a>}
                </th>
                <td className="num"><FairCell v={p.m.cost10k!} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableToggle>
  );
}

export function AnswerCard({ d, f, A, B, rA, rB, places, monthName }: {
  d: Data; f: Filters; A: Firm; B: Firm; rA: Metric; rB: Metric; places: Place[]; monthName: string;
}) {
  const g = gapOf(A, B, rA, rB);
  const say = pairSentence(f, A, B, rA, rB);
  const pairs: [Firm, Metric][] = [[A, rA], [B, rB]];
  // each rank names its basis, as on the broker page ("10th cheapest of 25 on average"); "of 25" and "on average" are held
  // together, so a narrow row breaks between the two, never leaving "25" alone on a line
  const rank = (F: Firm) => {
    const p = places.find((x) => x.m.id === F.id);
    if (!p) return F.type === "clearing_firm" ? "Not ranked: a clearing firm" : null;
    const words = capital(rankWords(places, p)).replace(/ of (\d+)$/, ` of${NB}$1`);
    return places.length > 1 ? `${words} ${ON_AVERAGE.replace(/ /g, NB)}` : words;
  };
  const marks = pairs.filter(([, r]) => r.cost10k != null).map(([F, r]) => ({ name: F.short, v: r.cost10k! }));
  const scale = marks.length && places.length ? scaleOf(places.map((p) => ({ name: p.m.f.short, v: p.m.cost10k! })), null, marks) : null;
  const orders = ordersWord(f.ot);
  // the figure's unit in words, beside it: who is cheaper, or how close the two are
  const unit = g.c == null ? null : g.cheap ? `cheaper at ${g.cheap.short}` : g.c === 0 ? "apart: the same price" : "apart: about the same";
  const fair = `The fair price is the midpoint of the best buy and sell quotes when the order arrived. From each broker's SEC Rule 605 report: ${orders} under $200,000, ${monthName}.`;

  return (
    <section className="card cmp-answer" aria-labelledby="cmp-answer-h">
      <h2 id="cmp-answer-h" className="sr-only">The short answer</h2>
      {g.c != null && unit ? (
        <div className="cmp-fig">
          <p className="cmp-amt">{gapMoney(g.c)}</p>
          <p className="cmp-per">
            {unit}<br />per $10,000 traded{" "}
            <Info topic="the fair price">{fair}</Info>
          </p>
        </div>
      ) : (
        <p className="cmp-lead">{noPrices(d, pairs.filter(([, r]) => r.cost10k == null).map(([F]) => F), f.month, monthName)}</p>
      )}

      <dl className="cmp-rows cmp-places">
        {pairs.map(([F, r]) => (
          <div key={F.id}>
            <dt>{F.short}{r.cost10k != null && rank(F) && <small>{rank(F)}</small>}</dt>
            {r.cost10k != null
              ? <dd>{money(Math.abs(r.cost10k))}<small>{sideOf(r.cost10k)}</small></dd>
              : <dd className="unknown">No price</dd>}
          </div>
        ))}
      </dl>

      {/* the ends in words too: "Fidelity $0.09 below", never "−$0.09" */}
      {scale && <Scale sets={[{ data: scale }]} fmt={fairText} />}
      {places.length > 0 && marks.length > 0 && (
        <RankTable places={places} A={A} B={B}
          caption={`Brokers by price above the fair price per $10,000 traded, ${stocksWord(f.sp)}, ${orders}, ${monthName}`} />
      )}

      {say && <p className="cmp-say">{say}</p>}
      <div className="card-foot">
        <p>
          Not a verdict on which broker is better overall.{" "}
          <a className="cmp-a" href={href(pagePath("calculator"))}>Yearly cost calculator</a>
        </p>
      </div>
    </section>
  );
}
