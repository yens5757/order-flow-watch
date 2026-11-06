// The answer for the visitor's broker, the broker page's price card in every word and rule (components/broker/PriceCard's
// Answer, broker.css): what its customers paid above or below the fair price per $10,000 traded, its rank on average, its
// rank on the same stocks and order sizes, the gap to the cheapest, the neutral scale with its dot and one sentence graded
// by the two ranks; its two (i)s open their lines in place, as on the broker page. Then its page and a comparison. Every
// figure comes from lib/broker.ts (the broker page's Group), so the two pages never disagree. Picking another broker
// re-renders the card: the scale's dot glides to the new broker's place (scale.css), and nothing moves under reduced motion.
import { fairText, SP_GAP, type Group } from "../../lib/broker";
import type { Data, Firm } from "../../lib/data";
import { monthLong } from "../../lib/format";
import { brokerPath, comparePath, href } from "../../lib/routes";
import { Answer, useNote } from "../broker/PriceCard";
import { Scale } from "../broker/Scale";
import { Icon } from "../ui";

/** The broker a pick is compared with: Fidelity, or Robinhood when Fidelity is the pick (the pair the bare compare page opens on). */
const partner = (d: Data, id: string): Firm | undefined =>
  d.byId[id === "FIBS" ? "HOOD" : "FIBS"] ?? d.brokers.find((b) => b.id !== id);

export function AnswerCard({ d, g, onSeeAll }: { d: Data; g: Group; onSeeAll: () => void }) {
  // the broker page's notes: an (i) opened stays open across a pick or a flip, its line then about the new figures
  const fair = useNote("fair");
  const same = useNote("same");
  const month = monthLong(d.meta.month);
  const f = g.m.f;
  const other = partner(d, f.id);

  return (
    <section className="card hm-ans" aria-labelledby="ans-h">
      <h2 id="ans-h" className="sr-only">{f.short}: prices in {month}</h2>
      {g.m.cost10k == null ? (
        <p className="bp-none">No {g.sp === "N" ? "other-stock" : `S&P${SP_GAP}500`} price report from {f.short} for {month} yet.</p>
      ) : (
        <>
          <Answer d={d} v={g} fair={fair} same={same} see={{ href: "#rank", className: "hm-see", onSee: onSeeAll }} />
          {g.scale && <Scale sets={[{ data: g.scale }]} fmt={fairText} />}
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
