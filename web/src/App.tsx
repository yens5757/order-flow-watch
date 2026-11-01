import { useEffect, useRef, useState } from "react";
import { Icon } from "./components/ui";
import { loadData, type Data, type Filters } from "./lib/data";
import { monthShort, quarterShort } from "./lib/format";
import { useRoute } from "./lib/hooks";
import { useTheme } from "./lib/theme";
import AllFirms from "./pages/AllFirms";
import BrokerProfile from "./pages/BrokerProfile";
import Calculator from "./pages/Calculator";
import Compare from "./pages/Compare";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import MarketMakers from "./pages/MarketMakers";
import Method from "./pages/Method";

const NAV: [string, string][] = [["", "Home"], ["compare", "Compare"], ["calculator", "Calculator"], ["explore", "Brokers"], ["market-makers", "Market makers"], ["method", "Method"]];
const DEFAULT_PAIR = ["HOOD", "FIBS"]; // #/compare with no brokers named

/** <title> and meta description per page, so search results and shared links say what the page is about. */
function describe(page: string, route: string[], short: (id: string) => string): string {
  switch (page) {
    case "explore": return "Compare every US broker's fills, fees and payments";
    case "broker": return `${short(route[1] || "HOOD")} execution quality and fees: what a $10,000 trade really costs`;
    case "compare": return `${short(route[1] || DEFAULT_PAIR[0])} vs ${short(route[2] || DEFAULT_PAIR[1])}: fills, fees and what you'd pay`;
    case "calculator": return "Brokerage cost calculator: what your broker costs you per year";
    case "market-makers": return "Market makers compared on identical trades";
    case "method": return "How Order Flow Watch measures brokers";
    case "firms": return "Every firm that files a Rule 605 execution quality report";
    default: return "Order Flow Watch: which broker gets you the best price on a trade?";
  }
}
const REPO = "https://github.com/yens5757/order-flow-watch";

export default function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const route = useRoute();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setFilters({ sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false });
    }).catch((e) => setError(String(e.message ?? e)));
  }, []);
  const set = (p: Partial<Filters>) => setFilters((f) => (f ? { ...f, ...p } : f));
  const page = route[0] === "brokers" ? "explore" : route[0] ?? ""; // old links to #/brokers still work
  const active = page === "broker" || page === "firms" ? "explore" : page;

  useEffect(() => {
    const text = describe(page, route, (id) => data?.byId[id]?.short ?? id);
    document.title = text.startsWith("Order Flow Watch") ? text : `${text} · Order Flow Watch`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", text);
  }, [page, route, data]);

  // on phones the nav is a scroller on its own row: the current page's link is scrolled into view, and a chevron
  // shows while there are more links to the right (the fade alone looked like a rendering glitch)
  const nav = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const check = () => setMore(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);
  useEffect(() => {
    // centred, so the current link never sits under the fade or the chevron
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);
  const BTN = "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-ink2 hover:border-accent hover:text-ink";

  return (
    <div className="min-h-screen overflow-x-clip bg-page font-sans text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--page)_82%,transparent)] backdrop-blur-md">
        {/* phones: brand and buttons on the first row, the page links on a full-width second row; one row from sm up */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 px-4 sm:h-16 sm:flex-nowrap sm:gap-6">
          <a href="#/" className="flex h-12 shrink-0 items-center gap-2.5 font-display text-[15px] font-bold text-ink sm:h-auto sm:text-[16px]">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] text-white shadow-card" style={{ background: "var(--grad)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l5-5 4 4 7-8" /></svg>
            </span>
            Order Flow Watch
          </a>
          <div className="relative min-w-0 flex-1 max-sm:order-last max-sm:-mx-4 max-sm:basis-[calc(100%+2rem)]">
            <nav ref={nav} aria-label="Pages"
              className={`flex h-10 items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] after:block after:w-10 after:shrink-0 sm:-mx-1 sm:h-auto sm:px-1 sm:after:hidden ${more ? "[mask-image:linear-gradient(to_right,#000_82%,transparent)]" : ""}`}>
              {NAV.map(([path, label]) => (
                <a key={path} href={`#/${path}`} aria-current={active === path ? "page" : undefined}
                  className={`relative whitespace-nowrap rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${active === path ? "bg-surface2 text-ink" : "text-ink2 hover:bg-surface2/60 hover:text-ink"}`}>
                  {label}
                </a>
              ))}
            </nav>
            {more && (
              <button type="button" aria-label="More pages" onClick={() => nav.current?.scrollBy({ left: 160, behavior: "smooth" })}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border border-line bg-page text-ink2 shadow-card hover:border-accent hover:text-ink sm:-right-3">
                <Icon name="right" size={16} />
              </button>
            )}
          </div>
          {data && (
            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-muted lg:inline-flex" title={`Built ${data.meta.built}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" />Fills {monthShort(data.meta.month)} · Payments {quarterShort(data.meta.quarter)}
            </span>
          )}
          <span className="flex items-center gap-2 max-sm:ml-auto">
            <a href={REPO} target="_blank" rel="noopener" aria-label="Source code on GitHub" className={BTN}><Icon name="github" size={17} /></a>
            <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className={BTN}>
              <Icon name={dark ? "sun" : "moon"} size={17} />
            </button>
          </span>
        </div>
      </header>

      {/* focusable so a route change can move focus here (lib/hooks.ts), as a page load would */}
      <main tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-24 outline-none">
        {error ? <div className="mx-auto max-w-xl py-24 text-center text-ink2">{error}</div>
          : !data || !filters ? (
            <div className="grid place-items-center py-40 text-muted">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[var(--accent)]" />
              <span className="mt-4 text-[13.5px]">Loading the latest reports…</span>
            </div>
          )
          : page === "explore" ? <Explore d={data} />
          : page === "broker" ? <BrokerProfile key={route[1]} d={data} f={filters} set={set} id={route[1] ?? "HOOD"} />
          : page === "compare" ? <Compare key={`${route[1]}-${route[2]}`} d={data} f={filters} set={set} a={route[1] || DEFAULT_PAIR[0]} b={route[2] || DEFAULT_PAIR[1]} />
          : page === "calculator" ? <Calculator d={data} />
          : page === "market-makers" ? <MarketMakers d={data} f={filters} set={set} />
          : page === "firms" ? <AllFirms d={data} f={filters} set={set} />
          : page === "method" ? <Method d={data} />
          : <Home d={data} />}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-muted">
          <span>Built from SEC Rule 605 and 606 disclosures, refreshed every Monday. Not investment advice.{data && <> Built {data.meta.built}.</>}</span>
          <span className="flex items-center gap-4">
            <a href="https://yens5757.github.io/" className="hover:text-ink">Made by Aiken Lee</a>
            <a href={REPO} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 hover:text-ink"><Icon name="github" size={15} />Source</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
