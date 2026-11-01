import { useEffect, useState } from "react";

const parts = () => (location.hash.replace(/^#\/?/, "").split("?")[0] || "").split("/");

/** Hash routes (#/explore, #/broker/HOOD): no server config needed on GitHub Pages. */
export function useRoute() {
  const [route, setRoute] = useState(parts);
  useEffect(() => {
    const on = () => {
      setRoute(parts());
      window.scrollTo({ top: 0 });
      // a new page for a screen reader too: focus lands on <main>, not wherever it was on the old page
      (document.querySelector("main") as HTMLElement | null)?.focus({ preventScroll: true });
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}
export const go = (path: string) => { location.hash = `/${path}`; };

/** Settings carried in the hash after "?", e.g. #/explore?m=cost10k&vs=pay10k, so views can be linked and shared. */
export const readQuery = () => new URLSearchParams(location.hash.split("?")[1] ?? "");
export function writeQuery(q: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v != null && v !== "" && v !== false) p.set(k, String(v));
  const s = p.toString();
  history.replaceState(null, "", `#/${parts().join("/")}${s ? `?${s}` : ""}`); // no hashchange: keeps scroll position
}
