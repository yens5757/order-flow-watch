---
version: 1
slug: "web-src-pages-home-tsx"
primary_target: "web/src/pages/Home.tsx"
related_targets: ["web/src/components/home"]
---

## Scope and visitor mode

The home page (`/`): web/src/pages/Home.tsx and web/src/components/home/. Mode: persuade. The visitor decides whether this site can answer their question and acts on it: picks their broker, then opens its page, a comparison or the calculator. Part of the rollout of the established world (DESIGN.md); the broker page is the reference surface, so this page adopts its cards, scale, table and copy rules rather than inventing new ones.

## Audience, job, proof, constraints

- Retail investors from search, Reddit or Hacker News, often on a phone. Most land on deep links, so home has to answer fast and hand off.
- Job: within one screen, an answer about the visitor's own broker: dollars above or below the fair price per $10,000 traded, its rank among 25, its rank on the same stocks and order sizes right under it, the price scale with its dot, one generated sentence graded by the two ranks; then a link to its page and to a comparison.
- Proof: the ranked table of all 25 brokers (the picked one on a Here row), what each is paid beside its price; three findings from the evidence table with the caveat that cuts against each; the yearly figure the broker pages use (24 trades of $2,000).
- Constraints: one picker that never navigates (it updates the answer in place) plus the S&P 500 / other stocks switch the broker page has; every number and verdict generated from site.json; no chart library on this page; few words ("a number plus one line"); "prices" not "fills", "the same stocks and order sizes", never "identical trades"; neutral, not advice. Cut the old page (about 6,860px on a phone) by at least half: no stat tiles, no embedded calculator, no step circles, no teal bands.

## Composition and memorable moment

An opening with room (owner's request, Nov 2026: "the main page just needs some space to show some main text for getting attention"): the question as a centred h1 at the scale's largest step, the proof line "The numbers brokers must report by law, read the same way for every broker", the promise "No ads · No affiliate links · No money from brokers" and "Checked for new reports every week · last on <date>", with the control row centred under them: "Your broker" select, the stock switch, the scope (market orders, month). From 1024px a board of two stacks: left, the answer card (Display figure, rank, the same-stock rank under it, gap to the cheapest, scale, sentence, a solid link to the broker's page and a compare link; the broker page's price card in every word and rule, its brief has the details, Nov 2026), the yearly one-liner, the findings, a few side-by-side comparisons (hand-picked: never called popular until analytics drive the list); right, the ranked table of all 25. Below 1024px one 44rem column in the same order with the table showing the picked broker's neighbourhood and "See all 25". Memorable moment: picking a broker glides its dot along the scale to its true place while its row takes the Here tint in the ranking; flipping the switch glides every mark and re-ranks the table in place.

The ranking in plain units (Nov 2026, from the critique's second P1): the broker page's two cells, word for word ("$0.09 below" rather than a minus sign under "Above fair price"; "Not paid", "Pays $0.07" over "to its trading firm", "Pays $0.01" over "in exchange fees"; its brief has the rules). In the right column's copy, 448px wide from 1200px, the columns sit 8px from each other's edges (12px at the row ends, the Here row's rounded ends kept) so the four columns and the payment's words fit; there the two brokers below the fair price on S&P 500 stocks (Fidelity, J.P. Morgan) show "below" under the figure, and the price heading takes two lines, "Above fair / price" (three at the first pass's 10px). Below 560px a long name may wrap beside a price that says "below".

## Direction contract

THESIS: Home is the broker page's answer with the broker left open: ask the question, let the visitor name their broker, and answer it in the same calm card, with all 25 brokers beside it as proof. It refuses the landing-page defaults the old page used: stat tiles, icon cards, numbered steps, teal bands and an embedded calculator.

OWN-WORLD: The established world in DESIGN.md, unchanged: soft white cards on the teal-tinted Sage Ground (dark: dim sage with lighter cards), Figtree at the seven rem steps, sage-grey ink, the action teal only on pressable things, words not colour for good and bad, the neutral price scale, real tables with the Here row, Lift shadows, the one ease-out curve.

STORY: The visitor reads the question, names their broker, sees in one card what its customers paid above the fair price and where that ranks among 25, glances at the full ranking and what the reports show (with their caveats), and leaves for the broker's page, a comparison or the calculator.

FIRST VIEWPORT: Header (brand line "Broker comparison with nothing to sell"); the opening, centred: h1 "Is your broker getting you a good price?" at Display size, the proof line, the promise row and the weekly-check line, then the control row; below it the answer card led by the dollar figure, the rank and the scale (its top in the first screen at 1440x900). Desktop: the ranked table's top rows beside it. Phone: the opening and the control row fill the first screen and the answer's figure peeks below; nothing sticky.

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
