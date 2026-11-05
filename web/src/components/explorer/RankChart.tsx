// The ranked chart: the broker page's price scale given to every broker. One row per broker in the order picked; each row
// a grey rail from the lowest to the highest value shown, an ink dot at the broker's value, and the typical (median)
// broker's mark-grey tick, lined up through every row under its "Typical" label; a hairline marks zero when the values
// cross it. Drawn in CSS (explorer.css), so the pre-rendered page has it before any script runs.
// When the measure, a filter or the order changes, the rows re-sort in place (a FLIP by broker id) while every dot glides
// along its rail to its new value; nothing moves under reduced motion. It is a picture: its figures and links are in the
// table under it, so assistive tech gets one image with a written label.
import { useRef, type CSSProperties } from "react";
import { useBrowserLayoutEffect } from "../../lib/hooks";

export interface RankRow { id: string; name: string; v: number; text: string }

/** A label near an end of the rail turns inward rather than running off it. */
const shift = (p: number) => (p < 0.15 ? "0%" : p > 0.85 ? "-100%" : "-50%");

export function RankChart({ rows, typ, typText, zeroText, label }: {
  rows: RankRow[]; typ: number; typText: string; zeroText: string; label: string;
}) {
  const vals = rows.map((r) => r.v);
  const lo = Math.min(...vals, typ), hi = Math.max(...vals, typ);
  const at = (v: number) => (hi > lo ? (v - lo) / (hi - lo) : 0.5);
  const zero = lo < 0 && hi > 0 ? at(0) : null;
  const t = at(typ);
  const style = {
    "--t": t.toFixed(4), "--tx": shift(t),
    ...(zero != null ? { "--z": zero.toFixed(4), "--zx": shift(zero) } : {}),
  } as CSSProperties;

  // the re-sort: each row's top before and after, by broker id; a row that moved slides from its old place, a new one fades in
  const list = useRef<HTMLOListElement>(null);
  const tops = useRef<Map<string, number> | null>(null);
  const order = rows.map((r) => r.id).join(",");
  const last = useRef(order);
  useBrowserLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    const now = new Map(items.map((li) => [li.dataset.id!, li.offsetTop]));
    const was = tops.current, moved = last.current !== order;
    tops.current = now;
    last.current = order;
    if (!was || !moved || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const li of items) {
      const from = was.get(li.dataset.id!), to = now.get(li.dataset.id!)!;
      if (from == null) li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
      else if (Math.abs(from - to) > 0.5) {
        li.animate([{ transform: `translateY(${from - to}px)` }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" });
      }
    }
  });

  return (
    <div className="ex-rank" role="img" aria-label={label} style={style}>
      <div className="ex-rank-edge"><span /><span className="ex-axis"><span className="ex-typ-l">Typical <b>{typText}</b></span></span><span /></div>
      <ol ref={list} className="ex-rank-list">
        {rows.map((r) => (
          <li key={r.id} data-id={r.id} className="ex-rank-row">
            <span className="ex-rank-nm">{r.name}</span>
            <span className="ex-rail" style={{ "--p": at(r.v).toFixed(4) } as CSSProperties}>
              {zero != null && <i className="ex-zero" />}
              <i className="ex-typ" />
              <i className="ex-dot" />
            </span>
            <span className="ex-rank-v">{r.text}</span>
          </li>
        ))}
      </ol>
      {zero != null && <div className="ex-rank-edge"><span /><span className="ex-axis"><span className="ex-zero-l">{zeroText}</span></span><span /></div>}
    </div>
  );
}
