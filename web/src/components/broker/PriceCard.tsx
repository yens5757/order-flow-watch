// The answer: what this broker's customers paid above the fair price per $10,000 traded and its rank among the brokers on
// average, then its rank on the same stocks and order sizes, the gap to the cheapest, the neutral scale and one sentence
// graded by the two ranks, all generated from the data, for both stock groups at once (the page's switch shows one; see
// broker.css). Home's answer card renders the same Answer, so the card reads and behaves one way on both pages.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cents, fairText, money, ON_SAME, sameStockNote, sameStockWords, SP_GAP, type Group } from "../../lib/broker";
import type { Data } from "../../lib/data";
import { monthLong } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { Icon } from "../ui";
import { Scale } from "./Scale";

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NB = "\u00a0";

/** "$0.82" + "above the fair price", "$0.09" + "below the fair price", "$0.00" + "at the fair price". */
function amount(v: number): [string, string] {
  const c = cents(v);
  return [money(Math.abs(v)), c > 0 ? "above the fair price" : c < 0 ? "below the fair price" : "at the fair price"];
}

/** An (i) on the card (beside "per $10,000 traded", after the same-stock line): it reveals a plain line in place. Hover or
 *  keyboard focus opens it, and it stays open while the pointer or the focus is on the icon or the line (its link
 *  included); a click, tap or Enter pins it; Escape closes it, handing focus back to the (i) when focus was in its own
 *  line (without opening it again). `key` starts the ids of its lines (fair-sp, same-ot), so two notes never share one. */
