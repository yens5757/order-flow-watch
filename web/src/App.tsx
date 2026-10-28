import { useEffect, useState } from "react";
import { Icon } from "./components/ui";
import { loadData, type Data, type Filters } from "./lib/data";
import { monthShort, quarterShort } from "./lib/format";
import { useRoute } from "./lib/hooks";
import { useTheme } from "./lib/theme";
import AllFirms from "./pages/AllFirms";
import BrokerProfile from "./pages/BrokerProfile";
import Brokers from "./pages/Brokers";
import MarketMakers from "./pages/MarketMakers";
import Method from "./pages/Method";
import Overview from "./pages/Overview";

const NAV: [string, string][] = [["", "Overview"], ["brokers", "Brokers"], ["market-makers", "Market makers"], ["firms", "All firms"], ["method", "Method"]];
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
  const page = route[0] === "explore" ? "brokers" : route[0] ?? "";
  const active = page === "broker" ? "brokers" : page;

  return (
    <div className="min-h-screen overflow-x-clip bg-page font-sans text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--page)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-7xl items-center gap-3 px-4 sm:h-16 sm:gap-6">
          <a href="#/" className="flex shrink-0 items-center gap-2.5 font-display text-[16px] font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] text-white shadow-card" style={{ background: "var(--grad)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l5-5 4 4 7-8" /></svg>
            </span>
            <span className="hidden sm:inline">Order Flow Watch</span>
          </a>
          <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,#000_85%,transparent)]" aria-label="Pages">
            {NAV.map(([path, label]) => (
              <a key={path} href={`#/${path}`} aria-current={active === path ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${active === path ? "bg-surface2 text-ink" : "text-ink2 hover:bg-surface2/60 hover:text-ink"}`}>
                {label}
              </a>
            ))}
          </nav>
          {data && (
            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-muted lg:inline-flex" title={`Built ${data.meta.built}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" />Fills {monthShort(data.meta.month)} · Payments {quarterShort(data.meta.quarter)}
            </span>
          )}
          <a href={REPO} target="_blank" rel="noopener" aria-label="Source code on GitHub"
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-ink2 hover:border-accent hover:text-ink sm:grid"><Icon name="github" size={17} /></a>
          <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-ink2 hover:border-accent hover:text-ink">
            <Icon name={dark ? "sun" : "moon"} size={17} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24">
        {error ? <div className="mx-auto max-w-xl py-24 text-center text-ink2">{error}</div>
          : !data || !filters ? (
            <div className="grid place-items-center py-40 text-muted">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[var(--accent)]" />
              <span className="mt-4 text-[13.5px]">Loading the latest reports…</span>
            </div>
          )
          : page === "brokers" ? <Brokers d={data} f={filters} set={set} />
          : page === "broker" ? <BrokerProfile key={route[1]} d={data} f={filters} set={set} id={route[1] ?? "HOOD"} />
          : page === "market-makers" ? <MarketMakers d={data} f={filters} set={set} />
          : page === "firms" ? <AllFirms d={data} f={filters} set={set} />
          : page === "method" ? <Method d={data} />
          : <Overview d={data} />}
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
