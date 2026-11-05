// The world's shared pieces (DESIGN.md), in the broker page's look: the page heading, the card, a figure card, the (i)
// tooltip, the pill switch, select, toggle, status chip, chart legend, empty state and "Show as a table". Styles in ui.css.
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useBrowserLayoutEffect } from "../lib/hooks";
import "./ui.css";

/* ---------- icons (inline, stroke-based) ---------- */
const PATHS: Record<string, ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  up: <path d="m6 15 6-6 6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  tune: <><path d="M4 8h9M17 8h3M4 16h3M11 16h9" /><circle cx="15" cy="8" r="2.25" /><circle cx="9" cy="16" r="2.25" /></>,
  checkCircle: <><circle cx="12" cy="12" r="8.75" /><path d="m8.5 12.25 2.4 2.4 4.6-5" /></>,
  swap: <><path d="M4 7h13M13 3l4 4-4 4" /><path d="M20 17H7M11 13l-4 4 4 4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  minus: <path d="M6 12h12" />,
  download: <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  ext: <><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>,
  scale: <><path d="M12 3v18M5 21h14" /><path d="m5 7 14-2" /><path d="M5 7 2 14a3.5 3.5 0 0 0 6 0zM19 5l-3 7a3.5 3.5 0 0 0 6 0z" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  flask: <><path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" /><path d="M7 15h10" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  github: <path fill="currentColor" stroke="none" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />,
};
export function Icon({ name, size = 18, className = "" }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>{PATHS[name]}</svg>
  );
}

/* ---------- layout ---------- */
/** The page's h1 and, if it needs one, a single plain line under it; `right` holds the page's own controls (a pair of
 *  pickers, "Copy link") and sits beside the heading on a wide screen, under it on a phone. No kicker above the h1. */
export function PageHeader({ title, intro, right }: { title: ReactNode; intro?: ReactNode; right?: ReactNode }) {
  return (
    <div className="ph">
      <div className="ph-text">
        <h1 className="ph-h1">{title}</h1>
        {intro && <p className="ph-intro">{intro}</p>}
      </div>
      {right && <div className="ph-right">{right}</div>}
    </div>
  );
}

/** One idea per card: a white card on the ground with a Title heading (h2, or h3 under a section heading), a secondary
 *  sub-line for scope and date, the content, and an optional ruled footer. `right` sits beside the title (a switch, a
 *  link); `info` puts an (i) beside the title, outside the heading, named "About <infoTopic or the title>". */
export function Card({ title, sub, right, info, infoTopic, children, className = "", foot, level = 2, id }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; info?: ReactNode; infoTopic?: string; children: ReactNode;
  className?: string; foot?: ReactNode; level?: 2 | 3; id?: string;
}) {
  const hid = useId();
  const H = level === 3 ? "h3" : "h2";
  const head = title != null || right != null;
  return (
    <section id={id} className={`card ${className}`.trim()} aria-labelledby={title != null ? hid : undefined}>
      {head && (
        <div className="card-head">
          {(title != null || sub) && (
            <div className="card-titles">
              {title != null && (
                <div className="card-title-row">
                  <H id={hid} className="card-title">{title}</H>
                  {info && <Info topic={infoTopic ?? (typeof title === "string" ? title : "this")}>{info}</Info>}
                </div>
              )}
              {sub && <p className="card-sub">{sub}</p>}
            </div>
          )}
          {right && <div className="card-right">{right}</div>}
        </div>
      )}
      {children}
      {foot && <div className="card-foot">{foot}</div>}
    </section>
  );
}

/** The (i) beside a term. Hover, keyboard focus or a press shows its one plain line in a raised panel the pointer can
 *  move onto; Escape hides it wherever focus is; a press elsewhere, or focus leaving, closes it. The panel is portalled to
 *  <body> and placed in the viewport (12px clear of every edge, under the icon, or over it when there is no room below),
 *  so no card, scroll box or moving parent clips it. The line is also the button's description for screen readers, from
 *  a hidden copy in place, which shows under the icon when the page runs without a script. Plain text only: no links.
 *  `topic` names the button: "About <topic>". Put it beside a heading, never inside one. */
