// The trading firms ranked by price on the same stocks and order sizes, as a real table. Each firm sits on its own small
// neutral rail, the broker page's price scale in miniature: the tick in the middle is the other firms' orders, the firm is
// an ink dot, less of the spread to the left. The words beside the rail say the same thing, so the rail is decoration
// for screen readers. Every rail runs over the same span for both stock groups, so when the stock switch flips, a dot's
// move is a real change: each dot glides to its new place and each row to its new rank (nothing moves under reduced
// motion). The rows restack into three lines when the table's box is narrow (trading.css); their ARIA roles keep it a
// table for screen readers.
import { useEffect, useRef } from "react";
import type { Gap } from "../../lib/data";
import { useBrowserLayoutEffect } from "../../lib/hooks";
import { spreadPct } from "./names";

const EASE = "cubic-bezier(.22, 1, .36, 1)";

/** Where a gap sits along a rail that runs from −ext to +ext: 0 at the left end, 1 at the right. */
const along = (gap: number, ext: number) => Math.min(1, Math.max(0, (gap + ext) / (2 * ext)));
/** The dot's left edge for a place along the rail: inset by its radius, so a dot at either end stays on the rail. */
const leftAt = (p: number) => `calc(9px + (100% - 18px) * ${p.toFixed(4)})`;

/** "23.1 points less", "4.4 points more", "about the same" (rounds to 0.0). */
function Words({ gap }: { gap: number }) {
  if (Math.abs(gap) < 0.05) return <>about the same</>;
  return <><span className="tf-n">{Math.abs(gap).toFixed(1)}</span> points {gap < 0 ? "less" : "more"}</>;
}

export function PriceRails({ rows, ext, name, caption }: {
  /** the firms' gaps for one stock group, best price (lowest) first */
  rows: Gap[];
  /** the rail's half-span in points, the same for both stock groups */
  ext: number;
  name: (id: string) => string;
  caption: string;
}) {
  const body = useRef<HTMLTableSectionElement>(null);
  // each row's top and its dot's place after the last render, by firm id
  const last = useRef(new Map<string, { top: number; p: number }>());
  const key = rows.map((r) => `${r.id}:${r.gap}`).join(",");

  useBrowserLayoutEffect(() => {
    const tb = body.current;
    if (!tb) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = new Map<string, { top: number; p: number }>();
    tb.querySelectorAll<HTMLElement>("tr[data-id]").forEach((tr) => {
      const id = tr.dataset.id!, p = Number(tr.dataset.p), top = tr.offsetTop;
      now.set(id, { top, p });
      const was = last.current.get(id);
      if (!was || still) return;
      if (Math.abs(was.top - top) > 0.5) {
        tr.animate([{ transform: `translateY(${was.top - top}px)` }, { transform: "translateY(0)" }], { duration: 650, easing: EASE });
      }
      const dot = tr.querySelector<HTMLElement>(".tf-dot");
      if (dot && Math.abs(was.p - p) > 1e-4) dot.animate([{ left: leftAt(was.p) }, { left: leftAt(p) }], { duration: 800, easing: EASE });
    });
    last.current = now;
  }, [key]);

  // a resize moves rows without a re-render (text wraps, the rows restack): keep the remembered tops current, so the next
  // flip of the switch glides from where the rows really are
  useEffect(() => {
    const tb = body.current;
    if (!tb) return;
    const ro = new ResizeObserver(() => {
      tb.querySelectorAll<HTMLElement>("tr[data-id]").forEach((tr) => {
        const was = last.current.get(tr.dataset.id!);
        if (was) was.top = tr.offsetTop;
      });
    });
    ro.observe(tb);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="tf-pq-box">
      {/* the rails' direction where the column headings are out of sight (the restacked rows, trading.css) */}
      <p className="tf-axis-top" aria-hidden="true"><span>Less</span><span>Same as other firms</span><span>More</span></p>
      <table className="tf-pq" role="table">
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col" className="c-nm">Trading firm</th>
            <th role="columnheader" scope="col" className="c-cmp">
              Compared with other firms<small>points of the spread</small>
              <span className="tf-cmp tf-axis-row" aria-hidden="true">
                <span className="tf-axis"><span>Less</span><span>Same</span><span>More</span></span>
              </span>
            </th>
            <th role="columnheader" scope="col" className="num c-own">Its orders paid<small>of the spread</small></th>
            <th role="columnheader" scope="col" className="num c-peer">Other firms paid<small>same stocks and sizes</small></th>
            <th role="columnheader" scope="col" className="num c-n">Groups compared<small>stock and order size</small></th>
          </tr>
        </thead>
        <tbody role="rowgroup" ref={body}>
          {rows.map((g) => {
            const p = along(g.gap, ext);
            return (
              <tr key={g.id} role="row" data-id={g.id} data-p={p}>
                <th role="rowheader" scope="row" className="c-nm">{name(g.id)}</th>
                <td role="cell" className="c-cmp">
                  <span className="tf-cmp">
                    <span className="tf-rail" aria-hidden="true">
                      <span className="tf-mid" />
                      <span className="tf-dot" style={{ left: leftAt(p) }} />
                    </span>
                    <span className="tf-words"><Words gap={g.gap} /></span>
                  </span>
                </td>
                <td role="cell" className="num c-own"><span className="k" aria-hidden="true">Its orders paid </span>{spreadPct(g.own)}</td>
                <td role="cell" className="num c-peer"><span className="k" aria-hidden="true">others </span>{spreadPct(g.peers)}</td>
                <td role="cell" className="num c-n">{g.cells.toLocaleString("en-US")}<span className="k" aria-hidden="true"> groups</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
