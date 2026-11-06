// The pair picker: two selects that only report a pick (nothing happens on change, WCAG 3.2.2) and a real "Compare" link
// whose address follows the two picks, so opening another pair is an explicit press. While the boxes name a pair other
// than the one shown (in either order), the link turns solid and names that pair ("Compare Fidelity and Webull"), a line
// beside it says what is on screen ("Showing Fidelity vs Robinhood"; its room is kept while nothing is pending, so it
// never pushes the page down; not on compare/, whose intro already says so) and a status line says the pick once it has
// settled; back on the pair shown, the link is quiet again. Picking in one box the broker the other box shows swaps the
// two, so the boxes always name two different brokers (said too). Only works with a script: without one it is hidden,
// and the list of every comparison below still links each pair.
import { useEffect, useRef, useState, type FocusEvent } from "react";
import type { Data, Firm } from "../../lib/data";
import { comparePath, href } from "../../lib/routes";
import { Icon, Select } from "../ui";

/** How long a pick rests before the status line says it: arrowing through a closed select changes it at every press
 *  (Windows), and only where the visitor stops is worth reading out. */
export const SETTLE = 800;

/** A pair in either order, as one key: {A, B} is {B, A}. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
/** A name that never parts at a line end ("Edward Jones"), so a wrapped label breaks only between the words around it. */
export const whole = (s: string) => s.replace(/ /g, "\u00a0");

export function Picker({ d, A, B, showing = true }: { d: Data; A: Firm; B: Firm; showing?: boolean }) {
  const [x, setX] = useState(A.id);
  const [y, setY] = useState(B.id);
  const [said, setSaid] = useState("");
  // the two boxes as they were when the box being changed took focus (see pick)
  const start = useRef<[string, string] | null>(null);
  // the pair the status line last said (or the pair shown), so a pick is said once
  const told = useRef(pairKey(A.id, B.id));
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // the 25 retail brokers by name; a firm in the address that isn't one (the clearing firm) stays pickable
  const firms = [...d.brokers, ...[A, B].filter((F) => F.type !== "broker" && !d.brokers.includes(F))];
  const opts: [string, string][] = [...new Set(firms)].sort((p, q) => p.short.localeCompare(q.short)).map((F) => [F.id, F.short]);
  const short = (id: string) => d.byId[id]?.short ?? id;
  const shown = pairKey(A.id, B.id);

  // A swap is measured against the boxes as they stood when this box took focus, not against its last step: arrowing
  // through the list past the other box's broker swaps the two only while it rests there, and the other box gets its
  // broker back as soon as the arrow moves on. A pick is said once it has rested (SETTLE).
  const pick = (box: 0 | 1, v: string) => {
    const [sx, sy] = start.current ?? [x, y];
    const was = box === 0 ? sx : sy, other = box === 0 ? sy : sx;
    const swap = v === other && v !== was;
    const next: [string, string] = box === 0 ? [v, swap ? was : other] : [swap ? was : other, v];
    setX(next[0]);
    setY(next[1]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const k = pairKey(next[0], next[1]);
      const moved = swap ? `${short(was)} moved to the ${box === 0 ? "second" : "first"} box.` : "";
      if (k === shown) { told.current = k; setSaid(moved); }
      else if (k !== told.current) {
        told.current = k;
        setSaid(`${moved}${moved ? " " : ""}${short(next[0])} vs ${short(next[1])} picked; press Compare to open it.`);
      } else if (moved) setSaid(moved);
    }, SETTLE);
  };
  // which box is being changed, and how the two stood before (focus moving from one box to the other starts afresh)
  const onFocus = (e: FocusEvent) => { if (e.target.tagName === "SELECT") start.current = [x, y]; };
  const onBlur = (e: FocusEvent) => { if (e.target.tagName === "SELECT") start.current = null; };

  const X = d.byId[x] ?? A, Y = d.byId[y] ?? B;
  const pending = pairKey(x, y) !== shown;
  return (
    <div className="cmp-pick js-only" role="group" aria-label="Pick two brokers" onFocus={onFocus} onBlur={onBlur}>
      <div className="cmp-boxes">
        <Select label="First broker" value={x} onChange={(v) => pick(0, v)} options={opts} hideLabel />
        <span className="cmp-vs" aria-hidden="true">vs</span>
        <Select label="Second broker" value={y} onChange={(v) => pick(1, v)} options={opts} hideLabel />
      </div>
      <a className={`btn ${pending ? "btn-solid" : "btn-ghost"} cmp-go`} href={href(comparePath(X.slug, Y.slug))}>
        {pending
          ? <span className="cmp-go-t">Compare {whole(X.short)} and {whole(Y.short)}</span>
          : <span>Compare<span className="sr-only"> {X.short} and {Y.short}</span></span>}
        <Icon name="arrow" size={20} />
      </a>
      {/* the line holds its place while the pick matches the pair shown (hidden, not removed), so a pick never moves the
          page under it */}
      {showing && <p className="cmp-shown" data-rest={pending ? undefined : ""}>Showing {whole(A.short)} vs {whole(B.short)}</p>}
      <p className="sr-only" role="status">{said}</p>
    </div>
  );
}
