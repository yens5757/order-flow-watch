---
name: Fills and Fees
description: What your broker's trades really cost, as one calm answer per page.
colors:
  page: "#EDF2F0"
  surface: "#FFFFFF"
  surface-2: "#E6F0EC"
  surface-3: "#E1E9E6"
  ink: "#374642"
  ink-2: "#55615C"
  muted: "#5E6B66"
  mark: "#7C8984"
  border: "#E1E8E5"
  rule: "#D5DEDA"
  baseline: "#BCC8C3"
  track: "#E1E9E6"
  here: "#E6F0EC"
  selection: "#D3E3DD"
  accent: "#0F7B6C"
  accent-hover: "#0B6155"
  accent-soft: "#E3F1ED"
  on-accent: "#FFFFFF"
  page-dark: "#1A2220"
  surface-dark: "#232D2A"
  surface-2-dark: "#2C3733"
  surface-3-dark: "#36443F"
  ink-dark: "#EAF1EE"
  ink-2-dark: "#B0BEB9"
  muted-dark: "#A5B3AE"
  mark-dark: "#93A29C"
  border-dark: "#33403B"
  rule-dark: "#2E3A36"
  baseline-dark: "#4A5853"
  track-dark: "#36443F"
  here-dark: "#2E3D38"
  selection-dark: "#3A4D46"
  accent-dark: "#5CCBB6"
  accent-hover-dark: "#7AD8C6"
  accent-soft-dark: "#24403A"
  on-accent-dark: "#0F1F1B"
  critical-ink: "#B42F2F"
  critical-ink-dark: "#EA7A7A"
  seq-0: "#eef4fd"
  seq-1: "#b7d3f6"
  seq-3: "#256abf"
  seq-4: "#104281"
  seq-0-dark: "#162238"
  seq-1-dark: "#184f95"
  seq-3-dark: "#6da7ec"
  seq-4-dark: "#b7d3f6"
  series-1: "#2a78d6"
  series-2: "#eb6834"
  series-3: "#1baf7a"
  series-4: "#eda100"
  series-5: "#e87ba4"
  series-6: "#008300"
  series-7: "#6250d6"
  series-8: "#e34948"
  series-1-dark: "#3987e5"
  series-2-dark: "#d95926"
  series-3-dark: "#199e70"
  series-4-dark: "#c98500"
  series-5-dark: "#d55181"
  series-6-dark: "#008300"
  series-7-dark: "#9085e9"
  series-8-dark: "#e66767"
  ramp-1: "#374642"
  ramp-2: "#5E6B66"
  ramp-3: "#83908B"
  ramp-1-dark: "#EAF1EE"
  ramp-2-dark: "#A5B3AE"
  ramp-3-dark: "#76837E"
typography:
  display:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(3.75rem, 2.85rem + 3vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.5rem, 2.05rem + 1.5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline-sm:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 1.55rem + 1.5vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree Variable, Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  tick: "2px"
  row: "14px"
  panel: "20px"
  card: "24px"
  card-phone: "20px"
  switch-wrap: "26px"
  pill: "999px"
spacing:
  gutter: "24px"
  gutter-phone: "16px"
  card-pad: "32px"
  card-pad-phone: "20px"
  stack: "16px"
  stack-phone: "12px"
  columns: "24px"
  container: "70rem"
  reading: "44rem"
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "30px 32px"
  button-solid:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-solid-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
  pill-soft:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
    rounded: "{rounded.pill}"
    padding: "0 14px 0 18px"
    height: "48px"
  switch-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  switch-option-checked:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  nav-link:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  nav-link-current:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
  round-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    size: "44px"
  table-row-here:
    backgroundColor: "{colors.here}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
  menu-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "8px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "48px"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  filter-chip-on:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  page-header:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    padding: "40px 0 0"
  segmented-track:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.switch-wrap}"
    padding: "2px"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 44px 0 20px"
    height: "48px"
  select-hover:
    backgroundColor: "{colors.accent-soft}"
  info-button:
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    size: "44px"
  info-button-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
  info-button-open:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  tip-panel:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.row}"
    padding: "10px 14px"
  toggle:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    width: "46px"
    height: "28px"
  toggle-on:
    backgroundColor: "{colors.accent}"
  status-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 12px 3px 8px"
  empty-state:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.row}"
    padding: "24px"
  table-cell:
    textColor: "{colors.ink}"
    padding: "13px 12px"
  filter-bar:
    backgroundColor: "{colors.page}"
    padding: "12px"
