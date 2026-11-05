---
version: 1
slug: "web-src-pages-compare-tsx"
primary_target: "web/src/pages/Compare.tsx"
related_targets: []
---

## Scope and visitor mode

The comparison pages: `compare/<a>-vs-<b>/` (every pair of the 25 retail brokers, pre-rendered, slugs in alphabetical order) and the bare `compare/` page (the default pair under its own heading, "Compare two brokers"). Mode: read. The visitor came to understand one answer about two brokers; the page is a comparison sheet framed by the world the broker page established.

## Audience, job, proof, constraints

- Visitors deciding between two brokers or whether to switch, landing from search ("robinhood vs fidelity") on a phone or a desktop. They scan.
- Job, in the first screen: which of the two got its customers the better price on a trade, by how much per $10,000 traded, and where both sit among all brokers. Next: what a typical year costs at each, then the evidence.
- Proof: one price scale with both brokers' dots; a real side-by-side table (prices and fees, a neutral tick marking the better value); what each is paid (Rule 606, quarter named, a late filer's fallback named); FINRA and SIPC records; cost by order size with its table; every figure dated and sourced, "How we measure" one click away.
- Constraints: numbers and verdicts generated from data; words, not colour, for good and bad; "prices", "trading firms", "the same stocks and order sizes"; neutral, not advice. The pair pickers only report a pick and a "Compare" link navigates (WCAG 3.2.2). Nothing sticky but the table's short name row. Two filters (stocks, order type) shared with other pages through App state.

## Composition and memorable moment

The broker page's board for two. Desktop, two independent stacks in the broker page's 648:448 ratio: on the left the answer card leads (the gap between the two at Display size in words, each broker's figure and rank, the scale with both ink dots, the generated short answer at a 60–75 character measure), then the side-by-side table; on the right cost by order size heads the column (the owner's call), beside the answer whose gap it splits by order size, then a typical year at each (both dots on the small scale), what each is paid and registration; other comparisons at full width under the board. Phones and tablets, one stack in reading order: the answer, the yearly card straight after it (rendered twice, CSS shows one per width), the side-by-side table, cost by order size, what each is paid, registration, other comparisons. Cost by order size follows the table there, not the answer: the year finishes the answer, the table carries every price and fee (each broker's typical order size among them, which the chart is read against), and placing it higher would take a second, hidden chart. The right column runs longer than the left for every pair (80–350px); moving either short card left leaves a longer gap under the right one, so both stay at its foot. Memorable moment: flipping S&P 500 / Other stocks glides both brokers' dots to their new places on the one scale while the gap and the table re-state themselves (no motion under reduced motion).

Plain units and a shorter table (Nov 2026, from the critique's second P1: distil the side-by-side table, dollars and fees first). The table now opens on what decides: Prices, two rows (extra cost per $10,000 traded, noted "above the fair price", "$0.09 below" rather than "−$0.09"; "On the same stocks and order sizes", noted "rank, cheapest first", "1st of 25" against "13th of 25": the answer cards' rank, words and (i) from lib/broker.ts, market orders whatever the order type, noted when marketable limit orders are shown), then the five fees. The share of the spread, the same-stock gap (in words, "15.2 points less", the trading-firms page's phrasing), orders that beat the quoted price, typical order size and average execution speed wait behind "More measures" at the table's foot: a teal disclosure in the "Show as a table" look, closed by default, "Fewer measures" when open, the rows inside the same table under the same sticky names (without a script the rows show and the button is hidden). Each keeps its (i); the speed row has no tick (slower orders got better prices). The open table carries one (i), down from seven. The rank needs every broker's figure, so SideBySide takes the data (`d`, required; Compare.tsx passes it). The same words reach the rest of the page: the answer card's ranked table ("Above fair price", "$0.09 below") and the scale's end captions ("Fidelity $0.09 below"), cost by order size's table, tooltip and foot (its axis keeps the sign, where the zero line shows it), and "What each is paid" ("Pays $0.07" with "to its trading firm, rather than being paid"; "per $10,000 of orders" in the short answer).

## Direction contract

THESIS: A comparison page is one calm answer about two brokers: a soft card stating which one's customers paid less above the fair price per $10,000 and by how much, with both brokers placed on the same neutral scale among all brokers. It refuses the category defaults: a scoreboard of coloured winners, a versus-graphic, and the review site's star ratings and Open-account buttons.

OWN-WORLD: The established world, exactly as DESIGN.md records it and the broker page renders it: soft white cards (24px, 20px on phones) on the teal-tinted Sage Ground (dark: dim sage with lighter cards), Figtree on the seven-step rem scale with tabular numerals, sage-grey ink, one action teal only on pressable things and focus, the Lift shadow, pill controls with 44px targets, the one ease-out curve; no gradients, glow, icon tiles, kickers or numbered circles.

STORY: The visitor reads the gap in dollars and the two places on the scale in one screen (on a desktop with the gap at every order size beside it), sees what a typical year costs at each, checks the table, payment and registration if they doubt it, and moves on to another pair or to the calculator with their own numbers.

FIRST VIEWPORT: Header (wordmark, nav with Compare current, theme button); the h1 naming the pair with the pair picker (two selects and a Compare link) beside it on a desktop and under it on a phone; the stock and order-type switches with the month; the answer card: the gap at Display size with "cheaper at <broker> / per $10,000 traded" and its (i), each broker's figure and rank, the scale with both dots. Desktop: cost by order size to the right (its one-line take, the key and both brokers' lines across the sizes), the typical-year card under it, just below the first screen. Phone: the answer card starts in the first screen; nothing sticky.

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
