# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** US retail investors deciding whether to stay with a broker or switch, whether they already hold an account (Robinhood, Fidelity, Schwab, Webull and others) or are picking one to open. They want to know what their trades really cost, what the broker is paid for their orders, and how that compares with other brokers. They come on a phone or a desktop and want one answer.

**Secondary (confirmed):**
- Technical and finance readers (Hacker News, r/algotrading, market-structure professionals) who check the method and the statistics before trusting a number.
- Press and academics who may cite the numbers.

## Product Purpose

Turns the reports US brokers must publish by law into answers an investor can act on. SEC Rule 605 (monthly execution quality, broker-level since August 2026) and Rule 606 (quarterly order routing and payment for order flow), plus each broker's own published fees, become: what a trade costs at each broker (dollars above the fair price per $10,000 traded), what each broker is paid for its customers' orders, any two brokers side by side, and a yearly cost estimated from the visitor's own trading habits.

Success: a visitor answers "is this broker getting me a good price, and what would it cost me a year?" on the page they land on, and trusts the answer.

## Positioning

Built from the execution and routing reports brokers must file with the SEC, comparing brokers on the same stocks and order sizes rather than on their own averages, with every fee dated and graded by source. Broker review sites mostly compare fees and features; this site measures the price customers actually get on their trades. Whether any other consumer site does the same has not been checked, so the site never claims to be "the only" one.

## Operating Context

- Data cadence: the data changes monthly (Rule 605, about a month after month end) and quarterly (Rule 606, from FINRA bulk files; the first file for a quarter can be missing late filers). A weekly automated rebuild picks up new reports; it does not mean the numbers change weekly. Citadel and Interactive Brokers reports are downloaded by hand each month into a private repository; fees are re-checked by hand every quarter.
- Hosting and measurement: static pre-rendered pages on GitHub Pages at fillsandfees.com (one page per broker and per broker pair), Cloudflare DNS and Web Analytics, Google Search Console. Feedback: admin@fillsandfees.com.
- Expected, not yet measured: visitors arrive mostly on deep links (a broker page, a pair comparison) from search ("robinhood vs fidelity", "robinhood fees"), Reddit or Hacker News, not on the home page. This is the SEO plan; confirm it in Search Console and Web Analytics before treating it as fact.

## Capabilities and Constraints

- Pages: Home; Compare (any two of 25 brokers); Calculator (yearly cost from trade prices, commissions, options fees, idle cash and margin, with a shareable link); Brokers explorer (any measure against any other, linkable state); one profile per broker; Trading firms (who fills whose orders); How we measure (linked from the footer, statistics collapsed).
- Coverage: 25 retail brokers (19 file their own payment reports), 1 clearing firm (Apex) and 8 trading firms; market orders and marketable limit orders under $200,000. Rule 605 does not cover options, so options execution is not measured and only options fees are shown.
- Terminology: "prices", not "fills"; "trading firms", not "market makers", in headings; "the same stocks and order sizes", never "identical trades"; a broker without a payment report "files no payment report of its own (another firm routes its orders)". Percentages on different scales are compared in dollars per $10,000.
- Numbers change with every monthly and quarterly report, so copy that states a number or a verdict is generated from the data, never hard-coded.
- Static hosting only: no server, no accounts, no stored user data.
- Raw reports are never published (redistribution terms); sites that refuse automated access are never scraped.
- A broker missing the latest payment quarter uses its previous quarter, and the site says so.
- Not investment advice. Code, design and text are all rights reserved (public, view-only repository).
- Funding: no ads, no affiliate links, no money from brokers (a permanent brand commitment, below).

## Brand Commitments

- Name: Fills and Fees, at fillsandfees.com. Brand line (site header): "Broker comparison with nothing to sell". Proof line (Home's opening): "The numbers brokers must report by law, read the same way for every broker". The earlier tagline "what your broker's trades really cost" stays in search and share descriptions.
- Nothing to sell (permanent, the owner's decision, Nov 2026): no ads, no affiliate links, no money from brokers, so no broker can pay for a place or a better position. Said on Home, in the footer and in How we measure's questions. The trust comes from what the site refuses to do, never from saying other sites lie, which would break the next commitment and cannot be proven.
- Neutral, not activist (permanent): the site reports what the data shows, including results that cut against the case against payment for order flow, and campaigns against no broker or practice.
- Shown to be current: Home and the footer say the site checks for new reports every week and give the last check date. Never that the numbers change weekly: prices arrive monthly and payments quarterly.
- Voice: plain words a first-time investor understands; caveats stated rather than buried; nothing claimed beyond the data ("doesn't reliably predict", never "doesn't matter").

## Evidence on Hand

- Data: SEC Rule 605 reports from August 2026 and Rule 606 reports from 2024 Q2 for the tracked firms; `fees.csv`, fees for 25 brokers taken from the brokers' own pages where they could be read and otherwise from review sites or research, each row with source links, a check date and a confidence grade (high, medium or low). Some cells are still unconfirmed and are shown as such.
- Findings (September 2026 prices, July–September 2026 payments; these move every month):
  - Brokers differ widely on the same stocks and order sizes: on S&P 500 market orders, Fidelity's customers paid about 15 points of the spread less than other brokers' customers, Cash App's about 46 more.
  - Customers' typical order size predicts price strongly (rank correlation about −0.65, p ≤ 0.001), though part of that may be how orders are handled.
  - Payment for order flow does not reliably predict price. It is not significant for S&P 500 stocks. For other stocks it is significant across broker averages but not once share price is held equal. On the same stocks and order sizes it becomes significant only when Cash App is left out.
  - Broadly consistent with Schwarz, Barber, Huang, Jorion and Odean, *Journal of Finance* 2025.
- Absent, never to be fabricated: users, testimonials, press coverage, awards and endorsements. Nothing may quote or imply endorsement by a researcher, broker or trading firm.

## Product Principles

1. **One answer per page, numbers first.** Visitors scan; an explanation sits one click away (an info icon, How we measure), not in the way. Cutting words is a requirement for reaching real users, not a polish item.
2. **Neutral by construction.** The data decides the verdict, and the caveat that cuts against the headline is shown next to it.
3. **Every number traceable.** Its report, month, check date and method are one click away.
4. **Disclose rather than smooth over.** Partial, stale or fallback inputs are named on the page, never used silently.
5. **Every page stands alone.** A visitor landing on any broker or pair page from search gets a complete answer without visiting the home page.
