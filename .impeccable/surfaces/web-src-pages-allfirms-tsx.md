---
version: 1
slug: "web-src-pages-allfirms-tsx"
primary_target: "web/src/pages/AllFirms.tsx"
related_targets: []
---

## Scope and visitor mode

The All firms page (`/firms/`, off-nav, reached from the Brokers explorer): every firm that files a monthly SEC Rule 605 price report (about 100), with the share of the spread its customers paid. Mode: operate. The visitor came to look a firm up or to scan who gets the best prices, so the page is first a working table; the world lends type, palette, density and the price scale's gliding dots, never the layout or the controls.

## Audience, job, proof, constraints

- Finance and technical readers checking the whole field, and investors curious where their broker, its clearing firm or the trading firm that fills its orders stands. Desktop first; phones must work fully.
- Job: find any firm and read what its customers paid for the orders picked (stock group, order type, order size, month); see where the brokers on this site sit among every firm.
- Proof: one row per firm (every row in the page, also without a script), sortable, searchable, downloadable as CSV; the measure defined behind an (i); a firm with no report for these orders says so in words; firms too far out to draw are named.
- Constraints: names link only for the firms with a page here; no reporter codes in visible text; one short sticky row (the shared filter bar keeps stock group, order type and order size; the month picker moves beside the h1); no focusable table rows; restacked rows on phones, no sideways scroll at 320px; every number and count generated from site.json.

## Composition and memorable moment

Breadcrumb (Brokers > All firms), the h1 and one line, the month picker at its right; the shared filter bar. Card one, "Where the brokers on this site sit": four rails on one shared axis (on this site, other brokers, trading firms, exchanges and venues), each in the price scale's anatomy: a track, every firm a dot sitting on it and stacking upward where firms crowd, a mark-grey typical tick with "Typical" and its value under it; the site's brokers as ink dots, every other firm in mark grey; a mouse hover names a dot. Card two, "All firms": the group filter (pill switch; a select on phones), search, "Download CSV", the table in the broker page's ranked-table look (names linked in the world's ink-and-teal underline, the price column in bold), the first 25 rows and then "See all".

Memorable moment: change the stock group, order type, size or month and every firm's dot glides to its new place on its rail while the table re-sorts in place.

## Direction contract

THESIS: One working table of every firm that reports, opened by a single picture of where the site's brokers sit among them. It refuses the category defaults: a raw regulator list, and a dashboard scatter chart in a frame of tiles.

OWN-WORLD: The established world, by reference to DESIGN.md and the broker page: soft white cards on the teal-tinted ground (dark: dim sage), Figtree, sage-grey inks, teal only on what can be pressed, the neutral scale's track, ink dots, mark-grey tick and "Typical" label, hairline table rows with bold figures, words for unknowns.

STORY: The visitor sees the whole field at a glance, finds a firm by name, group or sort, opens the brokers that have a page here, and trusts the numbers because the report, month and measure are named beside them.

FIRST VIEWPORT: Header with Brokers current; breadcrumb; h1 "Every firm with a price report" with the month picker at its right on a desktop; the one-row filter bar (sticky from 1024px); the rails card with its four rows and axis. Phone: breadcrumb, h1, month, the filters full width, then the rails.

FORM: inherits the established world; no new direction round. seed: none (unavailable). Signature interaction: every firm's dot glides along its rail when a filter changes, the table re-sorting with it (nothing moves under reduced motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
