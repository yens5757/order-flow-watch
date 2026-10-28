// Theme state (dark by default) and the resolved colour tokens the charts need as plain hex.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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

function read(dark: boolean): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
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
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme !== "light");
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next; // before re-render, so read() sees the new values
    try { localStorage.setItem("theme", next); } catch { /* private mode: the choice just won't persist */ }
    setDark(!dark);
  };
  const t = useMemo(() => read(dark), [dark]);
  return <Ctx.Provider value={{ dark, toggle, t }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx)!;
