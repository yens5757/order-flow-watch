// The answer for the visitor's broker, in the broker page's own words and look (its price card: broker.css): what its
// customers paid above or below the fair price per $10,000 traded, its rank, the gap to the cheapest, the neutral scale
// with its dot and one generated sentence; then its page and a comparison. Every figure comes from lib/broker.ts (the
// broker page's Group), so the two pages never disagree. Picking another broker re-renders the card: the scale's dot
// glides to the new broker's place (scale.css), and nothing moves under reduced motion.
import { cents, money, SP_GAP, type Group } from "../../lib/broker";
import type { Data, Firm } from "../../lib/data";
import { monthLong } from "../../lib/format";
import { brokerPath, comparePath, href } from "../../lib/routes";
import { Scale } from "../broker/Scale";
import { Icon, Info } from "../ui";

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "$0.82" + "above the fair price", "$0.09" + "below the fair price", "$0.00" + "at the fair price". */
function amount(v: number): [string, string] {
  const c = cents(v);
  return [money(Math.abs(v)), c > 0 ? "above the fair price" : c < 0 ? "below the fair price" : "at the fair price"];
}

/** The broker a pick is compared with: Fidelity, or Robinhood when Fidelity is the pick (the pair the bare compare page opens on). */
const partner = (d: Data, id: string): Firm | undefined =>
  d.byId[id === "FIBS" ? "HOOD" : "FIBS"] ?? d.brokers.find((b) => b.id !== id);

export function AnswerCard({ d, g, onSeeAll }: { d: Data; g: Group; onSeeAll: () => void }) {
  const month = monthLong(d.meta.month);
  const f = g.m.f;
  const other = partner(d, f.id);
  const c = g.m.cost10k;
  const [amt, side] = c == null ? ["", ""] : amount(c);

  return (
    <section className="card hm-ans" aria-labelledby="ans-h">
      <h2 id="ans-h" className="sr-only">{f.short}: prices in {month}</h2>
      {c == null ? (
        <p className="bp-none">No {g.sp === "N" ? "other-stock" : `S&P${SP_GAP}500`} price report from {f.short} for {month} yet.</p>
      ) : (
        <>
          <div className="bp-fig">
            <p className="bp-amt">{amt}</p>
            <p className="bp-per">
              {side}<br />per $10,000 traded{" "}
              <Info topic="the fair price">
                The fair price is the midpoint of the best buy and sell quotes when the order arrived. From each broker's SEC
                Rule 605 report: market orders under $200,000, {month}.
              </Info>
            </p>
          </div>
          {g.rank && (
            <div className="bp-rank">
              <p>{capital(g.rank)}</p>
              <a className="go hm-see" href="#rank" onClick={onSeeAll}>See all {g.places.length}<Icon name="down" size={20} /></a>
            </div>
          )}
          {g.diff && <p className="bp-diff">{g.diff.lead}{g.diff.who && <> <span className="nw">({g.diff.who})</span></>}</p>}
          {g.scale && <Scale sets={[{ data: g.scale }]} fmt={money} />}
          {g.sentence && <p className="bp-say">{g.sentence}</p>}
        </>
      )}
      <div className="hm-next">
        <a className="btn btn-solid" href={href(brokerPath(f.slug))}>{f.short}'s full page<Icon name="arrow" size={20} /></a>
        {other && (
          <a className="go" href={href(comparePath(f.slug, other.slug))}>
            Compare with {other.short}<span className="sr-only"> side by side</span><Icon name="arrow" size={20} />
          </a>
        )}
      </div>
    </section>
  );
}
