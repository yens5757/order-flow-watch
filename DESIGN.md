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
---

# Design System: Fills and Fees

## Overview

**Creative North Star: "The Calm Answer"**

Every page is one soft card stating one answer in plain words, laid on a pale ground tinted from the action teal. The system is a warm consumer app, not a trading dashboard: white cards with generous corners and a shadow you notice only as lift, Figtree for everything, the number first and set big, and a single teal that appears only on things you can press. Nothing on the page sells, celebrates or alarms. Meaning is carried by words ("above the fair price", "10th cheapest of 25", "Not confirmed"), never by a red or green figure.

Density is low and deliberate: one idea per card, cards stacked in columns, explanations one click away behind an (i) or a "How we measure" link. The product's signature is the neutral price scale, a grey rail that places one broker's ink dot between the cheapest and the most expensive with a tick at the typical broker, drawn in CSS and gliding when the stock switch flips. Every comparison that the scale summarises is also given as a real table.

Light is the default; dark follows the system until the visitor picks a theme, and both themes are tuned separately rather than auto-inverted. The world rejects gradients, glow, icon tiles, uppercase kickers, colour-coded verdicts, ratings and "Open account" buttons.

**Key Characteristics:**
- Soft white cards (24px corners, 20px on phones) on a teal-tinted neutral ground (light page, dark page with darker cards).
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

### Series (charts only)
- **Validated series palette** (series-1 … series-8, stepped separately per theme): chart lines and bars, read into ECharts from the CSS custom properties. series-1 is "paid", series-2 is "cost"; better/worse reuse series-1/series-8. Never used for text, controls or cards.

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

One centred column, `min(100% - 2 × gutter, 70rem)`, with 24px gutters (16px under 600px). Pages that read rather than browse narrow to a 44rem reading width under 1024px. On a desktop (1024px and up) the broker page is a board of two independent stacks of cards in a 648:448 ratio with a 24px column gap, each card as tall as its content; below 1024px it is one stack, with the secondary card placed straight after the answer card so its top edge peeks into the first screen. Cards are separated by 16px (12px on phones) and padded 30px 32px (20px on phones). Nothing is sticky.

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

Soft and round. Cards have 24px corners (20px on phones), the menu panel 20px, highlighted table rows and menu items 14px, and every control (buttons, pills, switch, nav links, round buttons) is a full pill (999px). Cards carry no border; controls carry a 2px teal outline when they are secondary. The scale is built from circles (11px radius dot, 10px end dots) and a 4px-wide tick with 2px corners on an 8px round-ended rail. Icons are 2px-stroke line icons with round caps, 14–22px, inline SVG, beside a word or as the face of a round control, never inside a coloured tile.

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
- **Heading:** Title style, then a secondary-ink sub-line for scope and date.

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
An (i) icon button (44px circle, teal icon; hover Soft Teal; expanded filled teal) beside a figure's unit reveals one plain line of secondary text in place, with a "How we measure" link. Nothing floats over the figures; without a script the line is simply shown.

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

### Don't:
- **Don't** use gradients, glow, coloured shadows or the old gradient text and hero glow.
- **Don't** put icons in coloured tiles; icons are line icons beside a word or the face of a round control.
- **Don't** add uppercase, letter-spaced kickers or eyebrows above headings.
- **Don't** colour figures red or green to mean good or bad, and don't colour the scale.
- **Don't** add ratings, stars, badges, "Open account" buttons or cheerleading copy.
- **Don't** build a dashboard of equal KPI tiles; one idea per card.
- **Don't** introduce a second typeface or px font sizes outside the seven-step scale.
- **Don't** use series colours outside charts.
