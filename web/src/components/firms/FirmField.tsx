// "Where the brokers on this site sit": every firm that reported these orders is a dot on its group's rail, four rails on
// one shared axis, in the price scale's anatomy (components/broker/Scale.tsx): a track, the dots sitting on it and
// stacking upward where firms crowd, the group's typical firm as a tick with "Typical" and its value under it. The site's
// own brokers are ink dots, every other firm a mark-grey one. Drawn in CSS (firms.css). Dots are keyed by firm, so when a
// filter changes each one glides to its new place, the axis and the ticks with it (nothing moves under reduced motion).
// A mouse hover names a dot in a raised panel the pointer can move onto, and Escape hides it; the picture is hidden from
// screen readers, which get one line per rail, and every number is in the table below.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { METRICS } from "../../lib/metrics";
import { Card } from "../ui";
import { CLIP, fieldOf, GROUPS, share, type Dot, type FirmRow, type Rail } from "./firms";

type Align = "start" | "center" | "end";
/** Labels near an end of the rail turn inward, as the scale's do. */
const alignOf = (x: number): Align => (x < 20 ? "start" : x > 80 ? "end" : "center");
const tick = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}%`;
const firms = (n: number) => `${n} ${n === 1 ? "firm" : "firms"}`;

/** "Trading firms: 29 firms, from Citadel Securities, LLC at −6.9% to RBC Capital Markets, LLC at 99.9%; typical 17.9%." */
function sentence(r: Rail): string {
  const name = GROUPS[r.g].row;
  if (!r.lo || !r.hi || r.typ == null) return `${name}: no firm reported these orders.`;
  if (r.n === 1) return `${name}: ${r.lo.name}, ${share(r.lo.cust!)}.`;
  return `${name}: ${firms(r.n)}, from ${r.lo.name} at ${share(r.lo.cust!)} to ${r.hi.name} at ${share(r.hi.cust!)}; typical ${share(r.typ)}.`;
}

const v = (o: Record<string, string | number>) => o as CSSProperties;

interface Tip { dot: Dot; left: number; top: number; a: Align }

/** `scale`: the figures the axis must hold (fieldOf), so it stays put while the stock group or the month changes. */
export function FirmField({ rows, scale, month }: { rows: FirmRow[]; scale: FirmRow[]; month: string }) {
  const field = useMemo(() => fieldOf(rows, scale), [rows, scale]);
  const dots = useMemo(() => new Map(field.rails.flatMap((r) => r.dots.map((d) => [d.id, d] as const))), [field]);

  // the hover panel: over a dot it names the firm; the pointer can cross onto the panel (a short grace), Escape hides it
  const plot = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const keep = () => window.clearTimeout(timer.current);
  const hideSoon = () => { keep(); timer.current = window.setTimeout(() => setTip(null), 200); };
  const over = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return; // too small to tap: the table is the way in on a touch screen
    const el = (e.target as Element).closest<HTMLElement>(".af-dot"), box = plot.current;
    const dot = el && dots.get(el.dataset.id ?? "");
    if (!el || !box || !dot) return;
    keep();
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    const left = r.left + r.width / 2 - b.left;
    setTip({ dot, left, top: r.top - b.top, a: left < 120 ? "start" : left > b.width - 120 ? "end" : "center" });
  };
  const out = (e: PointerEvent<HTMLDivElement>) => { if ((e.target as Element).closest(".af-dot")) hideSoon(); };
  useEffect(() => {
    if (!tip) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { keep(); setTip(null); } };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [tip]);
  useEffect(() => () => keep(), []);
  // new filters move every dot: a panel left open would name a dot that has gone elsewhere
  useEffect(() => { setTip(null); }, [field]);

  const cut = [...field.cut].sort((a, b) => a.cust! - b.cust!);
  return (
    <Card className="af-field" title="Where the brokers on this site sit" info={`${METRICS.cust.label}. ${METRICS.cust.desc}`}
      infoTopic="customer pays" sub={`Each dot is a firm · ${field.reported} of ${rows.length} reported these orders in ${month}`}
      foot={cut.length > 0 && (
        <>Too far out to draw (below {tick(CLIP.lo)} or above {tick(CLIP.hi)}): {cut.length > 4 ? firms(cut.length)
          : cut.map((r) => `${r.name} ${share(r.cust!)}`).join(", ")}. {cut.length === 1 ? "It is" : "They are"} in the table below.</>
      )}>
      <div ref={plot} className="af-plot" aria-hidden="true" onPointerOver={over} onPointerOut={out}>
        {field.rails.map((r) => (
          <div key={r.g} className="af-row" style={v({ "--la": r.depth[0], "--lb": r.depth[1], "--lc": r.depth[2] })}>
            <p className="af-rname"><b>{GROUPS[r.g].row}</b><span>{firms(r.n)}</span></p>
            <div className="af-rail">
              {field.ticks.map((t) => (
                <span key={t.v} className={`af-gl${t.v === 0 ? " zero" : ""}${t.major ? "" : " minor"}`} style={v({ "--x": `${t.x}%` })} />
              ))}
              <span className="af-track" />
              {r.typX != null && <span className="af-typ" style={v({ "--t": `${r.typX}%` })} />}
              {r.dots.map((d) => (
                <span key={d.id} data-id={d.id} className={`af-dot${d.on ? " on" : ""}${tip?.dot.id === d.id ? " is-tip" : ""}`}
                  style={v({ "--x": `${d.x}%`, "--a": d.lanes[0], "--b": d.lanes[1], "--c": d.lanes[2] })} />
              ))}
              {r.typ != null && r.typX != null && (
                <span className="af-typ-l" data-a={alignOf(r.typX)} style={v({ "--t": `${r.typX}%` })}>Typical <b>{share(r.typ)}</b></span>
              )}
              {r.n === 0 && <span className="af-nil">None reported these orders</span>}
            </div>
          </div>
        ))}
        <div className="af-axis">
          {field.ticks.map((t) => (
            <span key={t.v} className={t.major ? undefined : "minor"} data-a={t.x < 4 ? "start" : t.x > 96 ? "end" : undefined}
              style={v({ "--x": `${t.x}%` })}>{tick(t.v)}</span>
          ))}
        </div>
        {tip && (
          <div className="af-tip" data-a={tip.a} style={{ left: tip.left, top: tip.top }} onPointerEnter={keep} onPointerLeave={hideSoon}>
            <b>{tip.dot.name}</b>{share(tip.dot.v)} of the spread
          </div>
        )}
      </div>
      <p className="af-axis-t">{METRICS.cust.label}; lower is better</p>
      <ul className="sr-only">{field.rails.map((r) => <li key={r.g}>{sentence(r)}</li>)}</ul>
    </Card>
  );
}
