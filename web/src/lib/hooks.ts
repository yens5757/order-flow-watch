// Browser-side navigation: history, the current location and the query string. Everything here touches window,
// so it is only ever called from effects and event handlers (never while rendering: the pages also render on the
// server, see entry-server.tsx). The pure path logic lives in routes.ts.
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { Data } from "./data";
import { BASE, href, normalizeLocation } from "./routes";

export interface Loc { path: string; search: string }

/** The current page path (relative to the base, e.g. "brokers/robinhood/") and query string ("?m=gap" or ""). */
export function readLocation(): Loc {
  const p = location.pathname;
  return { path: p.startsWith(BASE) ? p.slice(BASE.length) : p.replace(/^\/+/, ""), search: location.search };
}

type Listener = () => void;
const listeners = new Set<Listener>();
/** Called after every navigation, once history holds the new URL: the app's own (`go`, an internal link) and the
 *  browser's (back and forward). Pages whose state lives in the query string listen for same-page changes.
 *  Returns the unsubscribe function, so it can be the body of a useEffect. */
export function onNavigate(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
/** Tells every listener the URL changed (App calls it on popstate). */
export const navigated = () => { for (const l of [...listeners]) l(); };

/** Opens a page path (with any query and hash), e.g. go("brokers/robinhood/"), go("calculator/?b=fidelity") or
 *  go("trading-firms/#robinhood") (that page reads the hash to open the broker's section). */
export function go(path: string) {
  const url = href(path);
  if (url === location.pathname + location.search + location.hash) return; // the hash router ignored a change to the same route too
  history.pushState(null, "", url);
  navigated();
}

/** Settings carried in the query string, e.g. brokers/?m=cost10k&vs=pay10k, so views can be linked and shared. */
export const readQuery = (search: string) => new URLSearchParams(search);
export function writeQuery(q: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v != null && v !== "" && v !== false) p.set(k, String(v));
  const s = p.toString();
  history.replaceState(null, "", `${location.pathname}${s ? `?${s}` : ""}`); // no navigation event: keeps scroll position
}

/** Rewrites an old-style URL in place (a #/ hash route, an old path name, a comparison in the other order): see
 *  normalizeLocation. Returns true when the URL changed. Run before the first render and on popstate. */
export function fixLocation(d: Data): boolean {
  const { path, search } = readLocation();
  const fixed = normalizeLocation(d, path, search, location.hash);
  if (!fixed) return false;
  // a #/ hash was the old route itself; any other hash (trading-firms/#robinhood) is an anchor and comes along
  history.replaceState(null, "", href(fixed.path) + fixed.search + (location.hash.startsWith("#/") ? "" : location.hash));
  return true;
}

/** useLayoutEffect in the browser (state read from localStorage lands before the first paint), a plain effect on the server. */
export const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** A box's width, kept current as it resizes (0 until measured, and on the server); a change waits 150ms to settle, so
 *  dragging a window edge doesn't rebuild a chart laid out for its width on every frame. `on`: the box is on the page. */
export function useWidth(ref: RefObject<HTMLElement>, on = true): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let timer: number | undefined;
    const read = () => setW(Math.round(el.getBoundingClientRect().width));
    read();
    const ro = new ResizeObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(read, 150); });
    ro.observe(el);
    return () => { ro.disconnect(); window.clearTimeout(timer); };
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  return w;
}
