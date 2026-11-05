// The answer: what this broker's customers paid above the fair price per $10,000 traded, its rank among the brokers, the
// gap to the cheapest, the neutral scale and one sentence, all generated from the data, for both stock groups at once
// (the page's switch shows one; see broker.css).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cents, money, SP_GAP, type Group } from "../../lib/broker";
import type { Data } from "../../lib/data";
import { monthLong } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { Icon } from "../ui";
import { Scale } from "./Scale";

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "$0.82" + "above the fair price", "$0.09" + "below the fair price", "$0.00" + "at the fair price". */
function amount(v: number): [string, string] {
  const c = cents(v);
  return [money(Math.abs(v)), c > 0 ? "above the fair price" : c < 0 ? "below the fair price" : "at the fair price"];
}

/** The (i) beside "per $10,000 traded": it reveals a plain line in place. Hover or keyboard focus opens it, and it stays
 *  open while the pointer or the focus is on the icon or the line (its link included); a click, tap or Enter pins it;
 *  Escape closes it, handing focus back to the (i) when focus was in the line (without opening it again). */
function useNote() {
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const quiet = useRef(false); // the focus Escape hands back to the (i) doesn't reopen the line
  const open = pinned || hover;
  const enter = () => {
    window.clearTimeout(timer.current);
    if (quiet.current) { quiet.current = false; return; }
    setHover(true);
  };
  const leave = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setHover(false), 250); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const line = (document.activeElement as HTMLElement | null)?.closest(".bp-def-note");
      setPinned(false);
      setHover(false);
      if (line?.id) {
        quiet.current = true;
        (document.querySelector(`[aria-controls="${line.id}"]`) as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  const toggle = () => { if (open && pinned) { setPinned(false); setHover(false); } else setPinned(true); };
  return { open, enter, leave, toggle };
}

export function PriceCard({ d, views, onSeeAll }: { d: Data; views: Group[]; onSeeAll: () => void }) {
  const note = useNote();
  const month = monthLong(d.meta.month);
  const priced = views.filter((v) => v.m.cost10k != null && v.scale);

  const block = (v: Group): ReactNode => {
    if (v.m.cost10k == null) {
      return <p className="bp-none">No {v.sp === "N" ? "other-stock" : `S&P${SP_GAP}500`} price report for {month} yet.</p>;
    }
    const [amt, side] = amount(v.m.cost10k);
    return (
      <>
        <div className="bp-fig">
          <p className="bp-amt">{amt}</p>
          <p className="bp-per">
            {side}<br />per $10,000 traded{" "}
            <button type="button" className="bp-def js-only" aria-expanded={note.open} aria-controls={`fair-${v.g}`}
              onClick={note.toggle} onMouseEnter={note.enter} onMouseLeave={note.leave} onFocus={note.enter} onBlur={note.leave}>
              <Icon name="info" size={22} /><span className="sr-only">What is the fair price?</span>
            </button>
          </p>
        </div>
        <p id={`fair-${v.g}`} className={`bp-def-note${note.open ? " open" : ""}`} onMouseEnter={note.enter} onMouseLeave={note.leave} onFocus={note.enter} onBlur={note.leave}>
          The fair price is the midpoint of the best buy and sell quotes when the order arrived. From each broker's SEC Rule 605
          report: market orders under $200,000, {month}. <a className="ulink" href={href(pagePath("how-we-measure"))}>How we measure</a>
        </p>
        {v.rank && (
          <div className="bp-rank">
            <p>{capital(v.rank)}</p>
            <a className="go" href="#where" onClick={onSeeAll}>See all {v.places.length}<Icon name="down" size={20} /></a>
          </div>
        )}
        {v.diff && <p className="bp-diff">{v.diff.lead}{v.diff.who && <> <span className="nw">({v.diff.who})</span></>}</p>}
      </>
    );
  };

  return (
    <section className="card bp-price" aria-labelledby="price-h">
      <h2 id="price-h" className="sr-only">Prices in {month}</h2>
      {views.map((v) => <div key={v.g} data-g={v.g}>{block(v)}</div>)}
      {/* one scale for both groups when both are priced, so the dot glides when the switch flips */}
      {priced.length === 2
        ? <Scale sets={priced.map((v) => ({ g: v.g, data: v.scale! }))} fmt={money} />
        : priced.map((v) => <div key={v.g} data-g={v.g}><Scale sets={[{ data: v.scale! }]} fmt={money} /></div>)}
      <p className="bp-say">{views.map((v) => v.sentence && <span key={v.g} data-g={v.g}>{v.sentence}</span>)}</p>
    </section>
  );
}