---

# Design System: Fills and Fees

## Overview

**Creative North Star: "The Calm Answer"**

Every page is one soft card stating one answer in plain words, laid on a pale ground tinted from the action teal. The system is a warm consumer app, not a trading dashboard: white cards with generous corners and a shadow you notice only as lift, Figtree for everything, the number first and set big, and a single teal that appears only on things you can press. Nothing on the page sells, celebrates or alarms. Meaning is carried by words ("above the fair price", "10th cheapest of 25", "Not confirmed"), never by a red or green figure.

Density is low and deliberate: one idea per card, cards stacked in columns, explanations one click away behind an (i) or a "How we measure" link. The product's signature is the neutral price scale, a grey rail that places one broker's ink dot between the cheapest and the most expensive with a tick at the typical broker, drawn in CSS and gliding when the stock switch flips. Every comparison that the scale summarises is also given as a real table.

Light is the default; dark follows the system until the visitor picks a theme, and both themes are tuned separately rather than auto-inverted. The world rejects gradients, glow, icon tiles, uppercase kickers, colour-coded verdicts, ratings and "Open account" buttons.

**Key Characteristics:**
- Soft white cards (24px corners, 20px on phones) on a teal-tinted neutral ground (light page; in dark, a dim sage page with lighter cards).
- One typeface, Figtree, weight 800 for headings and the big figure, tabular numerals for every number.
- One action colour, teal, reserved for pressable things; everything else is ink and tinted greys.
- The neutral price scale as the signature visual; tables for every comparison.
- Pill-shaped controls, 44px minimum hit areas, a 3px teal focus ring clear of the element.
- One motion curve, an exponential ease-out with no overshoot; nothing moves under reduced motion.

## Colors

A near-monochrome system of teal-tinted greys with one saturated teal for action, and a separate validated series palette for charts.

### Primary
- **Action Teal** (accent; dark: accent-dark): the only accent. Fills the solid button, the checked switch option, the skip link and the open menu button; outlines the ghost button, the switch and the theme button; colours "Details", "See all" and source links; draws every focus ring and the underline of in-text links.
- **Deep Teal** (accent-hover; dark: accent-hover-dark, which is lighter): hover state of everything teal, and the text colour on Soft Teal fills.
- **Soft Teal** (accent-soft; dark: accent-soft-dark): hover fill of ghost and outlined controls, the resting fill of quiet secondary pills, the current item in the phone menu.
- **On Teal** (on-accent; dark: on-accent-dark, a near-black green): text and icons on a teal fill.

### Neutral
- **Sage Ground** (page; dark: page-dark): the page background, also the browser's theme-color.
- **Card White** (surface; dark: surface-dark): cards, the current nav pill, the switch track, round buttons.
- **Raised Tint** (surface-2, surface-3; dark variants): raised panels and chart tooltips; surface-2-dark doubles as the dark menu panel ("raise").
- **Ink** (ink; dark: ink-dark): headings, figures, body text, the broker's dot on the scale.
- **Secondary Ink** (ink-2; dark: ink-2-dark): sub-lines, scope text, table headings, footnotes, "Not confirmed" values. Muted (muted) is the chart-axis variant.
- **Mark Grey** (mark; dark: mark-dark): the scale's end dots and typical tick, the scrollbar thumb. Non-text only.
- **Hairlines** (border for rows inside cards, rule for the header and footer edges, baseline for chart axes; dark variants).
- **Track** (track): the scale's rail.
- **Here** (here): the row of the broker the page is about, in every table.
- **Selection** (selection): text selection.
- **Error Ink** (critical-ink; dark: critical-ink-dark): only the edge and alert icon of a number box holding a mistake (the calculator). Never on data, figures or verdicts.

