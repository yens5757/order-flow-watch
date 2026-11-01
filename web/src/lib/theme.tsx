// Theme state (dark by default) and the resolved colour tokens the charts need as plain hex.
// The tokens are read from index.css itself (imported as text), so they are the same on the server, where there is no
// computed style, and in the browser; index.css stays the one place the palette is defined.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import css from "../index.css?raw";
import { useBrowserLayoutEffect } from "./hooks";

export interface Tokens {
  dark: boolean;
  page: string; surface: string; surface2: string;
  ink: string; ink2: string; muted: string; grid: string; baseline: string; border: string;
  accent: string; accent2: string;
  s: string[];
  better: string; worse: string; context: string; neutral: string;
  good: string; warning: string; critical: string;
  seq: string[];
}

/** The custom properties of each `:root` block in index.css: the first declares dark (the default), the one selected by
 *  [data-theme="light"] declares light. */
const VARS: Record<"dark" | "light", Record<string, string>> = (() => {
  const out = { dark: {} as Record<string, string>, light: {} as Record<string, string> };
  for (const m of css.matchAll(/(:root[^{]*)\{([^}]*)\}/g)) {
    const mode = /data-theme="light"/.test(m[1]) ? "light" : "dark";
    for (const v of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[mode][v[1]] = v[2].trim();
  }
  return out;
})();

function read(dark: boolean): Tokens {
  const vars = VARS[dark ? "dark" : "light"];
  const v = (n: string) => vars[n.replace(/^--/, "")] ?? "";
  return {
    dark,
    page: v("--page"), surface: v("--surface"), surface2: v("--surface-2"),
    ink: v("--ink"), ink2: v("--ink-2"), muted: v("--muted"), grid: v("--grid"), baseline: v("--baseline"), border: v("--border"),
    accent: v("--accent"), accent2: v("--accent-2"),
    s: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--s${i}`)),
    better: v("--better"), worse: v("--worse"), context: v("--context"), neutral: v("--neutral"),
    good: v("--good"), warning: v("--warning"), critical: v("--critical"),
    seq: [0, 1, 2, 3, 4].map((i) => v(`--seq-${i}`)),
  };
}

const Ctx = createContext<{ dark: boolean; toggle: () => void; t: Tokens } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // dark until the browser says otherwise: the saved choice (index.html applies it to <html> before first paint) is read
  // in an effect, never while rendering, so the same render works on the server
  const [dark, setDark] = useState(true);
  useBrowserLayoutEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("theme"); } catch { /* private mode: no saved choice */ }
    const light = saved ? saved === "light" : document.documentElement.dataset.theme === "light";
    document.documentElement.dataset.theme = light ? "light" : "dark";
    if (light) setDark(false);
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* private mode: the choice just won't persist */ }
    setDark(!dark);
  };
  const t = useMemo(() => read(dark), [dark]);
  return <Ctx.Provider value={{ dark, toggle, t }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx)!;
