// Where to go next: the pairs people look up most, as quiet soft pills (this page's pair marked, not linked twice), and
// every pair of the retail brokers, each with a page of its own. That list is collapsed but always in the page, so every
// comparison can be found, followed and linked without a script.
import type { Data, Firm } from "../../lib/data";
import { comparePath, href, pairOrder } from "../../lib/routes";
import { Card, Icon } from "../ui";

/** The pairs people search for most, in the order they are shown. */
const POPULAR: [string, string][] = [
  ["HOOD", "FIBS"], ["HOOD", "CHAS"], ["HOOD", "WBUS"], ["WBUS", "FUTM"], ["CHAS", "FIBS"], ["FIBS", "VGRD"], ["SOFI", "HOOD"], ["TTSI", "HOOD"],
];

export function OtherPairs({ d, A, B }: { d: Data; A: Firm; B: Firm }) {
  const here = (x: Firm, y: Firm) => (x.id === A.id && y.id === B.id) || (x.id === B.id && y.id === A.id);
  const popular = POPULAR.filter(([x, y]) => d.byId[x] && d.byId[y]).map(([x, y]) => pairOrder(d.byId[x], d.byId[y]));
  // every pair of retail brokers once, in the order its page names it: by slug, each broker with the ones after it
  const retail = [...d.brokers].sort((x, y) => (x.slug < y.slug ? -1 : x.slug > y.slug ? 1 : 0));
  const count = (retail.length * (retail.length - 1)) / 2;
  return (
    <Card title="Popular comparisons" className="cmp-more">
      <ul className="cmp-pills">
        {popular.map(([x, y]) => (
          <li key={`${x.id}-${y.id}`}>
            {here(x, y)
              ? <a className="pill-soft cmp-here" href={href(comparePath(x.slug, y.slug))} aria-current="page">
                  <span>{x.short} vs {y.short}<span className="sr-only"> (this page)</span></span>
                </a>
              : <a className="pill-soft" href={href(comparePath(x.slug, y.slug))}><span>{x.short} vs {y.short}</span><Icon name="right" size={18} /></a>}
          </li>
        ))}
      </ul>
      <details className="cmp-every">
        <summary>Every comparison ({count} pairs)<Icon name="down" size={20} /></summary>
        <ul className="cmp-all">
          {retail.slice(0, -1).map((x, i) => (
            <li key={x.id}>
              <p className="cmp-all-x">{x.short} vs</p>
              <ul>
                {retail.slice(i + 1).map((y) => (
                  <li key={y.id}>
                    <a href={href(comparePath(x.slug, y.slug))} aria-current={here(x, y) ? "page" : undefined}>
                      <span className="sr-only">{x.short} vs </span>{y.short}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
