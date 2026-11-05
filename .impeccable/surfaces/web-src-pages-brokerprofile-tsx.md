---
version: 1
slug: "web-src-pages-brokerprofile-tsx"
primary_target: "web/src/pages/BrokerProfile.tsx"
related_targets: []
---

## Scope and visitor mode

The broker page template (`/brokers/<slug>/`, 25 brokers plus the Apex clearing-firm page). Mode: read — the visitor needs to understand one answer. This surface establishes the visual world the rest of the site adopts in the rollout.

## Audience, job, proof, constraints

- Visitors deciding whether to stay with a broker or switch; they land here from search, often on a phone, and scan.
- Job: in the first screen, is this broker's price good (dollars per $10,000 above the fair price, rank of 25, one generated sentence); next, what a typical year costs (24 trades of $2,000, half S&P 500 and half other stocks: trade prices + commissions; rank among brokers with every fee confirmed).
- Proof on the page: the price scale, a ranked table of all 25 brokers with last month's rank, dated one-liners for payment (Rule 606, fallback quarter named) and registration (FINRA, SIPC), the fees list with source and check date.
- Only fees stay below the answer. Routing and payment history move to this broker's section on the Trading firms page (the payment line's "Details"); cost by order size, fractional vs whole shares and execution speed become Brokers-explorer measures.
- One control: the S&P 500 / Other stocks switch. Market orders, latest month, latest payment quarter with fallback.
- Composition reference (owner-approved MVP): `.impeccable/mocks/mvp/consumer-app-sage.html`.

## Chosen direction and memorable moment

Warm Consumer App, with neutrals tinted from the action teal. Memorable moment: flipping the stock switch glides this broker's dot along the price scale while the ranked table re-sorts in place.

## Unresolved decisions

None blocking. The rest of the site keeps its current structure until the rollout; on this branch it inherits the new tokens and type.

## Direction contract

THESIS: The broker page is one calm answer: a soft card stating what this broker's customers paid above the fair price per $10,000 and where that sits among 25 brokers, then what a typical year costs. It refuses the category defaults: a dark dashboard of equal KPI tiles, and the review site's ratings and Open-account buttons.

OWN-WORLD: Soft white cards (20–24px corners, barely-there shadow) on a pale sage-grey ground tinted from the action teal (#EDF2F0; dark #1A2220 with #232D2A cards). Figtree for everything, plain-language labels, one idea per card. One action colour, teal #0F7B6C (dark #5CCBB6), only on things you can press; neutrals tinted toward teal; no gradients, glow, icon tiles or cheerleading copy.

STORY: The visitor understands in one screen whether this broker's prices are good, sees what a typical year costs, trusts it because every figure is dated and sourced, and moves on to compare brokers or put in their own numbers.

FIRST VIEWPORT: Header (wordmark, nav, theme toggle), breadcrumb, the stock switch; h1 broker name. The price card leads: the big dollar figure beside "above the fair price per $10,000 traded", the rank line, the gap to the cheapest, the price scale (cheapest · this broker's dot · typical tick · most expensive), the generated sentence. Desktop: the yearly card sits to the right with its Change button. Phone: the yearly card's top edge peeks below the price card; nothing sticky.

FORM: Warm Consumer App, a dealt challenger (catalog digital-design-canon-warm-consumer-app-surface), not on the grounded list; the roll had assigned list position 5 (The Standings). Chosen by the owner after full-page MVPs; ground translated from warm cream to teal-tinted neutrals by the owner's delegation. seed:79f5bd6605318015. Signature interaction: the switch glides the dot along the scale and re-ranks the table in place (no motion under reduced motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