export function Info({ topic, children }: { topic: string; children: ReactNode }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const open = !dismissed && (hover || focus || pinned);

  const enter = () => { window.clearTimeout(timer.current); setHover(true); };
  // a short grace, so the pointer can cross from the icon to the panel
  const leave = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setHover(false), 200); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Escape's "hidden" lasts until the pointer and focus have both left
  useEffect(() => { if (!hover && !focus && !pinned) setDismissed(false); }, [hover, focus, pinned]);

  const place = () => {
    const b = btn.current?.getBoundingClientRect(), el = pop.current;
    if (!b || !el) return;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, edge = 12, gap = 2;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.min(Math.max(b.left + b.width / 2 - w / 2, edge), Math.max(edge, vw - edge - w));
    const below = b.bottom + gap;
    const top = below + h > vh - edge && b.top - gap - h >= edge ? b.top - gap - h : below;
    setAt((p) => (p && p.left === Math.round(left) && p.top === Math.round(top) ? p : { left: Math.round(left), top: Math.round(top) }));
  };
  useBrowserLayoutEffect(() => { if (open) place(); else setAt(null); }, [open]);
  useEffect(() => {
    if (!open) return;
    // the panel goes at once, so it never reports the pointer leaving it: hovering ends here, and the pointer opens the
    // line again by coming back to the icon (keyboard focus keeps it hidden until focus moves away)
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      window.clearTimeout(timer.current);
      setDismissed(true); setPinned(false); setHover(false);
    };
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setPinned(false);
    };
    document.addEventListener("keydown", esc);
    document.addEventListener("pointerdown", away);
    addEventListener("scroll", place, true);
    addEventListener("resize", place);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("pointerdown", away);
      removeEventListener("scroll", place, true);
      removeEventListener("resize", place);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = () => { if (pinned) { setPinned(false); setDismissed(true); } else { setPinned(true); setDismissed(false); } };
  const panel: CSSProperties = at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: "hidden" };
  return (
    <span className="tip">
      <button ref={btn} type="button" className="info" aria-describedby={id} data-open={open || undefined}
        onMouseEnter={enter} onMouseLeave={leave} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); setPinned(false); }}
        onClick={press}>
        <Icon name="info" size={20} /><span className="sr-only">About {topic}</span>
      </button>
      <span id={id} className="tip-text">{children}</span>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={pop} className="tip-pop" style={panel} aria-hidden="true" onMouseEnter={enter} onMouseLeave={leave}>{children}</div>,
        document.body,
      )}
    </span>
  );
}

/* ---------- controls ---------- */
/** A radio group drawn as the broker page's pill switch: `label` names it for assistive tech; one Tab stop (the checked
 *  option), the arrow keys, Home and End move and pick. On a phone it spans the width and its options share it, wrapping
 *  to a new row inside the switch when they don't fit: keep option labels short. `size="sm"` sets them in the label
 *  size (still 44px tall). */
