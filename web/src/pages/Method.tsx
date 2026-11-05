// how-we-measure/: the documentation behind every other page, linked from the footer and the price card's (i). The
// first card answers "how do you get these numbers?" (three public sources, each with the period it covers); then what
// "above the fair price" means, the same-stocks comparison, what brokers are paid, fees, the limits, common questions,
// and last, at full width, whether brokers paid more give worse prices, with the statistics under a button.
// Every number, month and name is read from site.json (components/method/), so the words stay right after a rebuild.
// One column on phones and tablets, the contents right after the first card. On a desktop the broker page's 648:448
// board: the reading column on the left and the contents in the right-hand column, staying in view beside it; they come
// second in the page either way, so Tab and screen readers meet them where the eye does (method.css).
import "../components/method/method.css";
import { Contents } from "../components/method/Contents";
import { EvidenceCard } from "../components/method/EvidenceCard";
import { Questions } from "../components/method/Questions";
import { FairPrice, Fees, Limits, Payments, SameStocks, Sources } from "../components/method/Sections";
import { PageHeader } from "../components/ui";
import type { Data } from "../lib/data";

export default function Method({ d }: { d: Data }) {
  return (
    <>
      <PageHeader title="How we measure" intro="Where every number comes from, what it means, and what it can't show." />
      <div className="mx-board">
        <Sources d={d} />
        {/* beside all seven cards of the reading column on a desktop */}
        <Contents rows={7} />
        <FairPrice d={d} />
        <SameStocks d={d} />
        <Payments d={d} />
        <Fees d={d} />
        <Limits d={d} />
        <Questions d={d} />
      </div>
      <EvidenceCard d={d} />
    </>
  );
}