export function useNote(key: string) {
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
      if (line?.id.startsWith(`${key}-`)) {
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
export type Note = ReturnType<typeof useNote>;

/** An (i) on the card, named for what it explains; it opens the line `id` in place. */
function NoteButton({ note, id, name }: { note: Note; id: string; name: string }) {
  return (
    <button type="button" className="bp-def js-only" aria-expanded={note.open} aria-controls={id}
      onClick={note.toggle} onMouseEnter={note.enter} onMouseLeave={note.leave} onFocus={note.enter} onBlur={note.leave}>
      <Icon name="info" size={22} /><span className="sr-only">{name}</span>
    </button>
  );
}

/** The plain line an (i) reveals, ending in its "How we measure" link; without a script it is simply shown. */
function NoteLine({ note, id, children }: { note: Note; id: string; children: ReactNode }) {
  return (
    <p id={id} className={`bp-def-note${note.open ? " open" : ""}`} onMouseEnter={note.enter} onMouseLeave={note.leave} onFocus={note.enter} onBlur={note.leave}>
      {children}
    </p>
  );
}

/** The first rank and its basis, built like the same-stock line under it: the rank in the line's 700, "on average" after
 *  it in 500. "of 25" and "on average" never part at a line end, so a narrow column breaks between the rank and its
 *  basis ("10th cheapest of 25" over "on average"), never inside either; a rank wider than its column on its own (an end
 *  or a tie beside "See all" on a phone, "The most expensive of 25") breaks before its count instead, the count and the
 *  basis together ("The most expensive" over "of 25 on average"). */
function RankLine({ v }: { v: Group }) {
  const rank = capital(v.rank!).replace(/ of (\d+)$/, ` of${NB}$1`);
  return (
    <p className={`bp-rank-l${v.basis ? " on" : ""}`}>
      {rank}{v.basis && <> <span className="bp-on">{v.basis.replace(/ /g, NB)}</span></>}
    </p>
  );
}

/** Where the rank's "See all" leads: the page's own ranked table. */
export interface SeeAll { href: string; className?: string; onSee: () => void }

/** One stock group's answer, on the broker page and Home alike: the figure and its unit with the fair price's (i); the two
 *  ranks, each with its basis ("10th cheapest of 25 on average", "See all" beside it; "13th of 25 on the same stocks and
 *  order sizes", its (i) last); the line each (i) opens in place; the gap to the cheapest. Each card adds the scale and
 *  the sentence. Only for a group with a price. */
export function Answer({ d, v, fair, same, see }: { d: Data; v: Group; fair: Note; same: Note; see: SeeAll }) {
  const month = monthLong(d.meta.month);
  const [amt, side] = amount(v.m.cost10k!);
  const how = href(pagePath("how-we-measure"));
  return (
    <>
      <div className="bp-fig">
        <p className="bp-amt">{amt}</p>
        <p className="bp-per">
          {side}<br />per $10,000 traded{" "}
          <NoteButton note={fair} id={`fair-${v.g}`} name="What is the fair price?" />
        </p>
      </div>
      <NoteLine note={fair} id={`fair-${v.g}`}>
        The fair price is the midpoint of the best buy and sell quotes when the order arrived. From each broker's SEC Rule 605
        report: market orders under $200,000, {month}. <a className="ulink" href={`${how}#fair-price`}>How we measure</a>
      </NoteLine>
      {v.rank && (
        <div className={`bp-rank${v.same ? " two" : ""}`}>
          <RankLine v={v} />
          <a className={see.className ? `go ${see.className}` : "go"} href={see.href} onClick={see.onSee}>
            See all {v.places.length}<Icon name="down" size={20} />
          </a>
          {/* the same stocks and order sizes, its own line under the rank, numbers first; a broker without a figure gets none */}
          {v.same && (
            <p className="bp-same">
              <b>{capital(sameStockWords(v.same))}</b> {ON_SAME}{" "}
              <NoteButton note={same} id={`same-${v.g}`} name="What does “on the same stocks and order sizes” mean?" />
            </p>
          )}
        </div>
      )}
      {v.same && (
        <NoteLine note={same} id={`same-${v.g}`}>
          {sameStockNote(d, v.same, v.places.length)}{" "}
          <a className="ulink" href={`${how}#same-stocks`}>How we measure</a>
        </NoteLine>
      )}
      {/* the cheapest broker in brackets, which a phone drops where the scale's "Cheapest" caption right under it says
          the same (broker.css) */}
      {v.diff && <p className="bp-diff">{v.diff.lead}{v.diff.who && <> <span className={v.diff.repeats ? "nw bp-who" : "nw"}>({v.diff.who})</span></>}</p>}
    </>
  );
}

export function PriceCard({ d, views, onSeeAll }: { d: Data; views: Group[]; onSeeAll: () => void }) {
  // one pair of notes for both groups: an (i) opened on S&P 500 stocks stays open when the switch flips
  const fair = useNote("fair");
  const same = useNote("same");
  const month = monthLong(d.meta.month);
  const priced = views.filter((v) => v.m.cost10k != null && v.scale);
  const see: SeeAll = { href: "#where", onSee: onSeeAll };

  return (
    <section className="card bp-price" aria-labelledby="price-h">
      <h2 id="price-h" className="sr-only">Prices in {month}</h2>
      {views.map((v) => (
        <div key={v.g} data-g={v.g}>
          {v.m.cost10k == null
            ? <p className="bp-none">No {v.sp === "N" ? "other-stock" : `S&P${SP_GAP}500`} price report for {month} yet.</p>
            : <Answer d={d} v={v} fair={fair} same={same} see={see} />}
        </div>
      ))}
      {/* one scale for both groups when both are priced, so the dot glides when the switch flips */}
      {/* the ends in words too: "Fidelity $0.09 below", never "−$0.09" */}
      {priced.length === 2
        ? <Scale sets={priced.map((v) => ({ g: v.g, data: v.scale! }))} fmt={fairText} />
        : priced.map((v) => <div key={v.g} data-g={v.g}><Scale sets={[{ data: v.scale! }]} fmt={fairText} /></div>)}
      <p className="bp-say">{views.map((v) => v.sentence && <span key={v.g} data-g={v.g}>{v.sentence}</span>)}</p>
    </section>
  );
}
