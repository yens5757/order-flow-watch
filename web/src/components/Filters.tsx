// One row of filters on the page ground. On a desktop (1024px and up) it sticks to the top of the window while the charts
// scroll, but only while it fits on one short row (a bar that wraps onto a second row scrolls away like any content),
// with a hairline under it once it has stuck; the page's scroll padding follows its height (ui.css), so a focused control
// or an in-page jump is never hidden behind it. Below 1024px it always scrolls away with the page.
import { useEffect, useRef, useState } from "react";
import { BUCKETS, type Data, type Filters, type Ot, type Sp } from "../lib/data";
import { monthLong, quarterLong } from "../lib/format";
import { Info, Segmented, Select, Switch } from "./ui";

type Key = "sp" | "ot" | "b" | "month" | "quarter" | "clearing";

export function FilterBar({ d, f, set, show }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; show: Key[] }) {
  const bar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    // its height, for the scroll padding that keeps focus clear of it where it sticks; taller than one row of controls
    // (52px, plus its 12px padding top and bottom) means it has wrapped, and a wrapped bar doesn't stick
    const measure = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      root.style.setProperty("--fbar-h", `${h}px`);
      setTall(h > 84);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // stuck: its top has reached the window's top while the page goes on scrolling (sticky only from 1024px)
    const wide = window.matchMedia("(min-width: 1024px)");
    const check = () => setStuck(wide.matches && Math.round(el.getBoundingClientRect().top) <= 0 && window.scrollY > 0);
    check();
    addEventListener("scroll", check, { passive: true });
    wide.addEventListener("change", check);
    return () => {
      ro.disconnect();
      removeEventListener("scroll", check);
      wide.removeEventListener("change", check);
      root.style.removeProperty("--fbar-h");
    };
  }, []);

  return (
    <div ref={bar} className={`fbar${tall ? " is-tall" : stuck ? " is-stuck" : ""}`} role="group" aria-label="Filters">
      {show.includes("sp") && <Segmented<Sp> label="Stocks" value={f.sp} onChange={(sp) => set({ sp })} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />}
      {show.includes("ot") && (
        <span className="fbar-item">
          <Segmented<Ot> label="Order type" value={f.ot} onChange={(ot) => set({ ot })} options={[["M", "Market orders"], ["ML", "Marketable limit"]]} />
          <Info topic="order types">Market orders fill at once; marketable limit orders add a price cap.</Info>
        </span>
      )}
      {show.includes("b") && <Select<number> label="Order size" value={f.b} onChange={(b) => set({ b })} options={BUCKETS} />}
      {show.includes("month") && d.meta.months.length > 1 &&
        <Select label="Prices from" value={f.month} onChange={(month) => set({ month })} options={d.meta.months.map((m) => [m, monthLong(m)])} />}
      {show.includes("quarter") &&
        <Select label="Payments from" value={f.quarter} onChange={(quarter) => set({ quarter })} options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)])} />}
      {show.includes("clearing") && (
        <span className="fbar-item">
          <Switch label="Show Apex Clearing" checked={f.clearing} onChange={(clearing) => set({ clearing })} />
          <Info topic="Apex Clearing">Apex routes orders for several brokers; you can't open an account there.</Info>
        </span>
      )}
    </div>
  );
}
