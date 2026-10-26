import { useEffect, useState } from "react";
import { TooltipProvider } from "./components/Tooltip";
import { loadData, type Data, type Filters } from "./lib/data";
import { monthShort, quarterShort } from "./lib/format";
import { useRoute, useTheme } from "./lib/hooks";
import AllFirms from "./pages/AllFirms";
import Broker from "./pages/Broker";
import Explore from "./pages/Explore";
import MarketMakers from "./pages/MarketMakers";
import Method from "./pages/Method";
import Story from "./pages/Story";

const NAV: [string, string][] = [["", "Story"], ["explore", "Brokers"], ["market-makers", "Market makers"], ["firms", "All firms"], ["method", "Method"]];

export default function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const route = useRoute();
  const theme = useTheme();

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setFilters({ sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false });
    }).catch((e) => setError(String(e.message ?? e)));
  }, []);
  const set = (p: Partial<Filters>) => setFilters((f) => (f ? { ...f, ...p } : f));
  const page = route[0] ?? "";
  const active = page === "broker" ? "explore" : page;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-page font-sans text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--page)_85%,transparent)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <a href="#/" className="flex shrink-0 items-center gap-2 font-semibold text-ink">
              <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--s1)" />
                <path d="M8 21l6-6 4 4 6-8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="hidden sm:inline">Order Flow Watch</span>
            </a>
            <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {NAV.map(([path, label]) => (
                <a key={path} href={`#/${path}`} aria-current={active === path ? "page" : undefined}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium ${active === path ? "bg-surface2 text-ink" : "text-ink2 hover:text-ink"}`}>
                  {label}
                </a>
              ))}
            </nav>
            {data && <span className="hidden whitespace-nowrap text-[12px] text-muted md:inline" title={`Built ${data.meta.built}`}>
              Data: {monthShort(data.meta.month)} · {quarterShort(data.meta.quarter)}</span>}
            <button type="button" onClick={theme.toggle} aria-label="Toggle dark mode"
              className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-ink2 hover:text-ink">{theme.dark ? "☀" : "☾"}</button>
          </div>
        </header>
        {error ? <div className="mx-auto max-w-xl px-4 py-24 text-center text-ink2">{error}</div>
          : !data || !filters ? <div className="py-32 text-center text-muted">Loading the latest reports…</div>
          : page === "explore" ? <Explore d={data} f={filters} set={set} />
          : page === "broker" ? <Broker d={data} f={filters} set={set} id={route[1] ?? "HOOD"} />
          : page === "market-makers" ? <MarketMakers d={data} f={filters} set={set} />
          : page === "firms" ? <AllFirms d={data} f={filters} set={set} />
          : page === "method" ? <Method d={data} />
          : <Story d={data} />}
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-8 text-[12.5px] leading-relaxed text-muted">
            Built from SEC Rule 605 and 606 disclosures, refreshed weekly. Not investment advice.
            {data && <> Fills from {monthShort(data.meta.month)}, payments from {quarterShort(data.meta.quarter)}, built {data.meta.built}.</>}
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
