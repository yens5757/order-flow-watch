import { useEffect, useState } from "react";

/** Hash routes (#/brokers, #/broker/HOOD): no server config needed on GitHub Pages. */
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