### Series (charts only)
- **Validated series palette** (series-1 … series-8, stepped separately per theme): chart lines and bars, read into ECharts from the CSS custom properties. series-1 is "paid", series-2 is "cost"; better/worse reuse series-1/series-8. Never used for text, controls or cards. A trading firm keeps one series colour on every chart of the Trading firms page.
- **Sequential steps** (seq-0, seq-1, seq-3, seq-4; the dark variants run the other way): the four shades of the routing heat table. Light cells take ink, dark cells the card colour, every pair at least 5.4:1; the number is written in every cell.
- **Neutral ramp** (ramp-1 … ramp-3, ink to light sage; dark variants light to mid sage; each at least 3:1 on the card, about 15 lightness steps apart): a chart's series where every series colour already means something else. On Trading firms the eight series colours name firms, so a broker's payment rate is an ink line and its dollars by type of trade are ramp-stacked columns, each with its HTML key and table.

### Named Rules
**The Press-Only Teal Rule.** Teal marks only what can be pressed or what has keyboard focus. A heading, a figure, a badge, a decorative shape or a "good" value is never teal. If it is teal, clicking it does something.

**The Words-Not-Colour Rule.** Good and bad are stated in words ("below the fair price", "11th cheapest of 20", "Pays $0.01", "Not confirmed"), never by colouring a figure red or green. Prices, ranks and payments are all ink.

**The Contrast Floor Rule.** All text reaches at least 4.5:1 on its own background in both themes (light: ink-2 on surface 6.5:1, accent on surface 5.2:1, accent on page 4.6:1; dark: ink-2 on surface 8.0:1, accent on surface 7.7:1). Non-text marks reach at least 3:1 against the card (mark on surface 3.6:1 light, 5.6:1 dark). Text on Soft Teal is Deep Teal, never Action Teal (accent on accent-soft is 4.4:1 in light, below the floor).

**The Two Tuned Themes Rule.** Light and dark are each tuned by hand; in dark the teal lightens, the on-teal text turns near-black and hover goes lighter, not darker. The two dark blocks in the stylesheet (picked and system) stay identical.

## Typography

