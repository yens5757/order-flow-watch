// What a typical year costs at the visitor's broker, in one line: the yearly figure the broker pages give (lib/broker.ts
// HABIT: 24 trades of $2,000, trade prices and commissions; "At least" when a part is missing), and a link into the
// calculator for the visitor's own numbers. A one-line card in the broker page's look (bp-line): the whole card presses.
// The link's name is one string that starts with its visible label (WCAG 2.5.3): a hidden span inside the flex link was
// read as a separate block, which put a stray space before its colon ("Your own numbers : yearly cost …").
import { HABIT, yearHeadline, type Year } from "../../lib/broker";
import type { Firm } from "../../lib/data";
import { num } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { Icon } from "../ui";

export function YearLine({ firm, y }: { firm: Firm; y: Year }) {
  const l = y.line;
  return (
    <div className="card bp-line hm-year">
      <p>
        {l
          ? <><strong>{yearHeadline(l)}</strong> at {firm.short} in trade prices and commissions, for {HABIT.trades} trades of ${num(HABIT.size)}.</>
          : <>No yearly estimate for {firm.short}: there is no price report from it this month.</>}
      </p>
      <a className="go" href={`${href(pagePath("calculator"))}?b=${firm.slug}`} aria-label={`Your own numbers: yearly cost at ${firm.short} in the calculator`}>
        Your own numbers<Icon name="arrow" size={20} />
      </a>
    </div>
  );
}
