---
version: 1
slug: "web-src-pages-method-tsx"
primary_target: "web/src/pages/Method.tsx"
related_targets: ["web/src/components/method"]
---

## Scope and visitor mode

The "How we measure" page (`/how-we-measure/`): web/src/pages/Method.tsx with its parts in web/src/components/method/. Mode: read. The visitor came to understand how the numbers are made and whether to trust them. It is part of the rollout of the broker page's world: it inherits that world and adds no new direction.

## Audience, job, proof, constraints

- Audience: a retail investor who pressed "How we measure" on a broker page, the calculator or the footer and wants to know what "$0.82 above the fair price per $10,000 traded" means and where it comes from; second, the technical reader (Hacker News, academics, press) who checks the method and the statistics before trusting a number.
- Job: answer "how do you get these numbers?" in the first screen (three public sources, each with its report and date), then explain the price figure, the same-stocks comparison, the payment figure and the fees, state every limit plainly, answer common questions, and give the payment-and-price evidence with its statistics collapsed.
- Proof: every number and name generated from site.json (months, quarters and late filers, brokers without a payment report, a worked dollar example from one real broker, the same-stocks range, every test result); links to the rules; the evidence set as real tables. The same-stocks section also states the answer card's sentence rule in two short sentences (Nov 2026: broker pages rank the gap beside the average price, and the words go by thirds of the brokers, "better than most" / "near the middle" / "worse than most"), the place the card's same-stock (i) links to. The question "Why does <broker> look cheapest?" picks unpaid brokers whose gap is above the median and says they get "worse prices than the typical broker on the same stocks and order sizes" (Nov 2026 polish; it said "than most", which the cards now reserve for the worst third, so Wealthfront, 16th of 25 and "near the middle either way" on its own card, was called worse than most here).
- Constraints: DESIGN.md; "prices" not "fills"; "trading firms" in headings; "the same stocks and order sizes", never "identical trades"; p-values worded accurately (the share of random shufflings that gave a link at least as strong, never "the chance it is random"); neutral, not advice; few words (the owner's standing feedback); a 65-75 character measure; readable before the script loads.

## Composition and memorable moment

Header; h1 "How we measure" and one line. Desktop: the broker page's 648:448 board, the reading column of section cards on the left, opening with the answer card (three sources as dated value rows), and "On this page" in the right column beside it. Phones and tablets: one 44rem stack with the contents right after the answer. Sections: what "above the fair price" means (a worked example drawn as the neutral scale: best price to sell, the fair-price tick, your buy as the ink dot, best price to buy; it ends in the broker page's own figure, "$1.00 above the fair price per $10,000 traded", then one real broker's report turned into dollars), same stocks and order sizes, what brokers are paid, fees, what the data can't show, common questions. Last, full width: "Do brokers paid more give worse prices?" with the generated answer as a small table of worded verdicts, and "Show the statistics", which opens the forest table in place.

Placement (reviewed Nov 2026, kept): the sections follow the answer card's rows (prices, payments, fees), then the limits, the questions and the evidence, as the intro line promises (where from, what it means, what it can't show). The contents come second in the page, so Tab and screen readers meet them where the eye does; on a desktop they are sticky in a column of their own beside all seven reading cards (in use that column is never empty; only a full-page capture shows its length), and nothing goes under them, or they would stop following the reader. The evidence stays last and full width: it builds on the same-stocks and payment sections, its forest table needs the width (in the 648 column it restacks), and "What is payment for order flow?" just before it links down to it. Inside it: the verdict, the table of verdicts beside it (under it on phones), what goes with prices instead, then the button. Phones and tablets: the same order in one column, the contents open (on a page some 5,700px tall the list is the map). No CSS reordering anywhere.

Memorable moment: the evidence is a forest plot set as a real table. Each test's 95% interval and estimate are drawn on the site's neutral rail with a zero tick, beside its numbers and a worded verdict. Flipping S&P 500 / Other stocks glides every dot and interval to its new place (0.8s on the system curve, none under reduced motion), as the broker page's switch glides its dot.

## Direction contract

THESIS: How we measure is calm documentation for the answers on every other page: where each number comes from, what it means and what it can't show, in plain words, with the evidence a sceptic needs one press away. It refuses the category defaults: a wall of methodology prose, a dashboard of KPI tiles, and a statistics appendix only a statistician can read.

OWN-WORLD: The established world in DESIGN.md ("The Calm Answer"): soft white cards on the teal-tinted ground (dark: dim sage), Figtree on the seven-step rem scale, sage-grey inks, teal only on pressable things and focus, the neutral price scale as the signature, real tables, words not colour for good and bad. No new tokens.

STORY: The reader learns in the first screen that every figure comes from three public sources, each dated; sees on the drawn spread what "above the fair price per $10,000" means; reads the limits stated plainly; and, doubting the headline, opens the statistics to find every test as a table they can check.

FIRST VIEWPORT: Header with the nav (no item current) and the theme switch; h1 "How we measure" and one line; the answer card "Where the numbers come from" with three dated rows (prices: SEC Rule 605, the latest month; payments: SEC Rule 606, the latest quarter with late filers named; fees: each broker's own price list, the check date). Desktop: "On this page" beside it and the top of the fair-price card below. Phone: the contents card's top edge under the answer card.

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll). The signature is used where it explains (the worked spread, the forest table's rails) and the switch's glide is the one motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
