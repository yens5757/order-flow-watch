// The site's signature: a neutral scale that places one broker among all of them, cheapest · this broker's dot ·
// typical (the median) · most expensive, each at its true position. Drawn with CSS (broker.css), no chart library.
// Given two sets (S&P 500 and other stocks) it follows the page's stock switch and the dot glides between them.
import type { CSSProperties } from "react";
import { scalePositions, type ScaleData } from "../../lib/broker";

type G = "sp" | "ot";
type Align = "center" | "start" | "end";

/** Labels near an end turn inward so they never run off the scale (a dot at 3% gets its name to the right). */
const alignOf = (p: number): Align => (p < 15 ? "start" : p > 85 ? "end" : "center");
/** The dot's name sits over the dot: centred, or flush with the dot's outer edge near an end (--r is the dot's radius). */
const dotShift = (a: Align) => (a === "center" ? "-50%" : a === "start" ? "calc(var(--r) * -1)" : "calc(-100% + var(--r))");
const tickShift = (a: Align) => (a === "center" ? "-50%" : a === "start" ? "0%" : "-100%");
const pct = (v: number) => `${v.toFixed(2)}%`;

/** One set's positions as custom properties; `suffix` names the stock group on a scale that follows the switch. */
function vars(s: ScaleData, suffix: string): Record<string, string> {
  const p = scalePositions(s);
  const you = p.you ?? 50;
  return {
    [`--lo${suffix}`]: pct(p.lo), [`--hi${suffix}`]: pct(p.hi), [`--typ${suffix}`]: pct(p.typ), [`--you${suffix}`]: pct(you),
    [`--youx${suffix}`]: dotShift(alignOf(you)), [`--typx${suffix}`]: tickShift(alignOf(p.typ)),
  };
}

/** "From cheapest to most expensive: Fidelity −$0.09, Robinhood $0.82, typical broker $0.96, eToro $1.77." */
function describe(s: ScaleData, fmt: (v: number) => string, typFmt: (v: number) => string): string {
  const items: { name: string; v: number; text: string }[] = [
    { name: s.lo.name, v: s.lo.v, text: `${s.lo.name} ${fmt(s.lo.v)}` },
    { name: "typical", v: s.typ, text: `typical broker ${typFmt(s.typ)}` },
    { name: s.hi.name, v: s.hi.v, text: `${s.hi.name} ${fmt(s.hi.v)}` },
  ];
  if (s.you && s.you.name !== s.lo.name && s.you.name !== s.hi.name) items.push({ name: s.you.name, v: s.you.v, text: `${s.you.name} ${fmt(s.you.v)}` });
  items.sort((a, b) => a.v - b.v);
  return `From cheapest to most expensive: ${items.map((i) => i.text).join(", ")}.`;
}

export interface ScaleSet { g?: G; data: ScaleData }

/** One set: a fixed scale. Two sets (sp, then ot): one scale whose marks move with the stock switch. */
export function Scale({ sets, fmt, typFmt = fmt, small }: {
  sets: ScaleSet[]; fmt: (v: number) => string; typFmt?: (v: number) => string; small?: boolean;
}) {
  const follows = sets.length === 2;
  const style = (follows ? { ...vars(sets[0].data, "-sp"), ...vars(sets[1].data, "-ot") } : vars(sets[0].data, "")) as CSSProperties;
  const you = sets.find((s) => s.data.you)?.data.you ?? null;
  const each = (render: (s: ScaleData) => string) => sets.map((s, i) => <span key={s.g ?? i} data-g={follows ? s.g : undefined}>{render(s.data)}</span>);
  return (
    <>
      <div className={`scale${follows ? " sw" : ""}${small ? " sm" : ""}`} style={style} aria-hidden="true">
        <div className="sc-rail">
          <span className="sc-track" />
          <span className="sc-end" />
          <span className="sc-end r" />
          <span className="sc-typ" />
          {you && <><b className="sc-you-l">{you.name}</b><span className="sc-you" /></>}
        </div>
        <div className="sc-mid"><span className="sc-typ-l">Typical <b>{each((s) => typFmt(s.typ))}</b></span></div>
        <div className="sc-ends">
          <p className="sc-lab"><small>Cheapest</small>{each((s) => `${s.lo.name} ${fmt(s.lo.v)}`)}</p>
          <p className="sc-lab r"><small>Most expensive</small>{each((s) => `${s.hi.name} ${fmt(s.hi.v)}`)}</p>
        </div>
      </div>
      {sets.map((s, i) => <p key={s.g ?? i} className="sr-only" data-g={follows ? s.g : undefined}>{describe(s.data, fmt, typFmt)}</p>)}
    </>
  );
}
