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
| `parse_605_detail.py` | Loads 605 *detailed* per-stock reports -> DuckDB `detail_605` (~4M rows/month) + `sp500_symbols`. Zips extracted once to `data/cache/605/` |
| `same_stock.py` | Broker and market-maker execution quality compared on the SAME stock x lot x size cells -> `reports/same_stock_*.csv` |
| `compare_605.py` | Cross-firm 605 table -> `reports/compare_605_<month>.csv` |
| `pfof_vs_execution.py` | Joins 606 payment with 605 quality per broker -> CSV + PNG chart in `reports/` |
| `by_order_size.py` | Rank correlation payment vs spread paid within each 605 order-size bucket (reads the CSV above) |
| `fetch_605_directory.py` | FINRA's 605 directory -> `reporters_605.csv` (name + category per reporter code). finra.org rate-limits (429) hard: re-run fills gaps |
| `fetch_mm_605.py` | Market makers' own 605s: Virtu (NITE) + Jane Street (JNST) by URL pattern. Citadel (CDRG) = manual only |
| `build_site.py` | DuckDB -> `web/public/data/site.json`: everything the website shows, incl. same-stock gaps, routing-implied gaps and the evidence table (`stats.py`: Spearman, permutation p, bootstrap CI) |
| `web/` | React 18 + TypeScript + Tailwind 3 (Vite 5). Hash routes: story `#/`, `#/explore`, `#/broker/<ID>`, `#/market-makers`, `#/firms`, `#/method`. Charts are hand-written SVG (`src/charts/`) using d3-scale/shape; colours are CSS variables in `src/index.css` (validated palette, light + dark) |
| `.github/workflows/weekly.yml` | Mondays 06:00 UTC + manual: fetch -> parse -> analyse -> `build_site.py` -> `npm run build` -> GitHub Pages. `data/raw` persists in the Actions cache (key = hash of the file list), never in git |

Stack: Python, requests, BeautifulSoup, DuckDB (all storage + SQL analysis), matplotlib.
No pandas by design: analysis is in SQL.

## Data layout
- `data/raw/605/<firm>/` and `data/raw/606/<YYYY>Q<N>/`: raw files, never modified. **Not committed**
  (Morgan Stanley's terms forbid redistribution; keep all raw data private).
- `data/pfof.duckdb`: rebuilt from raw on every parse run.
- `firms.csv`: firm metadata. `reporter_id` = 605 ID, `crd_606` = 606 filer CRD, `short_name` = chart label.

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
  Buckets: 0 (<$250), 250, 1000, 5000, 10000, 20000, 50000 (<$200k), 200000 (>=$200k).
  Bucket `199999` = "all orders under $200k" (checked: for all 97 firms its values sit inside
  the range of the smaller buckets). Metrics are **share-weighted**, so the 199999 row is dominated
  by a broker's largest orders (Wealthfront: avg order $995, but 92% spread paid comes from its
  $20k+ orders). No order counts in the summary file.
- 605 detailed report: pipe-delimited `.txt` in a zip (Citadel: bare .txt), 55 columns, one row per
  symbol x LotSizeFlag (ROUND/ODD/FRACT) x OrderSize bucket x OrderType. OrderType is a 5-char code
  (decoded from the rule, checked against the data): [M/L][marketable Y/N, X for market][beyond-midpoint]
  [IOC][stop price]; MXXNN = plain market order, LYNNN = marketable limit. Brokers' executed shares are in
  CvrdOrderExctdAwayQty (routed away); market makers' in CvrdOrderExctdQty. Times are milliseconds.
- The summary CSV can NOT be exactly rebuilt from the detail: dollar-weighting MXXNN rows gets within
  0.01 for S&P 500 (HOOD 0.322 vs 0.316) but not for other stocks (0.446 vs 0.539). Unknown aggregation rule.
- Market makers' new-format reports are not on S3: Citadel (site blocks scripts; downloaded by hand into
  `data/raw/605/cdrg/`), Jane Street (`data/raw/605/jnst/`, by hand), Virtu (`NITE202608.zip` from
  virtu-www.s3.dualstack.us-east-1.amazonaws.com/uploads/documents/). Their old-format history (2023-2026)
  is on their sites too (TVIRTU<YYYYMM>.zip, janestreet.com/static/execution-quality-reports/<YYYYMM>_JNST.txt).
- `fetch_s3_605.py --from-month 202608` (default) skips old-format files that firms re-uploaded after Aug 2026.
- 606 XML: `rMonthly` -> `rSP500` / `rOtherStocks` / `rOptions` -> `rVenues/rVenue`.
  Some files are UTF-16. Venue names are not standardised (normalised in `VENUE_RULES`).
- 606 re-submissions: higher `_V<n>` or a context suffix like `SOFIUPDATED` supersedes the original.
  Multiple contexts in one quarter are usually SEPARATE reports (Ally: own routing + via Apex), so they are
  kept; byte-identical copies under two contexts are dropped (Webull 2024Q4, 9 files total).
- 606 also has `Options` segment and $ totals (`pmt_*_usd`); Robinhood's options PFOF ($357M in 2026Q2)
  dwarfs its stock PFOF. Cash App pays Virtu (negative payment) and routes 100% of S&P 500 market orders there.
- DuckDB 2.x: relations have no `.fetchone()`; always `con.execute(sql).fetchall()`.

## Metrics
- Execution quality: `effective_over_quoted` (share of quoted spread the customer paid; lower = better).
  "% price improved" alone is misleading (Webull: 94% improved, still pays ~50% of spread).
- Payment: per-venue cents/100 shares, weighted by venue share of market orders, averaged over
  the quarter. Convert before comparing brokers: per-share payment is distorted by share price.
  Headline metric: `payment_pct_of_spread` = payment_bps / quoted spread (bps), same unit as the
  customer side. Rank correlations are Spearman with average ranks for ties (many brokers are paid 0).

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
- Validation: Robinhood's 606 states it is paid 12.35% of the spread; the pipeline reproduces 12.1-13.5%.
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
4. Verify in the FIF Rule 605 fact sheet: bucket 199999 meaning, execution-time unit, effective-spread
   sign convention (Fidelity is negative).
5. ~~Expand to ~20 retail brokers~~ Done Oct 2026 (12 added to firms.csv). Still open: Albert, Avenue,
   eToro, Stash, WF FiNet have no 606 in FINRA bulk data (introducing brokers? find their clearing
   firm's 606). Firstrade files 606 (CRD 16843) but has no 605 on public.s3.com. Wealthfront CRD 153407 verified.
   Order-size check done (see Findings). Open question: what else explains Cash App / Wealthfront?
   (fractional-share handling? which market makers they route to? - 606 venue mix could tell.)
6. Swap in 606 Q3 2026 when FINRA publishes it (~early Nov 2026): `fetch_finra_606.py --refresh 2026Q3`.
7. ~~Market-maker 605s~~ Aug 2026 loaded (Citadel/Jane Street by hand, Virtu by URL). Each new month needs
   the same; a scraper works for Virtu + Jane Street, not Citadel (403).
8. ~~GitHub Actions + Pages~~ Workflow written (Oct 2026). Repo: github.com/yens5757/order-flow-watch, site:
   yens5757.github.io/order-flow-watch. Pages source must be set to GitHub Actions in repo settings (no gh CLI here).
9. Splitting "other stocks" further: 605/606 summaries only split S&P 500 vs other. Execution quality could be
   split by stock/price via the 605 detailed reports (per-symbol .zip, skipped by `--summary-only`); payment cannot.