**Display Font:** Figtree Variable (self-hosted, with system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Figtree Variable (the same family)

**Character:** One friendly geometric sans at every size. Hierarchy comes from weight (800 for headings and figures, 700 for values, 600 for labels and links) and size, never from a second family, uppercase or letter-spaced labels.

### Hierarchy
The scale has seven rem steps so it follows the reader's own text size; the top three are fluid.
- **Display** (800, clamp 3.75–4.75rem, 0.92, -0.035em, tabular): the one big figure per page, such as the dollar amount on the price card.
- **Headline** (800, clamp 2.5–3rem, 1.05, -0.03em): the page h1 (the broker's name).
- **Headline small** (800, clamp 2–2.5rem, 1.1, -0.03em): a card heading that is itself an answer ("About $9 a year").
- **Title** (800, 1.375rem, 1.25, -0.015em): card headings; at 700 and -0.01em the rank line; at 600 the unit beside the big figure. The wordmark is this size at 800, -0.02em.
- **Lead** (400, 1.125rem, 1.55, max 62ch): the generated sentence under the scale.
- **Body** (400, 1rem, 1.55): all running text, row labels, values (700). Paragraphs wrap with `text-wrap: pretty`, h1/h2 with `balance`.
- **Label** (500–600, 0.875rem): sub-notes under a row label, table column headings, scale end captions, footnotes. Sentence case.

### Named Rules
**The Tabular Numbers Rule.** Every figure that can sit beside another figure (big amounts, table cells, fee values) uses tabular numerals.

**The No-Kicker Rule.** No uppercase eyebrows or letter-spaced labels above headings. A heading says what the card holds; a sub-line in secondary ink gives the scope and date.

## Layout

One centred column, `min(100% - 2 × gutter, 70rem)`, with 24px gutters (16px under 600px). Pages that read rather than browse (a broker, Home, Compare, the calculator, How we measure) narrow to a 44rem reading width under 1024px. On a desktop (1024px and up) the broker page is a board of two independent stacks of cards in a 648:448 ratio with a 24px column gap, each card as tall as its content: the price card, "Where <broker> sits", then the payment and registration one-liners on the left; the yearly card, Fees and Compare with on the right. Below 1024px it is one stack, with the secondary card placed straight after the answer card so its top edge peeks into the first screen, then the ranked table and the rest. Cards are separated by 16px (12px on phones) and padded 30px 32px (20px on phones).

The other pages use the same board or one column of full-width cards:
- **Home:** the answer card, a one-line yearly card, the findings and a few side-by-side comparisons on the left; every broker ranked in a table on the right (two equal columns from 1024px so the four-column table fits, 648:448 from 1200px). Below 1024px one stack with the ranking after the yearly line, opening on the picked broker and three either side, with "See all".
- **Compare:** the answer card and the side-by-side table on the left; on the right cost by order size first, beside the answer whose gap it splits by size (the owner's call, Nov 2026: keep the year second there, unlike on the broker page), then the typical year, what each is paid and registration; other comparisons at full width under the board. Below 1024px the year follows the answer, as on the broker page and Home, then the table, cost by order size and the rest.
- **Calculator:** the answer on the left, "How you trade" on the right (never under 400px, so each number box stays at the end of its row from 1024px); the ranking, every broker's table and "How it adds up" at full width beneath.
- **How we measure:** the reading column on the left, "On this page" in the right column (straight after the first card below 1024px); the evidence card at full width last.
- **Brokers (explorer), Trading firms, All firms:** one column of full-width cards under the page's controls.
- **Not found:** the page header and one card of three soft pills (Home, Brokers, Compare), at the 44rem reading width.

Every page opens with the same page header under the site header: the h1 at Headline size and, when it needs one, one Lead-size intro line in secondary ink (max 62ch, the text block at most 44rem), with an optional slot on the right for the page's own control that wraps beneath on narrow screens. It sits 40px below the header and 24px above the first card (26px and 16px on phones). A page below the top level puts a breadcrumb above it: the way up as an ink link underlined 2px in teal, a chevron, then the current page in 600 secondary ink. A Compare pair (compare/<a>-vs-<b>/) is the one exception and has none: compare/ is the same sheet with a default pair, so a trail would only repeat the h1, and the pair picker and the current Compare nav pill already lead to other pairs and to compare/.

A card needed in two places (the broker page's and Compare's yearly card, Home's ranking) is rendered twice and CSS shows one, so the order on screen is the reading order at every width.

At most one short sticky row per page, and none on a broker page or Home: the filter bar from 1024px (Trading firms, All firms) while it fits one row; Compare's row of the two names over its side-by-side table; the calculator's one-line answer echo above the inputs below 1024px. How we measure keeps "On this page" in view in its own column on a desktop, covering nothing. Each sticky row sets `scroll-padding-top`, so keyboard focus and in-page jumps land clear of it.

The header is 76px tall (64px on phones): wordmark and tagline left, the nav pills and the theme button right; under 1024px the nav folds into a "Menu" pill that opens a raised panel. The footer is plain text on the ground above a hairline rule, links underlined in teal.

Inside cards, rows of label and value are separated by 1px hairlines with a 52px minimum row height. Tables restack into a two-line list under 560px, keeping their table roles. Every interactive target is at least 44px tall, including inline links (padding enlarges the hit area).

## Elevation & Depth

Depth is lift, not layering: cards float on the ground with a soft, low, tinted shadow and no border. Shadows are tinted toward the page's green-grey in light and pure black in dark, with a faint inner top highlight in dark.

### Shadow Vocabulary
- **Lift** (light `0 1px 2px rgb(16 40 34 / .05), 0 14px 30px -18px rgb(16 40 34 / .28)`; dark `0 1px 0 rgb(255 255 255 / .03) inset, 0 16px 32px -22px rgb(0 0 0 / .8)`): every card and the current nav pill.
- **Pop** (light `0 2px 6px rgb(16 40 34 / .08), 0 24px 48px -20px rgb(16 40 34 / .4)`; dark `0 2px 8px rgb(0 0 0 / .35), 0 24px 48px -20px rgb(0 0 0 / .7)`): the phone menu panel and the hover of a whole pressable card.
- **Press** (light `0 8px 18px -10px rgb(12 32 27 / .45)`; dark `0 8px 18px -10px rgb(0 0 0 / .6)`): under teal fills (solid button, checked switch option).

### Named Rules
**The No-Glow Rule.** No gradients, glows, coloured shadows or blurred backdrops. A shadow only says "this sits above the ground" or "this can be pressed".

## Shapes

Soft and round. Cards have 24px corners (20px on phones), the menu panel 20px, highlighted table rows and menu items 14px, and every control (buttons, pills, switch, nav links, round buttons, selects, fields, the toggle) is a full pill (999px); a pill switch that may wrap its options onto a second row keeps a 26px outer corner around its pill options. Tooltip panels and empty states take the 14px row corner. Cards carry no border; controls carry a 2px teal outline when they are secondary. The scale is built from circles (11px radius dot, 10px end dots) and a 4px-wide tick with 2px corners on an 8px round-ended rail. Icons are 2px-stroke line icons with round caps, 14–22px, inline SVG, beside a word or as the face of a round control, never inside a coloured tile.

## Components

### Buttons
Tactile and quiet: a pill that gives slightly when pressed.
- **Shape:** full pill (999px), 48px tall, 0 20px padding, 700 weight, a 2px border slot.
- **Solid:** teal fill, on-teal text, the press shadow. At most one per card; it is the card's one loud action.
- **Ghost:** card-white fill, teal text and 2px teal outline; hover fills Soft Teal with Deep Teal text. Used for "Change", "See all".
- **Soft pill:** Soft Teal fill, Deep Teal text, a chevron at the right; for lists of quiet targets (compare-with choices), never alongside another loud action of the same weight.
- **Round button:** 44px circle, teal outline and icon (theme switch).
- **Go link:** teal 700 text with a trailing arrow or chevron, 44px tall; hover Deep Teal and underlined ("Details", "See all 25").
- **Press:** every pressable scales to 0.95 on `:active` over 0.5s on the system curve; colours change in 0.2s.
- **Focus:** a 3px teal outline 3px clear of the element; white on teal panels.

### Switch
The page's one control: a native radio group drawn as a two-option pill with a 2px teal outline and 2px inner padding. Options are 44px tall, 600 weight; hover fills Soft Teal; the checked option fills teal with on-teal text and the press shadow. The whole switch takes the focus ring. It works without a script (CSS decides which figures show). On phones it spans the full width with equal halves. In forced colours the checked option takes the system highlight.

### Cards / Containers
- **Corner Style:** 24px (20px on phones).
- **Background:** Card White on the Sage Ground.
- **Shadow Strategy:** Lift at rest; a card that is wholly pressable (a one-line card with a link) takes Pop on hover and scales to 0.985 on press.
- **Border:** none.
- **Internal Padding:** 30px 32px (20px on phones); one-line cards 18px 24px 18px 28px.
- **Heading:** Title style, then a secondary-ink sub-line for scope and date (6px below), 18px above the content (14px on phones). A card's (i) sits beside its title, never inside it; a card's own control (a switch, a select, a "See all") sits in a right-hand slot that wraps under the titles and takes the full width on phones.
- **Foot:** an optional ruled foot (1px hairline, 22px above, 18px inside) in label size and secondary ink for sources, notes and the "How we measure" link.

### Rows and Tables
- **Value rows:** label left (with an optional 0.875rem secondary note), value right in 700 tabular ink, hairline above, 52px minimum. An unknown value reads "Not confirmed", "Not offered" or "Varies" in 600 secondary ink, never $0.
- **Tables:** real tables for every ranking or comparison, right-aligned tabular numbers, 0.875rem secondary-ink column headings, hairline rows. The page's own broker sits on a Here-tinted row with 14px ends and 700 ink. Each other row is wholly clickable through its name link, underlined in teal on hover. Long tables show the neighbourhood first with a "See all" ghost button.

### Navigation
Header nav pills: 44px tall, 600 ink, hover Card White fill; the current page is Card White with teal text and Lift. Breadcrumb links are ink underlined 2px in teal. Under 1024px a "Menu" pill (teal outline, filled teal when open) opens a raised panel with Pop, 20px corners and 48px rows; the current row is Soft Teal with Deep Teal text. A skip link (teal pill) is the first focus stop.

### Links
In-text links are ink, 600, underlined 2px in teal with a 5–6px offset; hover thickens the underline to 3px. Source links in a card's sub-line are teal with an external-link icon.

### The Price Scale (signature)
A neutral rail (Track, 8px) with Mark Grey end dots at the cheapest and most expensive, a Mark Grey tick at the typical (median) broker labelled "Typical $0.96" below, and this broker's 22px ink dot with a 3px card-coloured ring, its name in bold above. End captions ("Cheapest" / "Most expensive" in label size, the broker and value in 700) sit under each end. Every mark sits at its true position; labels near an end turn inward. A small variant (18px dot, 6px rail) serves secondary cards. It is drawn in CSS, carries a screen-reader sentence listing the values in order, and when the stock switch flips, its marks glide 0.8s on the system curve to their new places. The scale is never coloured by verdict.

### Info Reveal
An (i) icon button (44px circle, teal icon; hover Soft Teal; expanded filled teal) beside a figure's unit reveals one plain line of secondary text in place, with a "How we measure" link (to that page's fair-price section). Nothing floats over the figures; without a script the line is simply shown. This is the broker page's price card.

Everywhere else the shared (i) sits beside a heading or a term, never inside a heading, and is named "About <topic>". Hover, focus or a press shows its one plain line in a raised panel (Raised Tint, 14px corners, Pop, label size) under the icon, or over it when there is no room, 12px clear of every edge of the window, so no card or scroll box clips it. The pointer can move onto the panel; Escape, a press elsewhere or focus leaving closes it. Plain text only. Without a script the line shows under the icon on hover or focus.

### Controls and pickers
- **Select:** a native select as a teal-outlined pill (48px, 0 44px 0 20px, 600 ink, 1rem text at every width so phones don't zoom) with a teal down chevron at the right, hover Soft Teal; its label shown beside it in label size, 600 secondary ink (or kept for screen readers when the select fills a row). It only reports the pick; nothing navigates on change. Home's "Your broker" changes the answer card in place (the dot slides, the tinted row moves) and a status line announces the new price and rank. Compare's two selects are followed by a ghost "Compare" link that opens the pair; picking in one box the broker the other shows swaps them, announced. Trading firms' broker select is followed by a solid "Show".
- **Pill switch:** the stock switch's look for any small set of options (buttons with radio roles): one Tab stop, the arrows, Home and End move and pick; the whole switch takes the ring; its outer edge is 26px so it can wrap onto a second row inside itself; on phones it spans the width with equal options. A small variant sets the options in the label size (0 16px), still 44px tall. In forced colours the checked option takes the system highlight.
- **Toggle:** an on/off setting ("Show Apex Clearing") as a 46x28px pill track with an 18px knob, the whole label the 44px target. Off: a 2px Mark Grey edge and knob on Card White, Soft Teal on hover. On: teal track and edge, an on-teal knob slid 18px over 0.3s on the system curve.
- **Text field:** a pill with a 2px Mark Grey edge (3:1), 1rem text, the ring on the whole field; a search field's clear button is a teal cross.
- **Number box (calculator):** the text field 10.5rem wide at the end of a value row (under its label at 359px and below). A mistake keeps what was typed and gets aria-invalid, an Error Ink edge, an alert icon and one line naming the problem and the value still in use ("Enter $1,000,000 or less. Counting $2,000 for now.").
- **Question (calculator):** No or Yes on the pill switch, No first and the default; its amount box appears only after Yes, so a cost counts only once the visitor says they have it.
- **Filter chips (explorer):** checkboxes drawn as 44px pills. Shown: Soft Teal fill, Deep Teal text, a 2px teal edge and a check icon. Hidden: Card White, ink text, a 2px Mark Grey edge, no icon. The ring sits on the pill.
- **Bottom sheet (explorer, below 1024px):** a native modal dialog from the bottom edge: Card White, 20px top corners, Pop, the page dimmed behind it (rgb(16 40 34 / .42); dark rgb(0 0 0 / .6)) with at least 56px of it still visible. A ruled head (a Title-size h2 and a round close button), a body that scrolls inside, a ruled foot with the solid result button ("Show 25 brokers"). Escape, the close button or a tap on the dimmed page closes it, and focus returns to its opener. On a desktop the same controls sit on the ground in rows of labelled fields (label above, 0.875rem 600 secondary ink).
- **Copy link:** a ghost button with the link icon; what happened is said in a status line beside it.
- **Filter bar:** the page's controls (stock and order-type switches, size, month and quarter selects, the clearing toggle, each (i) beside its control) in one wrapping row on the ground, 12px 20px gaps, 22px above the first card. From 1024px it sticks to the top of the window on the page ground, gaining a Rule hairline under it once stuck, but only while it fits one row; a bar that wraps scrolls away like any content, and the page's scroll padding follows its measured height. On phones every item takes the full width.

### Small shared pieces
- **Status chip:** a word with a line icon (check, cross or dash in secondary ink) on a Raised Tint pill, label size 600 ink, 3px 12px 3px 8px. The word carries the meaning; the chip is never coloured by it.
- **Empty state:** a Raised Tint block with 14px corners, at least 12rem tall, one centred line of secondary ink announced as a status.
- **Waiting line:** a page opened from a link that carries its view in the query shows one secondary-ink line while the pre-rendered default figures stay hidden, so another broker's numbers never flash; if the data cannot load, one quiet label-size line sits above the pre-rendered page.

### Not-found page
Any address the site has no page for gets the page header ("Page not found" and one intro line) and a single card, labelled as navigation, of three soft pills in a row from 640px (one column below): Home, Brokers, Compare, each with its chevron. No illustration, no apology copy, no search.

### Figures and answers
- **The yearly answer (calculator, Compare):** the dollar amount at Display size set inline in the headline's own words ("About $9 a year"), the rest at Title size; each cost part a value row with the rate behind it; unknowns in words, and "At least $X" with the reason when a part is missing.
- **Answer echo (calculator, below 1024px):** the answer in one Here-tinted line pinned at the top of the inputs card while it is on screen (hidden from screen readers: the page's status line speaks for it).
- **Verdict (How we measure):** a generated verdict in Headline small ("Not reliably."), its tests beside it as worded ink status chips ("Holds up", "Could be chance"), never coloured.
- **Generated sentence:** Lead size; on a page without a reading width it is capped at 36.5rem, not 62ch, so it stays under about 80 characters a line.

### Scales and rails (the price scale's anatomy, reused)
- **Two dots (Compare):** both brokers are equal ink dots on the one neutral scale, each name over its own dot; names that would collide at the scale's measured width stack in rows (judged for a 250px phone scale until the page has measured it).
- **Ranked rails (explorer):** the scale given to every broker, one row each: the name right-aligned (0.875rem 600), the value at the right (700, tabular), a 6px Track rail from the lowest to the highest value shown, a 14px ink dot with a 2px card ring, and the Mark Grey typical tick (3×14px) lined up through every row under "Typical $0.96". A 1px Mark hairline marks zero when values cross it. Rows re-sort in place (0.65s) and dots glide (0.8s) on the one curve. Drawn in CSS and pre-rendered; the chart library loads only when a second measure turns it into a scatter.
- **Per-row rails (Trading firms):** each trading firm on its own small rail, other firms as the middle tick and the firm as the ink dot, the gap also written in words ("23.1 points less"); flipping the stock switch glides the dots and re-ranks the rows in place.
- **Multi-rail (All firms):** the scale's track, typical tick and "Typical" label repeated for four groups on one shared axis. Dots are 10px, ink for the site's brokers and grey for every other firm, stacking upward 11px per lane where firms crowd; the tick hangs below the track so dots never hide it. The axis holds still across the stock group and month, so a gliding dot (0.8s) always means that firm's figure changed. A mouse hover names a dot in a raised panel the pointer can rest on and Escape closes; touch and keyboard read the same figures in the table.
- **Worked example (How we measure):** the scale as a single trade: the best prices to sell and to buy at the ends, the fair price as the tick, the buy as the ink dot, the stretch paid drawn darker.
- **Forest table (How we measure):** each test a row of a real table, its estimate and 95% interval drawn in CSS on the rail with a zero tick, beside strength, interval, p-value, broker count and a verdict in words. Points are never coloured by verdict.
- Every rail is one image with a written label beside a real table, and nothing glides under reduced motion.

### Tables beyond the ranked table
- **Comparison table (Compare):** two value columns under a sticky row of the two names. A neutral ink check marks the better value (before it, after it on phones) with a screen-reader "better:"; rows without one are context, not a score. Unknowns in words; the (i)s in their own column so row headings stay clean.
- **Heat table (Trading firms):** the routing matrix as a real table, each cell shaded in one of four sequential steps with 2px card-coloured borders as gaps and its number written in it; the first column is pinned while the table scrolls sideways, broker names link to their section below, and the broker shown there is on the Here tint.
- **Data table (the shared sortable table):** an optional bar above it holds a search field (16-24rem, full width on phones) and a ghost "Download CSV" button with the download icon; a status line under the bar says "8 of 25 shown" while a search is on. The table sits in its own scroll box that scrolls sideways inside the card, never the page; headings stay on one line and stick to the top of a box given a height; the name column is pinned and gains a Rule hairline on its edge once the table has scrolled. Column headings are 44px buttons with aria-sort, the sort arrow in Mark Grey shown on hover or focus and teal on the sorted column (whose heading turns 700 ink), the ring inset and clear of the label; rows without a value stay last in their given order whichever way a column sorts. Each row opens through its name, a real link (or a button for an in-page action) in 600 ink that underlines 2px in teal when the row is hovered; a press anywhere on the row does the same, and keyboard focus rings the whole row (inset, 14px corners). The page's own row is on the Here tint; columns can be Here-tinted too. A search that finds nothing says so in one centred secondary-ink line. Charts rank only complete figures; a broker missing a part is named under the chart and shown "at least" in the table.
- **Chart and table:** every chart is followed by a teal "Show as a table" disclosure (600, 44px, a down chevron that turns over 0.35s on the system curve; "Hide the table" when open) holding the same figures as a real table, first column as row headings and pinned while it scrolls sideways. The chart's key is an HTML legend beside it: label-size secondary ink, 10px swatches with 3px corners, an 18px dashed line for a reference line.
- **Chart styling:** Figtree at the label size (0.875rem, at the reader's root size), secondary-ink text, axis labels in Muted, no axis lines or ticks on value axes, Grid hairlines, the Baseline on category axes, thin marks, a 700ms ease-out entry that is off under reduced motion. The chart tooltip is the raised panel (Raised Tint, a 1px hairline edge, 14px corners, Pop, 10px 14px) and can be hovered; Escape hides it.
- **Contents (How we measure):** "On this page" as a card of rows that jump to each section, each ending in the go arrow (a down chevron means "opens in place"), the section being read on the Here tint. A teal disclosure (a summary with a chevron, like "Show as a table") holds anything longer than a line.

## Do's and Don'ts

### Do:
- **Do** lead each page with one answer card: the figure at Display size, its unit in words beside it, then the rank and the scale.
- **Do** keep teal for pressable things and focus rings only; use ink for every number and verdict.
- **Do** state good or bad in words next to the figure ("above the fair price", "10th cheapest of 25").
- **Do** pair every scale or ranked summary with a real table of all the brokers, the page's own row tinted Here.
- **Do** keep text at 4.5:1 or more and marks at 3:1 or more in both themes; put Deep Teal, not Action Teal, on Soft Teal.
- **Do** give every control a 44px minimum hit area and the 3px teal focus ring 3px clear.
- **Do** use the one curve `cubic-bezier(.22, 1, .36, 1)` for every movement and turn all motion off under reduced motion.
- **Do** name unknowns plainly ("Not confirmed", "Not offered", "Varies") in secondary ink.
- **Do** let a select or switch only report a pick; anything that opens another page is a real link or button beside it.
- **Do** open every page with the shared page header (Headline h1, at most one Lead-size intro line) and put a card's own control in its right-hand slot.
- **Do** give every chart its table and its key in HTML, and draw rankings and scales in CSS rather than loading a chart library for them.

### Don't:
- **Don't** use gradients, glow, coloured shadows or the old gradient text and hero glow.
- **Don't** put icons in coloured tiles; icons are line icons beside a word or the face of a round control.
- **Don't** add uppercase, letter-spaced kickers or eyebrows above headings.
- **Don't** colour figures red or green to mean good or bad, and don't colour the scale.
- **Don't** add ratings, stars, badges, "Open account" buttons or cheerleading copy.
- **Don't** build a dashboard of equal KPI tiles; one idea per card.
- **Don't** introduce a second typeface or px font sizes outside the seven-step scale.
- **Don't** use series colours outside charts and the routing heat table.
- **Don't** make a table row a Tab stop; the row opens through the real link in its name.
- **Don't** stick more than one short row to the top of a page.
