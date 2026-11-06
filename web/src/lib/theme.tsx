// Theme state and the resolved colour tokens the charts need as plain hex.
// The page follows the system's light or dark setting until the visitor picks a theme with the header switch; the pick is
// saved and wins from then on (index.html applies it to <html> before first paint, so there is no flash).
// The tokens are read from index.css itself (imported as text), so they are the same on the server, where there is no
// computed style, and in the browser; index.css stays the one place the palette is defined.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import css from "../index.css?raw";
import { useBrowserLayoutEffect } from "./hooks";

export interface Tokens {
  dark: boolean;
  page: string; surface: string; surface2: string;
  ink: string; ink2: string; muted: string; grid: string; baseline: string; border: string;
  /** the scale's end-dot grey (non-text marks, 3:1 on the card) and its rail */
  mark: string; track: string;
  /** the Here tint: the row (or a chart's band) of the broker the page is about */
  here: string;
  accent: string; accent2: string;
  s: string[];
  /** each series colour's edge on the card, for a mark that needs 3:1 there: its own colour where that already reaches
   *  it, else the same hue's deeper step (the dark theme's, which does; light idle-cash pink, margin amber, commissions
   *  green) */
  rim: string[];
  better: string; worse: string; context: string; neutral: string;
  good: string; warning: string; critical: string;
  seq: string[];
  /** the neutral ramp, ink to light sage (each 3:1 on the card): a chart's parts where the series colours name firms */
  ramp: string[];
  /** the raised panel's shadow (the chart tooltip's), as CSS */
  pop: string;
}

/** The custom properties of each `:root` block in index.css (comments stripped first): a block whose selector names
 *  [data-theme="dark"] or :not([data-theme="light"]) (the system's dark mode) declares dark, every other one light. */
const VARS: Record<"dark" | "light", Record<string, string>> = (() => {
  const out = { dark: {} as Record<string, string>, light: {} as Record<string, string> };
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of text.matchAll(/(:root[^{]*)\{([^}]*)\}/g)) {
    const mode = /data-theme="dark"|:not\(\[data-theme="light"\]\)/.test(m[1]) ? "dark" : "light";
    for (const v of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[mode][v[1]] = v[2].trim();
  }
  return out;
})();

/** WCAG contrast of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function read(dark: boolean): Tokens {
  const vars = VARS[dark ? "dark" : "light"];
  const v = (n: string) => vars[n.replace(/^--/, "")] ?? "";
  const s = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--s${i}`)), surface = v("--surface");
  const hex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);
  return {
    dark,
    page: v("--page"), surface: v("--surface"), surface2: v("--surface-2"),
    ink: v("--ink"), ink2: v("--ink-2"), muted: v("--muted"), grid: v("--grid"), baseline: v("--baseline"), border: v("--border"),
    mark: v("--mark"), track: v("--track"), here: v("--here"),
    accent: v("--accent"), accent2: v("--accent-2"),
    s,
    rim: s.map((c, i) => (!hex(c) || !hex(surface) || contrast(c, surface) >= 3 ? c : VARS.dark[`s${i + 1}`] ?? c)),
    better: v("--better"), worse: v("--worse"), context: v("--context"), neutral: v("--neutral"),
    good: v("--good"), warning: v("--warning"), critical: v("--critical"),
    seq: [0, 1, 2, 3, 4].map((i) => v(`--seq-${i}`)),
    ramp: [1, 2, 3].map((i) => v(`--ramp-${i}`)),
    pop: v("--pop"),
  };
}

const KEY = "theme"; // localStorage: "light" or "dark" once the visitor has picked one (index.html reads the same key)
const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/** The browser's address-bar colour follows the page ground: both metas (light and dark system) take the picked theme's. */
function paintBrowser(theme: "light" | "dark") {
  const ground = VARS[theme].page;
  if (ground) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", ground));
}

const Ctx = createContext<{ dark: boolean; toggle: () => void; t: Tokens } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // light until the browser says otherwise: what is painted is decided by the CSS (system setting or the saved pick on
  // <html data-theme>), and the state that feeds the charts is read in an effect, never while rendering, so the server and
  // the first browser render agree
  const [dark, setDark] = useState(false);
  useBrowserLayoutEffect(() => {
    const root = document.documentElement;
    const sys = window.matchMedia(SYSTEM_DARK);
    const sync = () => {
      const picked = root.dataset.theme;
      setDark(picked === "dark" || (picked !== "light" && sys.matches));
    };
    sync();
    // the system setting can change while the page is open (sunset, a manual switch); it only matters until a pick is saved
    sys.addEventListener("change", sync);
    return () => sys.removeEventListener("change", sync);
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: the choice just won't persist */ }
    paintBrowser(next);
    setDark(!dark);
  };
  const t = useMemo(() => read(dark), [dark]);
  return <Ctx.Provider value={{ dark, toggle, t }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx)!;
