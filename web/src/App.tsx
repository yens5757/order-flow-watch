import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./components/ui";
import { asData, type Data, type Filters, type Raw } from "./lib/data";
import { dayLong } from "./lib/format";
import { fixLocation, go, navigated, onNavigate, readLocation, type Loc } from "./lib/hooks";
import { BASE, describeRoute, href, pagePath, parseRoute, type PageName } from "./lib/routes";
import { SITE_NAME, TAGLINE } from "./lib/site";
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

/** The site's pages, the current one marked: the same links in the desktop nav and in the phone menu. */
function PageLinks({ active }: { active: PageName | null }) {
  return (
    <>
      {NAV.map(([name, label]) => (
        <a key={name} href={href(pagePath(name))} aria-current={active === name ? "page" : undefined}>{label}</a>
      ))}
    </>
  );
}

/** The whole page (skip link, header, body, footer) for a path: the same render in the browser and in the pre-render, so
 *  nothing here reads window, document or localStorage outside effects and event handlers. `search` is the query string
 *  the page was opened with ("?m=gap" or ""); the explorer and the calculator start from it. */
export function AppShell({ data, path, search }: { data: Data | Raw; path: string; search: string }) {
  const d = useMemo(() => asData(data), [data]);
  const route = useMemo(() => parseRoute(d, path), [d, path]);
  // one set of order filters shared by the compare, trading-firm and all-firm pages, as a visitor moves between them
  // (broker pages keep their own: market orders, all sizes, the latest month and quarter)
  const [filters, setFilters] = useState<Filters>(() => ({ sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false }));
  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const { dark, toggle } = useTheme();
  const active: PageName | null = route.page === "broker" || route.page === "firms" ? "brokers" : route.page === "how-we-measure" ? null : route.page;

  // the phone menu (a <details>, so it opens without a script too) closes on a new page, on a tap anywhere outside it,
  // when keyboard focus moves out of it (so it never covers the control that now has focus), and on Escape, which puts
  // focus back on its button only when focus was inside the menu
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (menu.current) menu.current.open = false; }, [path]);
  useEffect(() => {
    const m = menu.current;
    const away = (e: MouseEvent) => { if (m?.open && !m.contains(e.target as Node)) m.open = false; };
    const out = (e: FocusEvent) => { if (m?.open && e.relatedTarget instanceof Node && !m.contains(e.relatedTarget)) m.open = false; };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !m?.open) return;
      const inside = m.contains(document.activeElement);
      m.open = false;
      if (inside) m.querySelector("summary")?.focus();
    };
    document.addEventListener("click", away);
    document.addEventListener("keydown", esc);
    m?.addEventListener("focusout", out);
    return () => { document.removeEventListener("click", away); document.removeEventListener("keydown", esc); m?.removeEventListener("focusout", out); };
  }, []);

  const body = route.page === "brokers" ? <Explore d={d} search={search} />
    : route.page === "broker" ? <BrokerProfile key={route.firm.id} d={d} id={route.firm.id} />
    : route.page === "compare" ? <Compare key={`${route.a.id}-${route.b.id}`} d={d} f={filters} set={set} a={route.a.id} b={route.b.id} explicit={route.explicit} />
    : route.page === "calculator" ? <Calculator d={d} search={search} />
    : route.page === "trading-firms" ? <MarketMakers d={d} f={filters} set={set} />
    : route.page === "firms" ? <AllFirms d={d} f={filters} set={set} />
    : route.page === "how-we-measure" ? <Method d={d} />
    : <Home d={d} />;

  return (
    <div className="min-h-screen overflow-x-clip bg-page font-sans text-ink" data-page={route.page}>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="wrap top-in">
          <div className="brand">
            <a href={href(pagePath("home"))}>{SITE_NAME}</a>
            <small>{TAGLINE}</small>
          </div>
          <nav className="nav" aria-label="Site"><PageLinks active={active} /></nav>
          <div className="tools">
            {/* the icon shown follows the theme on screen through CSS (index.css), so it is right before any script runs */}
            <button type="button" onClick={toggle} className="round theme js-only" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
              <Icon name="moon" size={20} className="i-moon" />
              <Icon name="sun" size={20} className="i-sun" />
            </button>
            <details className="menu" ref={menu}>
              <summary><span className="lbl">Menu</span><Icon name="menu" size={20} /></summary>
              <nav className="menu-panel" aria-label="Site"><PageLinks active={active} /></nav>
            </details>
          </div>
        </div>
      </header>

      {/* focusable so a route change can move focus here (App below), as a page load would; the skip link's target */}
      <main id="main" tabIndex={-1} className="wrap">
        {body}
      </main>

      <footer className="foot">
        <div className="wrap">
          <p>From the reports US brokers must publish by law (SEC Rules 605 and 606) and each broker's own price list. Updated weekly, last on {dayLong(d.meta.built.slice(0, 10))}. Not investment advice.</p>
          <ul>
            <li><a href={href(pagePath("how-we-measure"))}>How we measure</a></li>
            <li><a href="mailto:admin@fillsandfees.com">Feedback</a></li>
            <li><a href="https://yens5757.github.io/" className="quiet">© 2026 Aiken Lee</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

/** The page path an internal link points at (relative to the base, with its query and hash), or null for any other link. */
function internalPath(a: HTMLAnchorElement): string | null {
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !u.pathname.startsWith(BASE)) return null;
  if (u.hash && u.pathname === location.pathname && u.search === location.search) return null; // an in-page anchor
  return u.pathname.slice(BASE.length) + u.search + u.hash;
}

/** The client: keeps the path and query in state from history (back and forward, and the app's own navigation),
 *  opens internal links without a page load, and keeps the document's title, description and canonical link current. */
export default function App({ data }: { data: Data }) {
  const [loc, setLoc] = useState<Loc>(readLocation);
  const shown = useRef<Loc>(loc);

  // the app has rendered: a page opened with a query (calculator/?…) can show its own figures now (index.html marked it)
  useEffect(() => { document.documentElement.classList.remove("q"); }, []);

  useEffect(() => {
    const sync = () => {
      const next = readLocation();
      // only the hash changed (a "See all" link, trading-firms/#webull while there, the skip link): an in-page jump the
      // browser already made, not a new page, so no scroll to the top and no focus move
      const samePage = next.path === shown.current.path && next.search === shown.current.search;
      shown.current = next;
      setLoc(next);
      if (samePage) return;
      window.scrollTo({ top: 0, behavior: "instant" }); // a new page starts at its top, without a scroll animation
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
