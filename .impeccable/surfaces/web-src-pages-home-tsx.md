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
- Job: within one screen, an answer about the visitor's own broker: dollars above or below the fair price per $10,000 traded, its rank among 25, the price scale with its dot, one generated sentence; then a link to its page and to a comparison.
- Proof: the ranked table of all 25 brokers (the picked one on a Here row), what each is paid beside its price; three findings from the evidence table with the caveat that cuts against each; the yearly figure the broker pages use (24 trades of $2,000).
- Constraints: one picker that never navigates (it updates the answer in place) plus the S&P 500 / other stocks switch the broker page has; every number and verdict generated from site.json; no chart library on this page; few words ("a number plus one line"); "prices" not "fills", "the same stocks and order sizes", never "identical trades"; neutral, not advice. Cut the old page (about 6,860px on a phone) by at least half: no stat tiles, no embedded calculator, no step circles, no teal bands.

## Composition and memorable moment

The question as the h1 with one plain line under it, then one control row: "Your broker" select, the stock switch, the scope (market orders, month). From 1024px a board of two stacks: left, the answer card (Display figure, rank, gap to the cheapest, scale, sentence, a solid link to the broker's page and a compare link), the yearly one-liner, the findings, a few side-by-side comparisons (hand-picked: never called popular until analytics drive the list); right, the ranked table of all 25. Below 1024px one 44rem column in the same order with the table showing the picked broker's neighbourhood and "See all 25". Memorable moment: picking a broker glides its dot along the scale to its true place while its row takes the Here tint in the ranking; flipping the switch glides every mark and re-ranks the table in place.

## Direction contract

THESIS: Home is the broker page's answer with the broker left open: ask the question, let the visitor name their broker, and answer it in the same calm card, with all 25 brokers beside it as proof. It refuses the landing-page defaults the old page used: stat tiles, icon cards, numbered steps, teal bands and an embedded calculator.

OWN-WORLD: The established world in DESIGN.md, unchanged: soft white cards on the teal-tinted Sage Ground (dark: dim sage with lighter cards), Figtree at the seven rem steps, sage-grey ink, the action teal only on pressable things, words not colour for good and bad, the neutral price scale, real tables with the Here row, Lift shadows, the one ease-out curve.

STORY: The visitor reads the question, names their broker, sees in one card what its customers paid above the fair price and where that ranks among 25, glances at the full ranking and what the reports show (with their caveats), and leaves for the broker's page, a comparison or the calculator.

FIRST VIEWPORT: Header; h1 "Is your broker getting you a good price?" and one line; the control row; the answer card led by the dollar figure, the rank and the scale. Desktop: the ranked table's top rows beside it. Phone: the figure and the rank fit in the first screen; nothing sticky.

FORM: inherits the established world (the broker page's direction contract); no new direction round. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
