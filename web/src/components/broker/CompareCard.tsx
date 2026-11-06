// Where to go next: this broker side by side with one of the brokers people compare most, or the calculator with the
// visitor's own numbers, opened as the yearly card's "Change" opens it: on the broker pages' habit with this broker
// picked (calculator/?n=24&b=<slug>), so it shows the yearly card's figure and never the inputs saved from another visit.
import { HABIT } from "../../lib/broker";
import { calcSearch } from "../../lib/cost";
import type { Data, Firm } from "../../lib/data";
import { comparePath, href, pagePath } from "../../lib/routes";
import { Icon } from "../ui";

/** The brokers offered for a side-by-side, in this order; a broker's own page offers Robinhood in its own place. */
const WITH = ["FIBS", "WBUS", "CHAS", "VGRD"];
const STAND_IN = "HOOD";

export function CompareCard({ d, firm }: { d: Data; firm: Firm }) {
  const ids = WITH.includes(firm.id) ? WITH.map((id) => (id === firm.id ? STAND_IN : id)) : WITH;
  const others = ids.map((id) => d.byId[id]).filter((f): f is Firm => !!f && f.id !== firm.id);
  return (
    <section className="card bp-next" aria-labelledby="next-h">
      <h2 id="next-h">Compare {firm.short} with</h2>
      {/* quiet targets (a tinted fill and a chevron); the solid button below stays the card's one loud action */}
      <ul className="bp-pills">
        {others.map((o) => (
          <li key={o.id}>
            <a className="pill-soft" href={href(comparePath(firm.slug, o.slug))}>
              <span><span className="sr-only">{firm.short} vs </span>{o.short}</span><Icon name="right" size={18} />
            </a>
          </li>
        ))}
      </ul>
      <a className="btn btn-solid bp-wide" href={href(pagePath("calculator")) + calcSearch(HABIT, firm.slug)}>
        <span>Yearly cost with your own numbers<Icon name="arrow" size={20} className="ml-2 inline-block align-[-4px]" /></span>
      </a>
    </section>
  );
}
