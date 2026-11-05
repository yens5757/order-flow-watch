// Home's opening: the question at the type scale's largest step, where the numbers come from, the promise (no ads, no
// affiliate links, no money from brokers) and when the site last looked for new reports, all centred; the page's one
// row of controls (the visitor's broker and the stock switch) sits under it, passed in by Home. The date is the last
// weekly rebuild (meta.built): reports arrive monthly (prices) and quarterly (payments), so it says "checked", never
// that the numbers change every week.
import type { ReactNode } from "react";
import { dayLong } from "../../lib/format";
import { Icon } from "../ui";

export function Hero({ built, children }: { built: string; children: ReactNode }) {
  return (
    <section className="hm-hero" aria-labelledby="hm-hero-h">
      <h1 id="hm-hero-h" className="hm-hero-h">Is your broker getting you a good price?</h1>
      <p className="hm-hero-lead">The numbers brokers must report by law, read the same way for every broker.</p>
      <ul className="hm-hero-promise" aria-label="What we promise">
        <li><Icon name="check" size={18} />No ads</li>
        <li><Icon name="check" size={18} />No affiliate links</li>
        <li><Icon name="check" size={18} />No money from brokers</li>
      </ul>
      <p className="hm-hero-fresh">
        <Icon name="clock" size={16} />Checked for new reports every week · last on <b>{dayLong(built.slice(0, 10))}</b>
      </p>
      {children}
    </section>
  );
}
