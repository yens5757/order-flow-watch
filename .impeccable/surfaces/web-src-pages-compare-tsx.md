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

The broker page's board for two: the answer card leads (the gap between the two at Display size in words, each broker's figure and rank, the scale with both ink dots, the generated short answer at a 60–75 character measure), then a typical year at each (both dots on the small scale), the side-by-side table, what each is paid, registration, cost by order size, and other comparisons. Desktop: two independent stacks in the broker page's 648:448 ratio; phones: one stack, the yearly card straight after the answer. Memorable moment: flipping S&P 500 / Other stocks glides both brokers' dots to their new places on the one scale while the gap and the table re-state themselves (no motion under reduced motion).

## Direction contract

THESIS: A comparison page is one calm answer about two brokers: a soft card stating which one's customers paid less above the fair price per $10,000 and by how much, with both brokers placed on the same neutral scale among all brokers. It refuses the category defaults: a scoreboard of coloured winners, a versus-graphic, and the review site's star ratings and Open-account buttons.

OWN-WORLD: The established world, exactly as DESIGN.md records it and the broker page renders it: soft white cards (24px, 20px on phones) on the teal-tinted Sage Ground (dark: dim sage with darker cards), Figtree on the seven-step rem scale with tabular numerals, sage-grey ink, one action teal only on pressable things and focus, the Lift shadow, pill controls with 44px targets, the one ease-out curve; no gradients, glow, icon tiles, kickers or numbered circles.

STORY: The visitor reads the gap in dollars and the two places on the scale in one screen, sees what a typical year costs at each, checks the table, payment and registration if they doubt it, and moves on to another pair or to the calculator with their own numbers.

FIRST VIEWPORT: Header (wordmark, nav with Compare current, theme button); the h1 naming the pair with the pair picker (two selects and a Compare link) beside it on a desktop and under it on a phone; the stock and order-type switches with the month; the answer card: the gap at Display size with "cheaper at <broker> / per $10,000 traded" and its (i), each broker's figure and rank, the scale with both dots. Desktop: the typical-year card to the right. Phone: the answer card starts in the first screen; nothing sticky.

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
