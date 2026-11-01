import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./components/ui";
import { asData, type Data, type Filters, type Raw } from "./lib/data";
import { dayLong, monthShort, quarterShort } from "./lib/format";
import { fixLocation, go, navigated, onNavigate, readLocation, type Loc } from "./lib/hooks";
import { BASE, describeRoute, href, pagePath, parseRoute, type PageName } from "./lib/routes";
import { REPO, SITE_NAME } from "./lib/site";
import { useTheme } from "./lib/theme";
import AllFirms from "./pages/AllFirms";
import BrokerProfile from "./pages/BrokerProfile";
import Calculator from "./pages/Calculator";
import Compare from "./pages/Compare";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import MarketMakers from "./pages/MarketMakers";
import Method from "./pages/Method";

// "How we measure" stays a page but lives in the footer and in card links, not in the nav
const NAV: [PageName, string][] = [["home", "Home"], ["compare", "Compare"], ["calculator", "Calculator"], ["brokers", "Brokers"], ["trading-firms", "Trading firms"]];
/** Fades on the nav scroller's edges that hide more links (phones); the chevron buttons sit inside the faded part. */
const FADE = {
  left: "[mask-image:linear-gradient(to_right,transparent,#000_18%)]",
  right: "[mask-image:linear-gradient(to_right,#000_82%,transparent)]",
  both: "[mask-image:linear-gradient(to_right,transparent,#000_18%,#000_82%,transparent)]",
};
const CHEVRON = "absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border border-line bg-page text-ink2 shadow-card hover:border-accent hover:text-ink";

/** The whole page (header, nav, body, footer) for a path: the same render in the browser and in the pre-render, so nothing
 *  here reads window, document or localStorage outside effects and event handlers. `search` is the query string the page
 *  was opened with ("?m=gap" or ""); the explorer and the calculator start from it. */
