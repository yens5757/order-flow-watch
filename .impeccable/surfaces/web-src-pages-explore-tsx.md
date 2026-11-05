---
version: 1
slug: "web-src-pages-explore-tsx"
primary_target: "web/src/pages/Explore.tsx"
related_targets: ["web/src/components/explorer"]
---

## Scope and visitor mode

The Brokers explorer (`/brokers/`, in the nav as "Brokers"): every broker on any measure, or one measure plotted against another, its whole state in the query (`?m=&vs=&sp=&ot=&b=&q=&sort=&ex=&paid=&clr=`) so a view can be linked. Mode: operate. The visitor came to work a tool, so the page is first a working data explorer (controls over what they scope, a chart with clear states, a sortable table); the world lends type, palette, density and the price scale's gliding dot, never the layout or the controls.

## Audience, job, proof, constraints

- Finance and technical readers, press and academics checking the numbers; curious investors arriving from the nav. Desktop first for the tool; on a phone the answer comes first and the controls wait in a sheet.
- Job: pick one of 13 measures (prices, payments, same-stock gap, price improvement, order size, speed, fractional vs whole shares, four fees), optionally a second to plot it against; narrow by stock group, order type, order size, payment quarter and brokers; sort; read the result as one generated sentence, a chart and a real table; copy the link or the CSV.
- Proof: every figure from the Rule 605/606 reports or the dated fees file; the scope line names stocks, orders, size, month and payment quarter; the card's foot names the brokers without a figure, the late payment filers and the filters a measure ignores.
- Constraints: keep every measure (fract included), every filter and the shareable query state; one Tab stop per radio group, arrow keys inside; no select that navigates; real links on broker names, no focusable rows; nothing sticky and no nested scroll; no negative zero; AA in both themes; 44px targets; 16px fields on phones; no sideways page scroll at 320px; reduced motion honoured, chart included.

## Composition and memorable moment

Desktop: one column of full-width cards under the controls, never a board: the table needs the full width, and a second column could only hold the controls, which belong over what they change. The h1 and one line with "Copy link" beside it (the header slot, so it serves both layouts); two rows of labelled controls on the ground, the measure first because it is the page's question (Measure, Compare with, Brokers; then Stocks, Order type, Order size, Payments from, and "Reset view" once the view differs, after what it resets); the Brokers button ends the first row and opens the broker chips and the two broker switches in place, straight under it. Then the chart card: the measure as its title with the definition behind an (i), the scope line, the sort switch in the head (where every page puts a card's own switch), the generated sentence at lead size, the chart, a ruled foot of disclosures. Then the table card, complete rather than cut to a few rows behind "See all" (it holds the chart's figures for assistive tech and the page's only links to the broker pages): every measure, the chosen ones first and tinted Here, names as real links, search and CSV, the link to all firms at its head as its fuller list. Phones and tablets: the h1, "Change view" and "Copy link", then the chart card and the table at once; every control sits in a bottom sheet in the bar's order except the broker chips, which come last because the list is long, and the sheet closes with "Show N brokers". Nothing sticky: the bar is two rows. Placement reviewed in Nov 2026 and kept as it is.

Memorable moment: the ranked chart is the broker page's price scale given to every broker, one grey rail per row with an ink dot at the broker's value and the typical tick lined up through every row; change the measure or the order and the rows re-sort in place while each dot glides along its rail to its new value.

Signs said plainly (Nov 2026, from the critique's second P1): the explorer is the one page that keeps signed figures, so the price measure says what its sign is measured against. Its column reads "Vs fair price / $10k" with the sign always written (+$0.82, −$0.09; a figure that rounds to zero has none), the ranked rails' zero line and the scatter's zero tick read "Fair price", and its (i) says above (+) or below (−). The payment measure is "per $10,000 of orders" (was "per $10,000 order") and its (i) says what below zero means (the broker pays: its trading firm, or exchange fees). The scatter's labels are untouched (left for a later round).

## Direction contract

THESIS: One working explorer that answers "which brokers lead on this measure, and does it go with that one?" in a generated sentence, a ranked rail chart or a named scatter, and a full table, all from one set of controls whose state is the link. It refuses the category defaults: a dense trading dashboard of tiles and colour-coded bars, and a filter sidebar that scrolls inside itself.

OWN-WORLD: The established world, by reference to DESIGN.md and the broker page: soft white cards on the teal-tinted ground (dark: dim sage), Figtree, sage-grey inks, teal only on what can be pressed (pills, selects, the switch, chips, links), the neutral scale's track, ink dots, mark-grey typical tick and "Typical" label, hairline table rows with the Here tint, words for good, bad and unknown.

STORY: The visitor picks a measure and sees at once who leads and who trails and where the typical broker sits, adds a second measure to see whether the two move together, narrows the orders or brokers, checks the exact figures in the table, and shares the view by its link.

FIRST VIEWPORT: Header with Brokers current; h1 "Every broker, every number", one line, "Copy link" at its right; the two control rows; the chart card's title, scope, sentence and the first rows of the rail chart. Phone: h1, "Change view" and "Copy link", then the chart card with its sentence and first rows; nothing sticky.

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll). Signature interaction: the rows of the rail chart re-sort in place and every dot glides to its new value when the measure, a filter or the order changes (nothing moves under reduced motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
