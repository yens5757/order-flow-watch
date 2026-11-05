// The site's signature: a neutral scale that places brokers among all of them, cheapest · a broker's dot · typical (the
// median) · most expensive, each at its true position. Drawn with CSS (scale.css), no chart library.
// One dot (ScaleData.you): the broker page's scale, the name centred over the dot (turned inward near an end). Given two
// sets (S&P 500 and other stocks) it follows the broker page's stock switch and the dot glides between them.
// Several dots (`you` plus ScaleData.marks, or marks alone: Compare's two brokers): every dot the same ink, each name over
// its own dot, and names that would run into each other stacked in rows (judged for the narrowest phone until the page
// has measured the scale's real width). A page that re-renders the scale with new values (React state, not the CSS
// switch) sees every dot glide to its new place.
import { Fragment, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { scalePositions, type ScaleData } from "../../lib/broker";
import { useBrowserLayoutEffect } from "../../lib/hooks";
import "./scale.css";

type G = "sp" | "ot";
type Align = "center" | "start" | "end";

/** Labels near an end turn inward so they never run off the scale (a dot at 3% gets its name to the right). */
const alignOf = (p: number): Align => (p < 15 ? "start" : p > 85 ? "end" : "center");
/** The dot's name sits over the dot: centred, or flush with the dot's outer edge near an end (--r is the dot's radius). */
const dotShift = (a: Align) => (a === "center" ? "-50%" : a === "start" ? "calc(var(--r) * -1)" : "calc(-100% + var(--r))");
const tickShift = (a: Align) => (a === "center" ? "-50%" : a === "start" ? "0%" : "-100%");
const pct = (v: number) => `${v.toFixed(2)}%`;

/** Every named dot of a set (`you` first, then the marks) with its position. */
function dotsOf(s: ScaleData): { name: string; v: number; p: number }[] {
  const p = scalePositions(s);
  return [...(s.you ? [{ ...s.you, p: p.you ?? 50 }] : []), ...(s.marks ?? []).map((m, i) => ({ ...m, p: p.marks[i] }))];
}

/** The width the names are judged against before the page has measured the scale (and in the pre-render): a scale about
 *  250px wide, on a 320px phone, so names placed side by side clear each other on every screen. */
const NARROWEST = 250;

/** How near a dot can sit to the typical tick before its ring would cut the tick into a stray "[" beside it: the dot's
 *  radius, its 3px ring and half the tick (11 + 3 + 2, or 9 + 3 + 2 on the small scale), and a pixel to spare. */
const clearance = (small?: boolean) => (small ? 15 : 17);

/** One set's positions as custom properties; `suffix` names the stock group on a scale that follows the switch. `--tn`
 *  is 1 when a dot covers the typical tick on a scale `w` pixels wide: the tick then hangs from the rail's lower edge
 *  down towards its "Typical" label, clear of the dot, instead of showing as a sliver beside it (scale.css). */
function vars(s: ScaleData, suffix: string, w: number, small?: boolean): Record<string, string> {
  const p = scalePositions(s);
  const you = p.you ?? 50;
  const near = dotsOf(s).some((d) => (Math.abs(d.p - p.typ) * w) / 100 < clearance(small));
  return {
    [`--lo${suffix}`]: pct(p.lo), [`--hi${suffix}`]: pct(p.hi), [`--typ${suffix}`]: pct(p.typ), [`--you${suffix}`]: pct(you),
    [`--youx${suffix}`]: dotShift(alignOf(you)), [`--typx${suffix}`]: tickShift(alignOf(p.typ)), [`--tn${suffix}`]: near ? "1" : "0",
  };
}

/** How far a name reaches along a scale `w` pixels wide, in percent of it, from where its alignment anchors it: a
 *  700-weight character about 9.25px, 7.5px to spare, and an end name starting 11px outside its dot. */
function reach(name: string, p: number, w: number): [number, number] {
  const k = 100 / w, len = (name.length * 9.25 + 7.5) * k, out = 11.25 * k, a = alignOf(p);
  return a === "center" ? [p - len / 2, p + len / 2] : a === "start" ? [p - out, p - out + len] : [p + out - len, p + out];
}

/** The row each name sits in (0 = top), left to right: the first row where it clears the names already there. */
function rowsOf(dots: { name: string; p: number }[], w: number): number[] {
  const order = dots.map((_, i) => i).sort((a, b) => dots[a].p - dots[b].p);
  const ends: number[] = []; // per row, where its last name ends
  const rows = dots.map(() => 0);
  const gap = 3.75 * (100 / w);
  for (const i of order) {
    const [from, to] = reach(dots[i].name, dots[i].p, w);
    let row = ends.findIndex((e) => from > e + gap);
    if (row < 0) { row = ends.length; ends.push(to); } else ends[row] = to;
    rows[i] = row;
  }
  return rows;
}

/** "From cheapest to most expensive: Fidelity $0.09 below, Robinhood $0.82, typical broker $0.96, eToro $1.77." */
function describe(s: ScaleData, fmt: (v: number) => string): string {
  const items: { v: number; text: string }[] = [
    { v: s.lo.v, text: `${s.lo.name} ${fmt(s.lo.v)}` },
    { v: s.typ, text: `typical broker ${fmt(s.typ)}` },
    { v: s.hi.v, text: `${s.hi.name} ${fmt(s.hi.v)}` },
  ];
  for (const m of [...(s.you ? [s.you] : []), ...(s.marks ?? [])]) {
    if (m.name !== s.lo.name && m.name !== s.hi.name) items.push({ v: m.v, text: `${m.name} ${fmt(m.v)}` });
  }
  items.sort((a, b) => a.v - b.v);
  return `From cheapest to most expensive: ${items.map((i) => i.text).join(", ")}.`;
}

export interface ScaleSet { g?: G; data: ScaleData }

/** One set: a fixed scale. Two sets (sp, then ot): one scale whose marks move with the broker page's stock switch.
 *  `fmt` writes every figure on it, the typical one too (one format per scale: "Typical $8.40" beside "Webull $21.34"),
 *  `small` is the secondary cards' size. */
export function Scale({ sets: given, fmt, small }: {
  sets: ScaleSet[]; fmt: (v: number) => string; small?: boolean;
}) {
  // a lone mark is drawn as `you` (one dot, centred name)
  const sets = given.map((s) => (!s.data.you && s.data.marks?.length === 1 ? { ...s, data: { ...s.data, you: s.data.marks[0], marks: undefined } } : s));
  const follows = sets.length === 2;
  const each = (render: (s: ScaleData) => string) => sets.map((s, i) => <span key={s.g ?? i} data-g={follows ? s.g : undefined}>{render(s.data)}</span>);
  const many = sets.some((s) => dotsOf(s.data).length > 1);

  // once in the browser, judge names and the typical tick against the scale's real width (kept current as it resizes), so
  // names that fit side by side on a wide card share a row and the tick hangs only where a dot really covers it; the
  // pre-render and the first paint use the narrowest phone's
  const rail = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(NARROWEST);
  const [live, setLive] = useState(false);
  useBrowserLayoutEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => { if (el.clientWidth > 0) setW(Math.max(120, Math.round(el.clientWidth))); };
    measure(); // before the first paint after a client-side navigation
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // the tick's drop below the rail glides only once the measured scale has been drawn, so no page opens with it moving
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setLive(true)); });
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  const style: Record<string, string> = follows
    ? { ...vars(sets[0].data, "-sp", w, small), ...vars(sets[1].data, "-ot", w, small) }
    : vars(sets[0].data, "", w, small);

  let dots: ReactNode;
  if (!many) {
    // one dot: its name centred over it, gliding with the switch
    const you = sets.find((s) => s.data.you)?.data.you ?? null;
    dots = you && <><b className="sc-you-l">{you.name}</b><span className="sc-you" /></>;
  } else {
    // several: each set's dots in a layer of their own (the shown group's, when the scale follows the switch), the rail
    // lowered by one 22px row for every row of names past the first
    let deepest = 0;
    dots = sets.map((s, k) => {
      const ds = dotsOf(s.data), rows = rowsOf(ds, w);
      deepest = Math.max(deepest, ...rows);
      // keyed by slot, not name: when a page swaps one broker for another, its dot glides to the new place
      const layer = ds.map((d, i) => (
        <Fragment key={i}>
          <b className="sc-you-l sc-mk" style={{ "--m": pct(d.p), "--mx": dotShift(alignOf(d.p)), "--mrow": String(rows[i]) } as CSSProperties}>{d.name}</b>
          <span className="sc-you sc-mk" style={{ "--m": pct(d.p) } as CSSProperties} />
        </Fragment>
      ));
      return follows ? <span key={s.g ?? k} className="sc-layer" data-g={s.g}>{layer}</span> : <Fragment key={k}>{layer}</Fragment>;
    });
    style["--sc-up"] = `${deepest * 22}px`;
  }

  return (
    <>
      <div className={`scale${follows ? " sw" : ""}${small ? " sm" : ""}${many ? " many" : ""}${live ? " live" : ""}`} style={style as CSSProperties} aria-hidden="true">
        <div ref={rail} className="sc-rail">
          <span className="sc-track" />
          <span className="sc-end" />
          <span className="sc-end r" />
          <span className="sc-typ" />
          {dots}
        </div>
        <div className="sc-mid"><span className="sc-typ-l">Typical <b>{each((s) => fmt(s.typ))}</b></span></div>
        <div className="sc-ends">
          <p className="sc-lab"><small>Cheapest</small>{each((s) => `${s.lo.name} ${fmt(s.lo.v)}`)}</p>
          <p className="sc-lab r"><small>Most expensive</small>{each((s) => `${s.hi.name} ${fmt(s.hi.v)}`)}</p>
        </div>
      </div>
      {sets.map((s, i) => <p key={s.g ?? i} className="sr-only" data-g={follows ? s.g : undefined}>{describe(s.data, fmt)}</p>)}
    </>
  );
}
