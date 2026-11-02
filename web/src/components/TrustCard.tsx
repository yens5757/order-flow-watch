// "Is this broker registered?": the FINRA BrokerCheck record (by CRD), SIPC membership and the reports it files. Facts, not a verdict.
import type { ReactNode } from "react";
import { files606, type Data, type Fee, type Firm } from "../lib/data";
import { Card, Icon, Status } from "./ui";

const BROKERCHECK = "https://brokercheck.finra.org/firm/summary/";
const SIPC_LIST = "https://www.sipc.org/list-of-members/";

const ext = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">{text}<Icon name="ext" size={13} /></a>
);

export function TrustCard({ d, firm }: { d: Data; firm: Firm }) {
  const fee: Fee | undefined = d.fees[firm.id];
  // fees.csv holds the broker-dealer the account is with, which is the BrokerCheck record to link; the 606 is keyed by the
  // firms.csv CRD, which can be a routing affiliate (moomoo's is Futu Clearing's), so the filing is tested with that one
  const crd = fee?.crd ?? firm.crd ?? null;
  const sipc = fee?.sipc ?? null;
  const has606 = files606(d, firm.crd);

  const rows: { kind: "good" | "bad" | "neutral"; chip: string; text: ReactNode; gloss: string }[] = [
    crd
      ? { kind: "good", chip: "Registered", text: <>Registered with FINRA, CRD {crd}. {ext(BROKERCHECK + crd, "BrokerCheck record")}</>,
        gloss: "Licences, history and any disciplinary events." }
      : { kind: "neutral", chip: "Not found", text: <>FINRA record not found yet. {ext("https://brokercheck.finra.org/", "Search BrokerCheck")}</>,
        gloss: "Search by the broker's name." },
    { kind: sipc === true ? "good" : sipc === false ? "bad" : "neutral", chip: sipc === true ? "Member" : sipc === false ? "Not a member" : "Not checked",
      text: <>SIPC member: {sipc === true ? "yes" : sipc === false ? "no" : "unknown"}. {ext(SIPC_LIST, "SIPC member list")}</>,
      gloss: "Up to $500,000 of securities and cash back if the broker fails; not market losses." },
    { kind: "good", chip: "Published", text: <>Publishes the monthly price report (SEC Rule 605)</>,
      gloss: "Where this page's prices come from." },
    has606
      ? { kind: "good", chip: "Published", text: <>Reports what it is paid for orders (SEC Rule 606)</>,
        gloss: "Also where its orders go." }
      : { kind: "neutral", chip: "Via another firm", text: <>Files no payment report of its own</>,
        gloss: "Another firm routes its orders." },
  ];

  return (
    <Card title={`Is ${firm.short} registered?`} sub="Regulator records"
      foot="Not an endorsement: a registered broker can still get you poor prices.">
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.chip + r.gloss} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-ink">{r.text}</div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{r.gloss}</div>
            </div>
            <Status kind={r.kind}>{r.chip}</Status>
          </li>
        ))}
      </ul>
    </Card>
  );
}