export function Segmented<T extends string | number>({ label, value, onChange, options, size = "md" }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][]; size?: "sm" | "md";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = Math.max(0, options.findIndex(([v]) => v === value));
  const keys = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = options.length;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n
        : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(options[j][0]);
    refs.current[j]?.focus();
  };
  return (
    <div className={`segm${size === "sm" ? " sm" : ""}`} role="radiogroup" aria-label={label}>
      {options.map(([v, text], i) => (
        <button key={String(v)} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === v}
          tabIndex={i === cur ? 0 : -1} onClick={() => onChange(v)} onKeyDown={(e) => keys(e, i)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** A native select as a teal-outlined pill, its label beside it (always visible, unless `hideLabel`). `full` fills the
 *  container and keeps the label for screen readers only (for panels that already title the control). Text is 1rem at
 *  every width, so phones don't zoom in. It only reports the pick: a page that wants to open another page from it puts a
 *  "Go" link or button next to it rather than navigating on change. */
export function Select<T extends string | number>({ label, value, onChange, options, full, hideLabel }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][]; full?: boolean; hideLabel?: boolean;
}) {
  return (
    <label className={`sel${full ? " full" : ""}`}>
      <span className={full || hideLabel ? "sr-only" : "sel-l"}>{label}</span>
      <span className="sel-box">
        <select value={String(value)} onChange={(e) => onChange((typeof value === "number" ? Number(e.target.value) : e.target.value) as T)}>
          {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
        </select>
        <Icon name="down" size={20} className="sel-i" />
      </span>
    </label>
  );
}

/** An on/off toggle: the whole label (44px tall) is the target. */
export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="tgl">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span className="tgl-k" /></button>
      <span>{label}</span>
    </label>
  );
}

/* ---------- figures ---------- */
/** One figure on its own small card: a label, the number, a note. Words, not colour, say whether it is good. */
export function Kpi({ label, value, sub, info }: { label: string; value: ReactNode; sub?: ReactNode; info?: ReactNode }) {
  return (
    <div className="card kpi">
      <p className="kpi-label">{label}{info && <Info topic={label}>{info}</Info>}</p>
      <p className="kpi-value">{value}</p>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  );
}

/** Status chip: an icon and a word in ink (check, cross or dash), so meaning never rides on colour. */
export function Status({ kind, children }: { kind: "good" | "bad" | "neutral"; children: ReactNode }) {
  return (
    <span className="chip">
      <Icon name={kind === "good" ? "check" : kind === "bad" ? "x" : "minus"} size={16} />{children}
    </span>
  );
}

/** A chart's key in HTML: a swatch (or a dashed line) and a word per series; it wraps instead of paging on a phone. */
export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <ul className="lgd">
      {items.map((i) => (
        <li key={i.label}>
          {i.dashed ? <span className="lgd-dash" style={{ borderColor: i.color }} aria-hidden="true" />
            : <span className="lgd-sw" style={{ background: i.color }} aria-hidden="true" />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Nothing to show for these settings: one plain line in a quiet panel, announced when it replaces a chart. */
export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="empty" role="status">{children}</div>
);

/** Whether a scroll box is wider inside than out, and whether it has been scrolled from its start; kept current as it
 *  resizes and scrolls (a table that scrolls sideways inside its card). */
export function useSideScroll(ref: RefObject<HTMLElement>, deps: unknown[] = []): { over: boolean; scrolled: boolean } {
  const [s, setS] = useState({ over: false, scrolled: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const over = el.scrollWidth > el.clientWidth + 1, scrolled = el.scrollLeft > 0;
      setS((p) => (p.over === over && p.scrolled === scrolled ? p : { over, scrolled }));
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return s;
}

/** The numbers behind a chart as a real table, collapsed under "Show as a table" (the same words under every chart): the
 *  text version for screen readers and anyone who wants to copy them. The first column names the row; a wide table
 *  scrolls sideways inside the card with that column pinned. `caption` names the table (read with it, and after "Show
 *  as a table" for screen readers when a page has several). */
export function ChartTable({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const { over } = useSideScroll(box);
  return (
    <details className="ctab">
      <summary>
        <span className="ct-show">Show as a table</span><span className="ct-hide">Hide the table</span>
        {caption && <span className="sr-only">: {caption}</span>}
        <Icon name="down" size={20} />
      </summary>
      {/* focusable only when it scrolls, so a keyboard can scroll it */}
      <div ref={box} className="tbox" tabIndex={over ? 0 : undefined} role={over ? "region" : undefined}
        aria-label={over ? `${caption ?? "Table"}, scrolls sideways` : undefined}>
        <table className="tbl">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>{head.map((h, i) => <th key={i} scope="col" className={i ? "num" : undefined}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j} className="num">{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