export function AppShell({ data, path, search }: { data: Data | Raw; path: string; search: string }) {
  const d = useMemo(() => asData(data), [data]);
  const route = useMemo(() => parseRoute(d, path), [d, path]);
  // one set of order filters shared by the broker, compare, trading-firm and all-firm pages, as a visitor moves between them
  const [filters, setFilters] = useState<Filters>(() => ({ sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false }));
  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const { dark, toggle } = useTheme();
  const active: PageName | null = route.page === "broker" || route.page === "firms" ? "brokers" : route.page === "how-we-measure" ? null : route.page;

  // on phones the nav is a scroller on its own row: the current page's link is scrolled into view, and each edge with
  // more links past it gets a fade and a chevron (a fade alone looked like a rendering glitch; a bare cut-off word at
  // the left edge looked like one too)
  const nav = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const check = () => {
      const left = el.scrollLeft > 2, right = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
      setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
    };
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
  const mask = edges.left && edges.right ? FADE.both : edges.left ? FADE.left : edges.right ? FADE.right : "";

  const body = route.page === "brokers" ? <Explore d={d} search={search} />
    : route.page === "broker" ? <BrokerProfile key={route.firm.id} d={d} f={filters} set={set} id={route.firm.id} />
    : route.page === "compare" ? <Compare key={`${route.a.id}-${route.b.id}`} d={d} f={filters} set={set} a={route.a.id} b={route.b.id} explicit={route.explicit} />
    : route.page === "calculator" ? <Calculator d={d} search={search} />
    : route.page === "trading-firms" ? <MarketMakers d={d} f={filters} set={set} />
    : route.page === "firms" ? <AllFirms d={d} f={filters} set={set} />
    : route.page === "how-we-measure" ? <Method d={d} />
    : <Home d={d} />;

  return (
    <div className="min-h-screen overflow-x-clip bg-page font-sans text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--page)_82%,transparent)] backdrop-blur-md">
        {/* phones: brand and buttons on the first row, the page links on a full-width second row; one row from sm up */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 px-4 sm:h-16 sm:flex-nowrap sm:gap-6">
          <a href={href(pagePath("home"))} className="flex h-12 shrink-0 items-center gap-2.5 font-display text-[15px] font-bold text-ink sm:h-auto sm:text-[16px]">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] text-white shadow-card" style={{ background: "var(--grad)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l5-5 4 4 7-8" /></svg>
            </span>
            {SITE_NAME}
          </a>
          <div className="relative min-w-0 flex-1 max-sm:order-last max-sm:-mx-4 max-sm:basis-[calc(100%+2rem)]">
            <nav ref={nav} aria-label="Pages"
              className={`flex h-10 items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] after:block after:w-10 after:shrink-0 sm:-mx-1 sm:h-auto sm:px-1 sm:after:hidden ${mask}`}>
              {NAV.map(([name, label]) => (
                <a key={name} href={href(pagePath(name))} aria-current={active === name ? "page" : undefined}
                  className={`relative whitespace-nowrap rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${active === name ? "bg-surface2 text-ink" : "text-ink2 hover:bg-surface2/60 hover:text-ink"}`}>
                  {label}
                </a>
              ))}
            </nav>
            {edges.left && (
              <button type="button" aria-label="Previous pages" onClick={() => nav.current?.scrollBy({ left: -160, behavior: "smooth" })}
                className={`${CHEVRON} left-2 sm:-left-3`}>
                <Icon name="left" size={16} />
              </button>
            )}
            {edges.right && (
              <button type="button" aria-label="More pages" onClick={() => nav.current?.scrollBy({ left: 160, behavior: "smooth" })}
                className={`${CHEVRON} right-2 sm:-right-3`}>
                <Icon name="right" size={16} />
              </button>
            )}
          </div>
          <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-muted lg:inline-flex" title={`Data updated ${dayLong(d.meta.built.slice(0, 10))}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" />Prices {monthShort(d.meta.month)} · Payments {quarterShort(d.meta.quarter)}
          </span>
          <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className={`${BTN} max-sm:ml-auto`}>
            <Icon name={dark ? "sun" : "moon"} size={17} />
          </button>
        </div>
      </header>

      {/* focusable so a route change can move focus here (App below), as a page load would */}
      <main tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-24 outline-none">
        {body}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-muted">
          <span>From the price and payment reports US brokers must publish by law (SEC Rules 605 and 606). Updated weekly, last on {dayLong(d.meta.built.slice(0, 10))}. Not investment advice.</span>
          <span className="flex flex-wrap items-center gap-4">
            <a href={href(pagePath("how-we-measure"))} className="hover:text-ink">How we measure</a>
            <a href={REPO} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 hover:text-ink"><Icon name="github" size={15} />Source</a>
            <a href="https://yens5757.github.io/" className="hover:text-ink">Made by Aiken Lee</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** The page path an internal link points at (relative to the base, with its query), or null for any other link. */
function internalPath(a: HTMLAnchorElement): string | null {
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !u.pathname.startsWith(BASE)) return null;
  if (u.hash && u.pathname === location.pathname && u.search === location.search) return null; // an in-page anchor
  return u.pathname.slice(BASE.length) + u.search;
}

/** The client: keeps the path and query in state from history (back and forward, and the app's own navigation),
 *  opens internal links without a page load, and keeps the document's title, description and canonical link current. */
export default function App({ data }: { data: Data }) {
  const [loc, setLoc] = useState<Loc>(readLocation);

  useEffect(() => {
    const sync = () => {
      setLoc(readLocation());
      window.scrollTo({ top: 0 });
      // a new page for a screen reader too: focus lands on <main>, not wherever it was on the old page
      (document.querySelector("main") as HTMLElement | null)?.focus({ preventScroll: true });
    };
    const off = onNavigate(sync);
    const pop = () => { fixLocation(data); navigated(); };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      const path = internalPath(a);
      if (path == null) return;
      e.preventDefault();
      go(path);
    };
    addEventListener("popstate", pop);
    document.addEventListener("click", click);
    return () => { off(); removeEventListener("popstate", pop); document.removeEventListener("click", click); };
  }, [data]);

  useEffect(() => {
    const { title, description, canonical } = describeRoute(data, loc.path, loc.search);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical;
  }, [data, loc]);

  return <AppShell data={data} path={loc.path} search={loc.search} />;
}
