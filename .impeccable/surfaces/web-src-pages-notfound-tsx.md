---
version: 1
slug: "web-src-pages-notfound-tsx"
primary_target: "web/src/pages/NotFound.tsx"
related_targets: []
---

## Scope and visitor mode

The not-found page: web/src/pages/NotFound.tsx. It answers any address the site has no page for: an unknown path, or a broker or broker pair the data doesn't know. GitHub Pages serves the pre-rendered `404.html` shell for these with a 404 status; the app renders this page there once site.json is in, and `describeRoute` (web/src/lib/routes.ts) gives it its own title ("Page not found · Fills and Fees"), no canonical link and `robots: noindex`. Mode: recover. The visitor followed a stale or mistyped link and wants a way back, fast. Part of the rollout of the established world (DESIGN.md); the broker page is the reference surface.

## Audience, job, proof, constraints

- Anyone arriving on a dead link (an old hash route the rewriter could not map, a removed broker, a typo), on a phone or a desktop.
- Job: say plainly that there is no page at this address and give a way back in one step.
- Proof: three ways back (Home, Brokers, Compare) as the broker page's soft pills, plus the full header nav and the footer, which every page carries.
- Constraints: no alarm colour, illustration, error code shown as decoration, kicker or cheerleading; the same header, footer, ground and h1 scale as every page; one h1, the pills in a labelled nav ("Other pages"); 44px targets; no horizontal scroll at 320px; noindex and no canonical so search engines never list it.

## Composition and memorable moment

The h1 "Page not found" with one plain line under it ("There's no page at this address."), then one soft white card at the 44rem reading width holding the three pills, three across from 640px and stacked on phones. Memorable moment: none is wanted. The calm is the point; the price scale or a big figure here would be decoration.

## Direction contract

THESIS: A dead end that is not a dead end: name the problem in plain words and put the way back right under it. It refuses the category defaults: a joke illustration, a giant "404", a search box with nothing to search.

OWN-WORLD: The established world in DESIGN.md, unchanged: soft white card on the teal-tinted Sage Ground (dark: dim sage with a darker card), Figtree, sage-grey ink, the action teal only on pressable things (the pills are Deep Teal on Soft Teal, as the broker page's "Compare with" pills), Lift shadow, the one ease-out curve on press.

STORY: The visitor sees at once that the address has no page, picks Home, Brokers or Compare, and is back in the site in one press.

FIRST VIEWPORT: Header with no page current; h1 and its line; the card of three pills. Phone and desktop alike show all of it without scrolling.

FORM: takes on the established world (the broker page's direction contract) with no direction round of its own, so it has no concept roll and no seed of its own. seed:79f5bd6605318015 (inherited from web-src-pages-brokerprofile-tsx.md; no new roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
