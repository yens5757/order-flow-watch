import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Width of an element, kept current with ResizeObserver (charts redraw to fit). */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    // Measure now: some browsers (and embedded frames) deliver the first observer callback late
    setWidth(Math.floor(ref.current.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Hash routes (#/explore, #/broker/HOOD): no server config needed on GitHub Pages. */
export function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, "") || "").split("/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo({ top: 0 }); };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}
export const go = (path: string) => { location.hash = `/${path}`; };

export function useTheme() {
  const [, force] = useState(0);
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const toggle = () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* private mode: theme just won't persist */ }
    force((n) => n + 1);
  };
  return { dark: isDark(), toggle };
}
