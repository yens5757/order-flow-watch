// The comparisons people search for most, each a quiet pill to its page (the broker page's soft pills), and the compare
// page for any other two.
import type { Data } from "../../lib/data";
import { comparePath, href, pagePath, pairOrder } from "../../lib/routes";
import { Card, Icon } from "../ui";

/** Reporter ids, each pair shown in its page's own (alphabetical) order. */
const PAIRS: [string, string][] = [["HOOD", "FIBS"], ["HOOD", "CHAS"], ["HOOD", "WBUS"], ["WBUS", "FUTM"], ["CHAS", "FIBS"], ["FIBS", "VGRD"]];

export function Pairs({ d }: { d: Data }) {
  const pairs = PAIRS.filter(([a, b]) => d.byId[a] && d.byId[b]).map(([a, b]) => pairOrder(d.byId[a], d.byId[b]));
  if (!pairs.length) return null;
  return (
    <Card className="hm-pairs" title="Popular comparisons"
      right={<a className="go" href={href(pagePath("compare"))}>Pick any two<Icon name="arrow" size={20} /></a>}>
      <ul className="hm-pills">
        {pairs.map(([x, y]) => (
          <li key={`${x.id}-${y.id}`}>
            <a className="pill-soft" href={href(comparePath(x.slug, y.slug))}>
              <span>{x.short} <span className="hm-vs">vs</span> {y.short}</span><Icon name="right" size={18} />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
