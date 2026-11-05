---
version: 1
slug: "web-src-pages-marketmakers-tsx"
primary_target: "web/src/pages/MarketMakers.tsx"
related_targets: []
---

## Scope and visitor mode

The Trading firms page (`/trading-firms/`): `web/src/pages/MarketMakers.tsx` and `web/src/components/trading/`. Mode: read. The visitor came to understand who fills retail orders, whether it matters which firm does, and where one broker's orders go. Part of the rollout of the broker page's world; development-only brief.

## Audience, job, proof, constraints

- Audience: retail investors who followed a broker page's payment "Details" link (lands on `trading-firms/#<slug>`) or the nav; technical readers checking routing and payments.
- Job: which trading firms fill the brokers' orders, how their prices compare on the same stocks and order sizes, which broker sends orders where, and one broker's routing ring, payment rate over time and dollars per quarter.
- Proof: SEC Rule 605 detailed reports (matched stock, lot and size groups, the month named), Rule 606 routing and payments per quarter (a late filer's previous quarter named as such, missing filers named), FINRA off-exchange volume (full quarters only).
- Constraints: data and anchors unchanged (one `#<slug>` per firm, read after hydration and on every hash change); filters shared with Compare and All firms; a real table for every chart; no navigation on select change (a Show button sets the hash); tooltips never clipped; AA in both themes; 44px targets; no sideways page scroll at 320px; at most one short sticky row; words, not colour, for better and worse.

## Composition and memorable moment

Page heading and one line, the shared filter bar (stocks, order type, payment quarter; it sticks on a desktop while it fits one row; the rarely used Apex switch moves into the routing card; the quarter stays last in the bar, after the switches on a phone too, not beside the h1 like All firms' month, because it changes only the routing and By-broker cards: DESIGN.md's rule for a period select), then one column of full-width cards (the rails table and the heatmap need the full width), each one idea, in the order the visitor asks and the same on a phone: Prices on the same stocks and order sizes (does the firm matter: a ranked table, each firm on its own small neutral rail with an ink dot at its gap to other firms, the figures beside it), Who sends orders where (which firms fill my broker's orders, straight after the prices because their foot says a firm's figure mixes in the brokers that send it orders: a heatmap that is itself a table; broker names link to their own section, directly below), the By-broker card (a broker picker with a Show button, the routing ring beside its key table, then the payment rate over time and the dollars per quarter side by side on a desktop, each with a table, then the way on to the broker's own page), and last Share of off-exchange stock trading (lines, an HTML key, a table): context for readers who keep going, all off-exchange volume rather than retail orders, and the one card no filter changes, so the cards the filters change sit together under the bar. Every rail row and heatmap row shows (the sentence names both ends of the ranking; a visitor looks up their broker by name); each chart's table sits behind "Show as a table". Memorable moment: flipping the stock switch glides every firm's dot along its rail while the table re-ranks in place, the broker page's signature carried over; nothing moves under reduced motion.

Units (Nov 2026, from the critique's second P1, whose example was Webull's "223.2¢ per 100 shares" against "$0.93 per $10,000" on its broker page): By broker gives each trading firm's rate in dollars per $10,000, the unit every other page uses (cents per 100 shares over the broker's average share price in the latest month's price report, as Metric.pay10k converts it), beside the report's own cents per 100 shares, in the key table ("Paid per $10,000", "Per 100 shares") and in the ring's tooltip. A rate below zero gets one line under the key in the broker pages' words: "Below zero: Cash App pays the trading firm.", "Below zero: IBKR pays the exchange's fees." (a trading firm only when the venue isn't an exchange). The payment rate over time stays in cents, the one place on the site, and says why in one line under its scope: "In cents only: the share prices needed for dollars start in August 2026." (the month from the data). Cents carry a true minus sign. On the smallest phones the key's columns sit closer and its figures take the label size; past that the key scrolls inside the card, never the page. The routing heat table's payment view stays in cents per 100 shares (not this round).

## Direction contract

THESIS: The Trading firms page is a calm reference document: who fills retail orders, how their prices compare on the same stocks and order sizes, and where each broker sends its orders and what it is paid, every figure in a real table. It refuses the trading-terminal default of a wall of colour-coded charts and KPI tiles.

OWN-WORLD: The established world in DESIGN.md (Fills and Fees, "The Calm Answer"): soft white cards on the teal-tinted ground (dark: dim sage), Figtree on the rem scale, sage-grey inks, the action teal only on pressable things, the neutral rail with ink dots as the signature, plain-language generated sentences, series colours only inside charts.

STORY: The visitor learns that a handful of trading firms fill most orders and that their prices differ (and that the comparison mixes in each firm's brokers), sees which firms their broker uses and what it is paid, trusts it because each card names its report, month or quarter, and moves on to their broker's page.

FIRST VIEWPORT: Header with Trading firms current; h1 "Who fills your order?" and one line; the filter bar; the prices card leads with its generated sentence and the ranked rails (desktop shows most of the eight firms; a phone shows the sentence and the first rows).

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll). Signature carried over from the broker page: the neutral rail and ink dot, gliding and re-ranking on the stock switch.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
