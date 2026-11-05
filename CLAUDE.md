# Payment for Order Flow vs Retail Execution Quality

Context for Claude (and humans) picking up this project.

## Question
Do retail brokers that are paid more for routing orders (payment for order flow, PFOF)
give their customers worse fills?

- **Rule 606** (quarterly, per broker): where orders are routed + payments received per venue.
- **Rule 605** (monthly): execution quality. Since **Aug 2026** the amended rule also covers
  large brokers (100k+ accounts) and adds a human-readable summary report. This new
  broker-level data is what makes the project possible.
- Closest prior work: Schwarz, Barber, Huang, Jorion & Odean, "The 'Actual Retail Price'
  of Equity Trades", *Journal of Finance* 2025 (85k test trades; found PFOF did NOT explain
  execution differences). Framing: do the new mandatory disclosures confirm or contradict it?

## Pipeline (run in this order)
| Script | Does |
|---|---|
| `fetch_s3_605.py` | Downloads 605 reports from `public.s3.com/rule605/<id>/` for firms in `TARGET_FIRMS`. `--all-firms --summary-only` grabs just the summary CSVs from all ~114 folders (done Oct 2026: 97 firms loaded) |
| `fetch_finra_606.py` | Downloads + unpacks FINRA quarterly 606 bulk zips (2024 Q2 onward) |
| `parse_605_summary.py` | Loads 605 summary CSVs (`<ID><YYYYMM>.csv`) -> DuckDB `summary_605` |
| `parse_606.py` | Loads 606 XML -> `routing_606`, `segment_606`, `files_606`. `--find <regex>` looks up a broker's CRD |
| `fetch_context.py` | S&P 500 list (Wikipedia), Nasdaq symbol directory, VIX (FRED), FINRA OTC weekly volume per firm, SEC EDGAR company facts for listed brokers -> `data/raw/context/` |
| `parse_605_detail.py` | Loads 605 *detailed* per-stock reports -> DuckDB `detail_605` (~5M rows/month: 5.19M for Aug 2026, 41 reporters) + `sp500_symbols`. Zips extracted once to `data/cache/605/` |
| `same_stock.py` | Broker and market-maker execution quality compared on the SAME stock x lot x size cells -> `reports/same_stock_*.csv` |
| `compare_605.py` | Cross-firm 605 table -> `reports/compare_605_<month>.csv` |
| `pfof_vs_execution.py` | Joins 606 payment with 605 quality per broker -> CSV + PNG chart in `reports/` |
| `by_order_size.py` | Rank correlation payment vs spread paid within each 605 order-size bucket (reads the CSV above) |
| `fetch_605_directory.py` | FINRA's 605 directory -> `reporters_605.csv` (name + category per reporter code). finra.org rate-limits (429) hard: re-run fills gaps |
| `fetch_mm_605.py` | Market makers' own 605s: Virtu (NITE) + Jane Street (JNST) by URL pattern. Citadel (CDRG) = manual only |
| `build_site.py` | DuckDB + `fees.csv` -> `web/public/data/site.json`: everything the website shows, incl. same-stock gaps, routing-implied gaps, the evidence table (`stats.py`: Spearman, permutation p, bootstrap CI), `fees[]` (one object per fees.csv row: commission, optionsFee, marginRate, cashYield, transferOut, crd, sipc, sources, checked, confidence, notes), `meta.feesChecked` (latest `checked_on`, null if the file is empty) and `meta.timeUnit` (= `TIME_UNIT = "ms"`, the ONE place the 605 time unit is declared). `firms[].crd` falls back to the fees CRD when firms.csv has none (ALBS, AVNU, ETOR, FNET, CNBS), so a CRD no longer implies a 606 filing: test that via payment data, not `firm.crd`. Payment per broker = the latest 606 quarter, or the quarter before for a broker that has not filed the latest yet (`money[].payQ`, `meta.payFallback`; FINRA's first 2026Q3 bulk file had 256 of 290 brokers, Cash App and Public missing; dropping them moved payment-vs-cost from +0.32 to +0.51 on S&P and made it look significant: a sample change, not a finding). `firms[].slug` = the firm's URL name (`slug()`: short name lower-cased, `&` -> `and`, `.`/`*`/`'` dropped, other runs of non-[a-z0-9] -> `-`, `unique_slugs` adds -2, -3 on a repeat: robinhood, jp-morgan, etrade, cash-app); `web/src/lib/data.ts` `slugify` applies the same rule when site.json predates it, so re-run `build_site.py` after a short-name change or the URLs drift |
| `update_fees.py` | The easy way to fill `fees.csv`: no args lists what is still blank per retail broker and the page to open; `update_fees.py <ID>` prompts for each cell (Enter keeps, `NA` = not offered, `-` = clear, numbers may carry $ or %), appends the pages read to `source_urls`, stamps `checked_on`, asks for `confidence`; `--dry-run` shows the row without writing |
| `reminders.py` | After `build_site.py`: Markdown list of what only a human can do (Citadel/IBKR 605 files missing for the latest month on disk, `fees.csv` older than 80 days) or `Nothing due.`; `weekly.yml` keeps it in one GitHub issue labelled `hand-update` (created once, edited weekly, a comment when it changes so an e-mail goes out, closed when empty) |
| `fees.csv` | Hand-maintained, not a script: broker fee + trust facts (`commission_stock`, `options_per_contract`, `margin_rate_25k`, `cash_yield`, `transfer_out_full`, `crd`, `sipc`, `source_urls` space-joined, `checked_on`, `confidence` high/medium/low, `notes`), one row per retail broker in firms.csv (24; none for Apex or market makers). Blank = not confirmed on the broker's own pages (Schwab/SoFi/Coinbase block scripts, E*TRADE times out); `NA` = the product is not offered at all (STSH/TPTG/WLTH options) and lands in `fees[].notOffered` so the site says "not offered", not "not available"; `VAR` = the rate depends on a balance tier, a program or a separate product (ETOR/IBBD/JPBD/WLTH cash, MLWM margin) -> `fees[].varies`, shown as "varies" and left out of the calculator like a blank. `retail_self_directed` = offers a self-directed online account to retail customers of any residency (Avenue: Brazil-resident only, still Y). Margin = the standard $25k-tier rate, never a new-account or paid-tier rate (tastytrade 10.50 not the 6.75 offer; Webull's 8.74 is Premium). Checked 2026-11-01/02: `cash_yield` filled (a rate, `VAR` or `NA`) for 17 of 25; still blank: most fees for Albert, Altruist, Edward Jones, WF FiNet and UBS Wealth, `cash_yield` for Avenue, tastytrade and Coinbase, options and margin for Coinbase. To update: edit, bump `checked_on`, re-run `build_site.py` |
| `web/` | React 18 + TypeScript + Tailwind 3 (Vite 5). **Redesign (Nov 2026, branch `redesign/broker-page`, not merged; `main` still has the old dark gradient look):** the visual system is recorded in `DESIGN.md` + `.impeccable/design.json` (product context in `PRODUCT.md`; design brief per surface in `.impeccable/surfaces/`): teal-tinted neutral grounds (light #EDF2F0, dark #1A2220), white cards, Figtree self-hosted (`@fontsource-variable/figtree`, no Google Fonts), one action teal (#0F7B6C / dark #5CCBB6) only on pressable things, a zero-specificity global `:focus-visible` ring; the theme follows the visitor's system setting until they pick one (the saved choice wins, `index.html` head script); the header is never sticky and below 1024px the nav sits behind a Menu disclosure. Every page is rebuilt in this look: the broker page first, then the rollout (Home, Compare, Calculator, Brokers explorer, Trading firms, How we measure, All firms), each page's pieces in its own `components/<page>/` folder with a brief in `.impeccable/surfaces/`; shared pieces (`ui.tsx` + `ui.css`: Breadcrumb, PageHeader, Card, Info, Segmented, Select, Switch, Status, Legend, Empty, ChartTable, the icon set; `DataTable`, `FilterBar`, the price `Scale`) are used, not copied. **Path routes, pre-rendered (Nov 2026; the hash router is gone):** every page is a real path under the Vite base: `""` home, `compare/`, `compare/<a>-vs-<b>/` (slugs in alphabetical order; the other order redirects), `calculator/` (`?b=<slug>`), `brokers/` (= explorer; its state in the query `brokers/?m=cost10k&vs=pay10k&sp=N&ex=<slugs>` so views are linkable), `brokers/<slug>/`, `trading-firms/`, `firms/`, `how-we-measure/`; any other path, broker or pair is the not-found page (`pages/NotFound.tsx`, route `not-found`: its own title, `noindex`, no canonical; GitHub Pages still serves it through the `404.html` shell). Firms are named by `firms[].slug` (site.json, see `build_site.py`). `src/lib/routes.ts` is the ONE place paths are parsed and made, pure (no window) so the client and the pre-render share it: `parseRoute`, `routePath`, `describeRoute` (title, meta description, canonical per page), `normalizeLocation`, `href()` = base + path for EVERY internal `<a>`; `lib/hooks.ts` touches history (`go`, `readLocation`, `readQuery`/`writeQuery`, `fixLocation`); `App.tsx` intercepts internal clicks + popstate and keeps `document.title`/description/canonical current. Legacy links are rewritten in place before the first render (`fixLocation` -> history.replaceState): `#/`, `#/explore?m=…`, `#/brokers`, `#/broker/HOOD`, `#/compare/HOOD/FIBS`, `#/calculator?b=HOOD`, `#/market-makers`, `#/method`, `#/firms`, the old path names (`explore/`, `market-makers/`, `method/`, `broker/<id>/`), reporter ids in place of slugs, `index.html`, a missing trailing slash, a pair in the other order. `npm run build` = `tsc --noEmit` + `vite build` + `scripts/prerender.mjs`: bundles `src/entry-server.tsx` (react-dom/server) into `dist-ssr/` (git-ignored), renders every page from `public/data/site.json` to `dist/<path>index.html` with its own head tags (7 main pages + one per firm + every broker pair = 333 at 26 firms / 25 brokers), then `sitemap.xml`, `robots.txt` and `404.html` = the shell GitHub Pages serves for unknown paths (generic tags, the loader; `main.tsx` fetches site.json, fixes the URL, renders); it warns when a page's canonical is not its own path. On the redesign branch `main.tsx` hydrates the pre-rendered markup (`hydrateRoot`) unless the page shows the loader, `fixLocation` rewrote the URL or there is a query string (then `createRoot`); if site.json or the bundle fails, the pre-rendered page stays in its no-JS form with one status line. ECharts loads lazily (`charts/echarts-runtime.ts`, a dynamic import when a chart mounts; a failed download is retried), so broker pages never download it. Hash-only link changes scroll in place (`go()`/`fixLocation()` keep the hash). Where the site lives is set ONLY in `weekly.yml`: `SITE_BASE` (Vite base, `vite.config.ts`, default `/order-flow-watch/`) and `VITE_SITE_URL` (`SITE_URL` in `src/lib/site.ts`: canonicals, og:url, sitemap, robots; default = the GitHub Pages address); the brand constants (`SITE_NAME` "Fills and Fees", `TAGLINE`, `REPO`) live only in `site.ts`. Nav: Home, Compare, Calculator, Brokers (= explorer), Trading firms; `how-we-measure/` is the "How we measure" page (user-facing, statistics collapsed at the bottom), linked from the footer and the calculator/compare foot lines, not in the nav; `firms/` is off-nav too. Site copy is written for retail users (Nov 2026): no reporter codes, CRDs (only with the BrokerCheck link: TrustCard on `main`, the trust one-liner on the redesign branch), build dates or process notes ("by hand", pipeline, Citadel download) in user-visible text; "prices" not "fills", "trading firms" not "market makers" in headings; a broker without a 606 "files no payment report of its own (another firm routes its orders)". Two layers: home is plain-language (`components/home/`: the opening (`Hero.tsx`, centred, Nov 2026: the question h1 at `--fs-7`, "The numbers brokers must report by law, read the same way for every broker", the promise "No ads · No affiliate links · No money from brokers" (a permanent commitment in PRODUCT.md; the header's `TAGLINE` is "Broker comparison with nothing to sell" and the footer repeats the promise) and "Checked for new reports every week · last on <meta.built>": the weekly rebuild date, never "data updated weekly") with a "Your broker" select and the S&P 500/other switch centred under it, the broker page's answer card, the full ranked table (no chart; Home loads no ECharts), a yearly one-liner into the calculator, three findings generated from `evidence` and the same-stock gaps with their caveats, hand-picked comparisons (never called popular)); `brokers/` is the interactive explorer (`components/explorer/`: measure and compare-with selects, filters, sort, broker chips; one measure = ranked rails drawn in CSS and pre-rendered, a second measure = an ECharts scatter; below 1024px the controls sit in a bottom sheet; the view lives in the query, `view.ts`). Measures are defined once in `src/lib/metrics.ts` and every page names them through `METRICS[k].label/.short` (one noun each: "Customer pays", "Extra cost per $10,000 traded", "Broker is paid", "Same-stock gap" (never "same trade"); `pi` has no better direction) (`MetricKey`: cost10k, cust, pay10k, payPct, gap, pi, sz, speed, commission, optionsFee, marginRate, cashYield; `speed` = 605 avg execution time via `Metric.speedMs`, the fee keys read `Data.fees[id]` (absent for brokers without a row); a measure no broker has a figure for shows the empty state; colour slots `t.s[0..7]`, commission shares slot 2 with pi). Also `compare/<a>-vs-<b>/` (two brokers side by side, `pages/Compare.tsx`; the bare `compare/` page shows the default pair HOOD vs FIBS but is a page of its own: `Route.explicit` false -> title/h1 "Compare two brokers", the pair a sub-heading linking to `compare/fidelity-vs-robinhood/`, so the two URLs are not duplicates; pieces in `components/compare/`: a pair picker (two selects that only report + a "Compare" link; picking the other box's broker swaps them), the answer card with both brokers on the scale, a typical-year card for both, side-by-side prices and fees, cost by order size without the $200k+ bucket (named in the foot; heads the right column on a desktop, beside the answer), "What each is paid", "Registration", popular pairs and every pair), `calculator/` (annual-cost estimator: `lib/cost.ts` `annualCost(d, CostInputs{trades,size,spMix,options,idleCash,margin})` -> `CostLine[]` {spread, commissions, optionsFees, cashDrag, marginInterest, missing[]}, UI in `components/calculator/` (`model.ts` words and input limits, `store.ts` saved inputs and the broker key Home shares, `fields.tsx`, `AnswerCard`, `InputsCard`, `Results`, `chart.ts`); options, idle cash and margin are No/Yes questions (default No); inputs are capped (trades and contracts up to 100,000, trade size $1 to $1,000,000, cash and margin up to $10,000,000) and link or saved values are held to them, the mix snapping to 0/50/100; on the redesign branch idle cash defaults to $0 (opt-in, the owner's decision), calculator links always carry inputs (`?n=24&b=<slug>` at minimum) and opening one never overwrites the visitor's saved inputs, and the sentence and rank use only brokers with a complete figure), `brokers/<slug>/` (redesign branch, built from the confirmed brief in `.impeccable/surfaces/web-src-pages-brokerprofile-tsx.md`: breadcrumb, h1, then one S&P 500 / Other stocks switch right above the cards (page-local: market orders, latest month, latest quarter with the payment fallback) → price card (dollars per $10,000 above/below the fair price, rank with ties "tied 9th", straight under it the rank on the same stocks and order sizes ("13th of 25 on the same stocks and order sizes", its (i) opening a line in place: `placeSameStock`, `sameStockRank`, `sameStockWords`, `sameStockNote`), gap to the cheapest, the price scale cheapest · this broker · typical tick · most expensive, one sentence graded by both ranks by thirds of the brokers (`gradeOf`, `priceSentence`: "the cheapest"/"the best" only for an untied first, never a margin around zero)) → yearly card (24 trades of $2,000, half S&P 500 / half other: trade prices + commission; rank among the brokers whose commission is confirmed; Change → calculator with the same inputs) → "Where <broker> sits" (±3 neighbours, See all, last-month rank, rows re-sort with a FLIP glide) → payment and trust one-liners (BrokerCheck brokercheck.finra.org/firm/summary/<crd>, SIPC) → Fees → Compare; desktop = two independent column stacks (left: price card, "Where … sits", payment, registration; right: yearly card, Fees, Compare with), the yearly card is rendered twice and CSS shows one per width; components in `components/broker/`, every number and sentence in `lib/broker.ts`, whose answer card Home shares (`sameStockVerdict` is `(rank, n, tied) => Grade`; Compare's short answer does not use it: `compare/pair.ts` compares the two gaps directly, "level" within a point); the removed detail moved: routing ring, payment history and $ per quarter → a "By broker" section on `trading-firms/` (anchors `#<slug>`, read after hydration), fractional vs whole shares → explorer measure `fract`; cost by order size and speed were already explorer filters/measures), `trading-firms/` (`components/trading/`: prices on the same stocks and order sizes as per-row rails, the routing heat table, "By broker" picked with a select + Show, then the off-exchange share lines last), `firms/` (`components/firms/`: four rails on one axis and its own sortable table; the month picker sits in the page header so the filter bar stays one short sticky row; a firm filing two reports under one name and category is numbered "report 1 of 2" in reporter order, e.g. Fifth Third's FTSR and OHIO), `how-we-measure/` (`components/method/`; anchors `#sources` `#fair-price` `#same-stocks` `#payments` `#fees` `#limits` `#questions` `#evidence`; a link with a hash to another page lands on that section after a client-side navigation, App.tsx). Charts are Apache ECharts 5, tree-shaken and lazy, only for lines and stacked columns (`options.ts`), the calculator's bars, the explorer's scatter and a broker's routing ring (`src/charts/EChart.tsx` wrapper, `kit.ts` shared styling); rankings, scales, rails and the forest plot are drawn in CSS; colours are CSS variables in `src/index.css` (validated palette, dark + light), read into charts by `src/lib/theme.tsx`. FINRA OTC chart drops the quarter still in progress. tsconfig has `noUnusedLocals` + `noUnusedParameters` |
| `.github/workflows/weekly.yml` | Mondays 06:00 UTC + manual + push to main: private data -> fetch -> parse -> analyse -> `build_site.py` -> reminder issue -> `npm run build` (type-check, bundle, pre-render) -> GitHub Pages. `data/raw` persists in the Actions cache (key = hash of the file list), never in git. Job env `SITE_BASE` + `VITE_SITE_URL` = the ONE place to change for a custom domain (`/` and `https://<domain>/`, plus `web/public/CNAME`). Private-data step: the repository secret `PRIVATE_DATA_TOKEN` (fine-grained PAT, read-only Contents on `yens5757/order-flow-watch-private`) is passed to ONE checkout step only (`with.token`, `persist-credentials: false`), never the job env (pip, the fetchers, npm scripts and the build must not see it); a step `if` cannot read `secrets`, so step `private` records `steps.private.outputs.has` (true/false) and the checkout + copy steps test that. The private repo's `605/` (`cdrg/`, `ibbd/`: `<ID><YYYYMM>.csv` + `.zip`, same layout as `data/raw/605/`) is copied into `data/raw/605/` before parsing; secret unset = both steps skipped, the build goes on without Citadel/IBKR |

Stack: Python, requests, BeautifulSoup, DuckDB (all storage + SQL analysis), matplotlib.
No pandas by design: analysis is in SQL.

## Data layout
- `data/raw/605/<firm>/` and `data/raw/606/<YYYY>Q<N>/`: raw files, never modified. **Not committed**
  (Morgan Stanley's terms forbid redistribution; keep all raw data private).
- `data/pfof.duckdb`: rebuilt from raw on every parse run.
- `firms.csv`: firm metadata. `reporter_id` = 605 ID, `crd_606` = 606 filer CRD, `short_name` = chart label.
- `fees.csv`: broker fee + trust facts, hand-maintained (see pipeline table). Committed: public figures from public pages.

## Sources
- 605: `public.s3.com/rule605/` (directory listing, one folder per reporter ID; ~80% of firms).
  Citadel (CDRG), Jane Street (JNST), Virtu (NITE) publish on their own sites. FINRA directory:
  finra.org/filing-reporting/regulation-nms/sec-rule-605-reports
- 606: FINRA bulk zips, `cdn.finra.org/606reportBulk/<YYYY>/606_NMS_<YYYY>_Q<N>.zip` (from 2024 Q2).
- Context (`fetch_context.py`): FRED needs a browser-like User-Agent (plain one times out); SEC data.sec.gov
  accepts the plain one (www.sec.gov does not: 403). SEC companyfacts has NO order-flow revenue line
  (companies use custom XBRL tags, which companyfacts omits) - only totals; a real PFOF cross-check needs
  the 10-Q documents parsed. FINRA OTC weekly per firm: api.finra.org weeklySummary, summaryTypeCode
  OTC_W_FIRM, no key needed. Citadel ~30% of off-exchange NMS volume; HRT 4.9% (2024Q2) -> 11.7% (2026Q3).

## Format notes (learned the hard way)
- 605 summary: 36 rows per firm-month = Sp500 Y/N x OrderType M/ML x OrderSize bucket.
  Interactive Brokers (IBBD) quotes every header field and orders the columns differently (Sp500, OrderType, OrderSize):
  `parse_605_summary.py` reads the header with the csv module and compares column sets, not order. Its files are a hand
  download (interactivebrokers.com > Regulatory Reports > Rule 605 > View Report (IBKR, IBBD)) renamed `IBBD<YYYYMM>.csv/.zip`
  into `data/raw/605/ibbd/`; the zip's inner file is `IBBD.<YYYYMM>.txt` (the detail parser takes the first .txt member).
  Buckets: 0 (<$250), 250, 1000, 5000, 10000, 20000, 50000 (<$200k), 200000 (>=$200k).
  Bucket `199999` = "all orders under $200k" (checked: for all 97 firms its values sit inside
  the range of the smaller buckets). Metrics are **share-weighted**, so the 199999 row is dominated
  by a broker's largest orders (Wealthfront: avg order $995, but 92% spread paid comes from its
  $20k+ orders). No order counts in the summary file.
- 605 detailed report: pipe-delimited `.txt` in a zip (Citadel: bare .txt), 55 columns, one row per
  symbol x LotSizeFlag (ROUND/ODD/FRACT) x OrderSize bucket x OrderType. OrderType is a 5-char code
  (decoded from the rule, checked against the data): [M/L][marketable Y/N, X for market][beyond-midpoint]
  [IOC][stop price]; MXXNN = plain market order, LYNNN = marketable limit. Brokers' executed shares are in
  CvrdOrderExctdAwayQty (routed away); market makers' in CvrdOrderExctdQty.
- 605 time fields (avg execution time) are **milliseconds**, confirmed 2 Nov 2026 from the SEC's summary-report technical
  specification (sec.gov/files/orderexecutionsummaryreporttechnicalspecification.pdf, Sept 2026: "the share-weighted average
  execution speed, in milliseconds"; the detailed report's time fields are "in increments of a millisecond or finer", NMS plan
  appendix sec.gov/files/rules/sro/nms/2025/34-103939-appendix.pdf). `TIME_UNIT = "ms"` in `build_site.py` -> `meta.timeUnit` is
  still the one place it is declared. The same spec defines bucket `199999` = $0 to <$200,000 and says the effective spread
  "may be positive or negative" (negative = filled on the customer's side of the midpoint, SEC report-practice-preferencing).
- The summary CSV can NOT be exactly rebuilt from the detail: dollar-weighting MXXNN rows gets within
  0.01 for S&P 500 (HOOD 0.322 vs 0.316) but not for other stocks (0.446 vs 0.539). Unknown aggregation rule.
- Market makers' new-format reports are not on S3: Citadel (site blocks scripts; downloaded by hand into
  `data/raw/605/cdrg/`), Jane Street (`JNST<YYYYMM>.zip` from janestreet.com/static/execution-quality-reports/),
  Virtu (`NITE<YYYYMM>.zip` from virtu-www.s3.dualstack.us-east-1.amazonaws.com/uploads/documents/). The last two
  are fetched by `fetch_mm_605.py`.
- Corrected reports keep the same file name: Two Sigma re-uploaded SOHW202608 on 27 Oct 2026 (zip 20.99 -> 21.26 MB;
  its re-dated older files were identical), FINRA republished the 2025Q3 and 2026Q2 606 zips (Oct 2026). All three
  fetchers re-download a file whose size on the server differs; `parse_605_detail.py` re-extracts a zip newer than
  its cache. Neither change moved any result. Their old-format history (2023-2026)
  is on their sites too (TVIRTU<YYYYMM>.zip, janestreet.com/static/execution-quality-reports/<YYYYMM>_JNST.txt).
- `fetch_s3_605.py --from-month 202608` (default) skips old-format files that firms re-uploaded after Aug 2026.
- 606 XML: `rMonthly` -> `rSP500` / `rOtherStocks` / `rOptions` -> `rVenues/rVenue`.
  Some files are UTF-16. Venue names are not standardised (normalised in `VENUE_RULES`; a name no rule matches is
  title-cased, keeping `KEEP_CAPS` words like ATS and IBKR in capitals). Schwab wrote Jane Street as "JANEST" (2024Q2-2025Q1).
- 606 re-submissions: higher `_V<n>` or a context suffix like `SOFIUPDATED` supersedes the original.
  Multiple contexts in one quarter are usually SEPARATE reports (Ally: own routing + via Apex), so they are
  kept; byte-identical copies under two contexts are dropped (Webull 2024Q4, 9 files total).
- 606 also has `Options` segment and $ totals (`pmt_*_usd`); Robinhood's options PFOF ($357M in 2026Q2)
  dwarfs its stock PFOF. Cash App pays Virtu (negative payment) and routes 100% of S&P 500 market orders there.
  Other net-negative rates are exchange fees, not payments to trading firms: IBKR (S&P 500, 2026Q3: only Nasdaq, -1.69 cph)
  and J.P. Morgan (other stocks: Nasdaq/NYSE/Arca/Cboe negative, every trading firm 0.00). The site says "pays its trading firm"
  only when a non-exchange venue has a negative rate (exchange = name starting Nasdaq, NYSE, Cboe, MEMX, IEX, MIAX, LTSE or
  American Stock Exchange); otherwise "not paid by the trading firms … pays about $X in exchange fees" (found 5 Nov 2026).
- DuckDB 2.x: relations have no `.fetchone()`; always `con.execute(sql).fetchall()`.

## Metrics
- Execution quality: `effective_over_quoted` (share of quoted spread the customer paid; lower = better).
  "% price improved" alone is misleading (Webull: 94% improved, still pays ~50% of spread).
- Payment: per-venue cents/100 shares, weighted by venue share of market orders, averaged over
  the quarter. Convert before comparing brokers: per-share payment is distorted by share price.
  Headline metric: `payment_pct_of_spread` = payment_bps / quoted spread (bps). NOT the same scale as the customer side:
  EFQ = effective spread / quoted spread and the 605 effective spread is 2 x |price - midpoint|, so EFQ is relative to the
  half-spread. Rank correlations are unaffected (a constant factor); the dollar measures (`cost10k` = EFQ x qs/2, `pay10k` =
  cph / px) are on the same scale and are what to compare side by side (checked 4 Nov 2026). Older notes that compare
  payment % with EFQ or the 1-min realized spread % ("Robinhood takes ~45% of that margin") understate the payment share 2x. Rank correlations are Spearman with average ranks for ties (many brokers are paid 0).

## Findings so far (605 Aug 2026 vs 606 Q2 2026, market orders < $200k)
- Original 8 brokers: rank correlation payment vs customer cost 0.86 (S&P 500), 0.88 (other stocks).
- **Expanded to 14 brokers (Oct 2026), payment as % of spread: drops to 0.19 (S&P 500), 0.38 (other stocks).**
  The strong result was mostly a small-sample artefact. Descriptive only.
- Fidelity / Vanguard / Schwab: lowest payment and best fills. Robinhood / Webull: highest payment, worse fills.
- New outliers: Wealthfront (zero payment) and Cash App (net payment negative) both give poor fills:
  ~55% of spread on small S&P 500 orders, worse than Robinhood (~21-29%).
- **Order size is NOT the confound** (`by_order_size.py`): small orders don't pay more of the spread
  (S&P 500 median 21-27% from <$250 up to $200k), and within-bucket correlations stay weak
  (0.11-0.36 S&P 500, 0.35-0.57 other stocks). Only >= $200k orders are much worse (80-130%).
- Current reading: leans towards Schwarz et al. 2025 - PFOF is not the main driver.
- **Deeper tests (Oct 2026, permutation p-values, n=14):** payment vs cost NOT significant (S&P p=0.51,
  other p=0.18). Hinges on Cash App + Wealthfront (drop both -> +0.76, p=0.01). Controlling for avg share
  price removes it (partial -0.01 / +0.08). Strongest predictor = clientele: broker's overall avg order
  size vs cost WITHIN the same size bucket rho -0.74..-0.85 (S&P), all p<0.01. Customer cost ~= market
  maker's 1-min realized spread (rho 0.96, S&P): Robinhood takes ~45% of that margin, Webull ~30%,
  SoFi/Altruist/tastytrade ~3%. Most brokers have ONE payment rate for all venues (Schwab 10c, SoFi 18c,
  tastytrade/Altruist 15c); only Robinhood/Webull vary by venue. Options = ~70% of PFOF $ (not in 605).
  Tracked brokers' PFOF $591M (2024Q2) -> $1.33B (2026Q2). Fidelity started equity PFOF Apr 2026 (verify).
  More venues <-> better prices (rho -0.67, p=0.01); slower avg exec time <-> better prices (-0.62, unit unverified).
- **Same-stock comparison (`same_stock.py`, detailed 605):** broker gaps persist on identical stock x lot x
  size cells: Fidelity -15.6pt vs peers (S&P), Cash App +46.0pt. Payment vs same-stock gap +0.39 (p=0.19) /
  +0.42 (p=0.15): still not significant. Clientele (avg order size) -0.75 and exec time -0.73, both p<0.01.
  **Routing mix explains nothing**: implied gap from venue shares x market makers' own same-stock gaps vs
  actual gap rho +0.02 (S&P) / -0.17 (other). Same market makers, very different prices per broker ->
  market makers price each broker's flow separately. Market makers on same stocks (S&P): Citadel -19pt,
  Two Sigma +18pt; other stocks: G1 -8pt, Citadel +7.5pt.
- **Expanded to 24 brokers / 18 with payment + 8 market makers (28 Oct 2026):** added moomoo (FUTM), Public (TTSI),
  Merrill (MLWM), Coinbase (CNBS, no 606), J.P. Morgan (JPBD); market makers Jump (JRET) and GTS (GTSM, #3 by
  off-exchange volume, 10.6%). Payment vs cost now +0.30 (S&P, p=0.23) / **+0.50 (other, p=0.036)**, but with
  avg share price held equal (partial rank corr., new evidence row) +0.06 (p=0.82) / +0.30 (p=0.25). Holding
  avg order size equal does NOT remove it (other +0.49, p=0.05) - share price is the confound. Clientele vs
  same-stock gap -0.67/-0.69 (p<=0.001); routing mix +0.04/+0.22. Jump's retail desk +32pt (S&P) vs other
  market makers on identical trades, small volume ($1.9B). Robinhood Financial (CRD 165998) files its own 606
  ($399M in 2026Q2) but routes everything through Robinhood Securities (287900, tracked): a subset, not extra
  money - never add them up. MSSB's CRD 149777 is the MSWM 606 (already tracked).
- **September 2026 fills + Interactive Brokers (2 Nov 2026):** 25 brokers / 19 with payment. Payment vs cost +0.40 (S&P, p 0.09) /
  +0.55 (other, p 0.02); at equal share price +0.18 / +0.37 (p 0.48 / 0.14); clientele −0.65 / −0.68 (p ≤ 0.001). Same picture
  as August (Webull improved most, 49.7 → 44.9% of spread). IBKR (IBBD, Interactive Brokers LLC, all its retail flow): 31.6% of the
  spread on S&P market orders, +25pt vs peers on identical trades, Robinhood-like.
- Validation: Robinhood's 606 (2026Q2 and Q3 alike) states it is paid 12.35% of the spread in regular hours, 9% extended;
  the pipeline's estimate is 12.1-15.5% depending on which month's 605 price and spread divide the quarter's cents per
  100 shares (Q2 cph / Aug spreads 12.1 S&P; Q3 cph / Sep spreads 15.5): a period-mismatch approximation, not exact.
- **Email to Schwarz checked (4 Nov 2026), Sept fills, Q3 payments with Q2 fallback:** payment vs SAME-STOCK gap +0.25
  (p 0.30) / +0.43 (p 0.07), n 19; without Cash App (most influential: negative payment, worst S&P gap) +0.47 (p 0.05) /
  +0.63 (p 0.006); Q2-only +0.37 / +0.40; Q3-only (n 17) +0.43 / +0.63. Clientele -0.65 / -0.68 (1M perms p 0.0006 /
  0.0003), negative in every size bucket, survives Bonferroni and holding payment fixed; open confound = order handling
  (holding avg execution time equal: -0.34 p 0.10 / -0.41 p 0.04). August is similar (payment +0.23 / +0.44 n 18,
  clientele -0.61 / -0.68 n 24). The paper (JF 80(5) 2025, 2507-41) uses 85,000 simultaneous market orders and calls
  discarded trades "test trades"; its "matched trades" are literally identical orders, so the site says "same stocks and
  order sizes", never "identical trades". Co-author Jorion died 21 Jul 2025.
- Finding names for 605 reporter codes: FINRA's broker-dealer directory
  finra.org/filing-reporting/regulation-nms/sec-rule-605-reports/167516 (paginated, ?page=N).
  606 `broker` name field is sometimes just a code (WLTH, ALTU), so `--find` by name can miss firms;
  also search by `context`.

## Open issues / next steps
1. ~~Switch payment metric to % of quoted spread~~ Done Oct 2026 (`payment_pct_of_spread`; chart is now
   paired bars per broker, both sides in % of the quoted spread).
2. SoFi's 606 reports only SoFi's share (Apex keeps the rest), so its payment is understated.
   Show Apex (clearing firm) separately from retail brokers.
3. ~~Confirm Fidelity's CRD~~ Done: 7784 (BrokerCheck API: api.brokercheck.finra.org/search/firm?query=<crd>).
4. ~~Verify bucket 199999, the execution-time unit and the effective-spread sign~~ Done 2 Nov 2026 (SEC technical
   specification; see Format notes).
5. ~~Expand to ~20 retail brokers~~ Done Oct 2026 (12 added to firms.csv). Still open: Albert, Avenue,
   eToro, Stash, WF FiNet have no 606 in FINRA bulk data (introducing brokers? find their clearing
   firm's 606). Firstrade files 606 (CRD 16843) but has no 605 on public.s3.com. Wealthfront CRD 153407 verified.
   Order-size check done (see Findings). Open question: what else explains Cash App / Wealthfront?
   (fractional-share handling? which market makers they route to? - 606 venue mix could tell.)
6. 606 Q3 2026 arrives ~early Nov 2026; the weekly run picks it up, and re-downloads any quarter FINRA republishes.
7. ~~Market-maker 605s~~ Virtu + Jane Street are fetched every month automatically; only Citadel needs a hand
   download (its site returns 403 to scripts).
8. ~~GitHub Actions + Pages~~ Workflow written (Oct 2026). Repo: github.com/yens5757/order-flow-watch, site:
   fillsandfees.com (custom domain bought 2 Nov 2026 at Cloudflare Registrar, DNS-only A records to GitHub Pages + CNAME www;
   `web/public/CNAME` + `SITE_BASE=/` + `VITE_SITE_URL` in weekly.yml; the github.io address redirects). Pages source must be set
   to GitHub Actions in repo settings (no gh CLI here).
9. Splitting "other stocks" further: 605/606 summaries only split S&P 500 vs other. Execution quality could be
   split by stock/price via the 605 detailed reports (per-symbol .zip, skipped by `--summary-only`); payment cannot.
10. Still missing (file 606, but 605 not on public.s3.com - need per-firm fetchers like Virtu/Jane Street):
   Found 2 Nov 2026 (FINRA directory + brokers' pages): Ally `TKNG` at ally.com/invest/disclosures/order-routing-and-payment-for-order-flow.html
   (`TKNG<YYYYMM>.csv` + `.txt`, public); Alpaca `APCA` at alpaca.markets/disclosures (`APCA<YYYYMM>.zip`; the zip 403s to scripts);
   Firstrade `FFSI` at firstrade.com/legal/order-routing-605 (`FFSI<YYYYMM>.csv` + `.txt`, public); TradeStation `TRAD` at
   tradestation.com/important-information/sec-rule-606-report-rule-607-disclosure/ (page 403s to scripts); Tradier: no 605 page found.
   A per-firm fetcher like `fetch_mm_605.py` could add Ally and Firstrade; TradeUP untried. Citadel (CDRG) and Interactive Brokers
   (IBBD = Interactive Brokers LLC, all its retail flow, $72M PFOF 2026Q2; its other 605 codes IBCO/IBFR/FRAC) both
   deliberately block scripts (IBKR's reports page interactivebrokers.com/en/index.php?f=1366 returned 403, 1 Nov 2026):
   do not retry or work around. Their route to the live site (Nov 2026): hand-download into the PRIVATE repo
   yens5757/order-flow-watch-private (`605/cdrg/`, `605/ibbd/`, same file names as `data/raw/605/`) + repository secret
   `PRIVATE_DATA_TOKEN` on order-flow-watch; `weekly.yml` copies them in before parsing (see its row) and `reminders.py`
   opens the hand-update issue when the latest month is missing. Raw files stay out of git either way (derived results only).
11. Re-check `fees.csv` every quarter (next: Feb 2027, with the 606 refresh): fee schedules change without notice
   and the file is hand-kept. Fill the gaps first (the blanks are listed in the `fees.csv` row; pages that block scripts or time out are read in
   a browser, never scripted around); Webull's standard margin tier is unread. Bump `checked_on`; `meta.feesChecked` is what the site shows.
12. Score ranking page: PARKED by the owner (6 Nov 2026) after choosing a weighted overall score; do not build unless asked.
   Draft method if it returns: prices 60 (average price S&P 500 / other stocks 15 each, same-stock gap S&P 500 / other 15
   each), fees 40 (commission 10, options fee 10, margin rate 7.5, cash interest 7.5, transfer-out fee 5); points linear in
   dollars between the best (100) and worst (0) broker; "not offered" scores 0; a broker is scored only when ≥90% of the
   weight is confirmed (Sept 2026: 18 of 25; Albert, Altruist, Avenue, Edward Jones, WF FiNet, UBS Wealth, Coinbase wait for
   fees; re-sharing weight over unknown parts put the advisor-only brokers on top, which is why); payment for order flow
   left out (it doesn't reliably predict price). Result then: Fidelity 86, J.P. Morgan 76, Vanguard 71 ... Cash App 19.
