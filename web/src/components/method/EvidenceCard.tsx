// "Do brokers paid more give worse prices?": the answer from the three payment tests (a lead, one clause per stock group
// and a table of worded verdicts), what goes with price more clearly, and the statistics behind it under "Show the
// statistics". There every test is a forest plot set as a real table: its estimate and 95% interval drawn on the site's
// neutral rail with a zero tick, beside its numbers and a verdict in words.
// The S&P 500 / other stocks switch is a native radio group, as on the broker page: the checked radio decides through CSS
// which group's figures show and where the marks sit (method.css), so it works before the script loads and without one,
// and every dot and interval glides to its new place. React only announces the change. Without a script the statistics
// are simply open.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { metric, type Data, type Evidence, type Sp } from "../../lib/data";
import { DOT, monthLong, quarterLong } from "../../lib/format";
import { Card, Icon, Status } from "../ui";
import { titleOf } from "./Contents";
import {
  claimText, GROUPS, PAY_TESTS, payAnswer, pText, railAt, rhoText, rowsOf, strongest, testOf, VERDICT, verdictOf, whereHolds, type Row,
} from "./evidence";

/** Robinhood's own payment report states its rate as a share of the spread; the check reads that quarter's report the
 *  site's way, over each month of the quarter that has price reports. Quoted from Robinhood's Jul–Sep 2026 report. */
const CHECK = { id: "HOOD", quarter: "2026Q3", stated: 12.35 };

/** "Paid more → customers pay more": the arrow drawn as the site's line icon, read as a pause. */
function Claim({ text }: { text: string }) {
  const at = text.indexOf(" → ");
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}{" "}<Icon name="arrow" size={16} className="mx-arrow" /><span className="sr-only">,</span>{" "}{text.slice(at + 3)}</>;
}

/** One row: the claim, its drawn interval, its numbers and verdict, for both stock groups at once (CSS shows one). A group
 *  without the test keeps the other group's marks still and shows dashes. */
function ForestRow({ r }: { r: Row }) {
  const at = (e: Evidence | undefined, other: Evidence | undefined) => {
    const x = (e ?? other)!;
    return { v: `${railAt(x.rho).toFixed(2)}%`, lo: `${railAt(x.lo).toFixed(2)}%`, hi: `${railAt(x.hi).toFixed(2)}%` };
  };
  const a = at(r.sp, r.ot), b = at(r.ot, r.sp);
  const style = { "--v-sp": a.v, "--lo-sp": a.lo, "--hi-sp": a.hi, "--v-ot": b.v, "--lo-ot": b.lo, "--hi-ot": b.hi } as CSSProperties;
  const each = (show: (e: Evidence) => ReactNode, none: ReactNode = "–") =>
    GROUPS.map((g) => {
      const e = g.key === "sp" ? r.sp : r.ot;
      return <span key={g.key} data-grp={g.key}>{e ? show(e) : none}</span>;
    });
  const cls = ["mx-row", r.sp ? "" : "no-sp", r.ot ? "" : "no-ot"].filter(Boolean).join(" ");
  return (
    <tr role="row" className={cls} style={style}>
      <th role="rowheader" scope="row" className="c-cl"><Claim text={claimText(r.claim)} /></th>
      <td role="cell" className="c-st">
        <span className="mx-st">
          <span className="mx-plot" aria-hidden="true"><span className="mx-zero" /><span className="mx-ci" /><span className="mx-dot" /></span>
          <span className="mx-rho">{each((e) => rhoText(e.rho))}</span>
        </span>
      </td>
      <td role="cell" className="c-ci"><span className="mx-k" aria-hidden="true">95% interval </span>{each((e) => `${rhoText(e.lo)} to ${rhoText(e.hi)}`)}</td>
      <td role="cell" className="c-p"><span className="mx-k" aria-hidden="true">p-value </span>{each((e) => pText(e.p))}</td>
      <td role="cell" className="c-n">{each((e) => <>{e.n}<span className="mx-k" aria-hidden="true"> brokers</span></>)}</td>
      <td role="cell" className="c-vd">{each((e) => <Status kind={verdictOf(e)}>{VERDICT[verdictOf(e)]}</Status>, "Not tested")}</td>
    </tr>
  );
}

/** The rail's scale, −1 · 0 · +1, over the drawn column (and over every row when the table restacks on a narrow card). */
const Axis = () => <span className="mx-axis" aria-hidden="true"><i>−1</i><i>0</i><i>+1</i></span>;

function ForestTable({ d }: { d: Data }) {
  const rows = useMemo(() => rowsOf(d), [d]);
  return (
    <div className="mx-ft-box">
      <div className="mx-axis-key" aria-hidden="true"><Axis /><span className="mx-axis-sp" /></div>
      <table className="mx-ft" role="table">
        <caption className="sr-only">
          Every test for {GROUPS.map((g) => <span key={g.key} data-grp={g.key}>{g.name}</span>)}: its strength from −1 to +1,
          95% interval, p-value, number of brokers and verdict
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col" className="c-cl">Test</th>
            <th role="columnheader" scope="col" className="c-st">
              Strength<span className="sr-only">, from −1 to +1</span>
              <span className="mx-axis-row" aria-hidden="true"><Axis /><span className="mx-axis-sp" /></span>
            </th>
            <th role="columnheader" scope="col" className="c-ci">95% interval</th>
            <th role="columnheader" scope="col" className="c-p">p-value</th>
            <th role="columnheader" scope="col" className="c-n">Brokers</th>
            <th role="columnheader" scope="col" className="c-vd">Verdict</th>
          </tr>
        </thead>
        <tbody role="rowgroup">{rows.map((r) => <ForestRow key={r.claim} r={r} />)}</tbody>
      </table>
    </div>
  );
}

/** Robinhood's stated rate against the site's reading of the same report: [low, high] over its months and stock groups. */
function paymentCheck(d: Data): [number, number] | null {
  const firm = d.byId[CHECK.id];
  if (!firm || !d.meta.quarters.includes(CHECK.quarter)) return null;
  const y = CHECK.quarter.slice(0, 4), q = +CHECK.quarter.slice(-1);
  const months = [1, 2, 3].map((k) => `${y}${String((q - 1) * 3 + k).padStart(2, "0")}`).filter((m) => d.meta.months.includes(m));
  const vals = months.flatMap((month) => (["Y", "N"] as Sp[]).map((sp) => metric(d, firm, { sp, ot: "M", b: 199999, month, quarter: CHECK.quarter, clearing: false }).payPct))
    .filter((v): v is number => v != null);
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : null;
}

export function EvidenceCard({ d }: { d: Data }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<"sp" | "ot">("sp");
  const [said, setSaid] = useState("");
  const ans = useMemo(() => payAnswer(d), [d]);
  const check = useMemo(() => paymentCheck(d), [d]);
  const both = testOf(d, "raw", "Y")?.n ?? testOf(d, "raw", "N")?.n ?? null;
  const clientele = whereHolds(d, "clientele");
  const speed = whereHolds(d, "speed");
  const clearer = strongest(d, ["clientele"]) > strongest(d, ["raw", "equal", "same"]);
  const ns = d.evidence.map((e) => e.n);
  const fewest = Math.min(...ns), most = Math.max(...ns);

  // the browser may restore "Other stocks" on Back: mirror the checked radio for browsers without :has() (method.css)
  useEffect(() => {
    if ((document.getElementById("ev-ot") as HTMLInputElement | null)?.checked) setShown("ot");
  }, []);
  const pick = (sp: Sp) => {
    const g = GROUPS.find((x) => x.sp === sp)!;
    const tests = d.evidence.filter((e) => e.sp === sp);
    const up = tests.filter((e) => verdictOf(e) === "good").length;
    setShown(g.key);
    setSaid(`${g.label}: ${up} of ${tests.length} tests hold up.`);
  };

  return (
    <Card id="evidence" title={titleOf("evidence")} className={`mx-ev${open ? " open" : ""}`}
      sub={<>{both != null && <>{both} brokers publish both reports{DOT}</>}prices {monthLong(d.meta.month)}{DOT}payments {quarterLong(d.meta.quarter)}</>}>
      {/* the answer, then the table that backs it, then what goes with prices instead; on a desktop the table sits beside
          the other two (method.css) */}
      <div className="mx-ans">
        <p className="mx-verdict">{ans.lead}</p>
        <div className="mx-sum-box">
          <table className="mx-sum" role="table">
            <caption className="sr-only">Brokers paid more, customers pay more of the spread: the three tests by stock group</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">Brokers paid more, customers pay more</th>
                {GROUPS.map((g) => <th role="columnheader" scope="col" key={g.key}>{g.label}</th>)}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {PAY_TESTS.map((t) => (
                <tr role="row" key={t.kind}>
                  <th role="rowheader" scope="row">{t.words.charAt(0).toUpperCase() + t.words.slice(1)}</th>
                  {GROUPS.map((g) => {
                    const e = testOf(d, t.kind, g.sp);
                    return (
                      <td role="cell" key={g.key}>
                        <span className="mx-k" aria-hidden="true">{g.label}</span>
                        {e ? <Status kind={verdictOf(e)}>{VERDICT[verdictOf(e)]}</Status> : <span className="mx-none">Not tested</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mx-prose mx-why">
          {clientele && (
            <p>
              A broker's typical order size {clearer ? "goes with its prices more clearly" : "goes with its prices too"}: bigger
              orders, better prices on the same stocks and order sizes, for {clientele}.
              {speed && <> Slower execution goes with better prices too, so part of it may be how orders are handled.</>}
            </p>
          )}
          <p>
            Schwarz, Barber, Huang, Jorion and Odean {ans.yes ? "found no such link" : "found the same"} with 85,000 orders placed
            at several brokers at once (<i>Journal of Finance</i>, 2025).
          </p>
        </div>
      </div>

      <button type="button" className="btn btn-ghost mx-more js-only" aria-expanded={open} aria-controls="stats" onClick={() => setOpen(!open)}>
        <span>{open ? "Hide the statistics" : "Show the statistics"}</span><Icon name="down" size={20} />
      </button>

      <div id="stats" className="mx-sb" data-sg={shown}>
        <div className="mx-sb-head">
          <h3 className="mx-h3">Every test</h3>
          <fieldset className="seg">
            <legend className="sr-only">Stocks</legend>
            <input type="radio" name="ev" id="ev-sp" value="Y" defaultChecked onChange={(e) => { if (e.target.checked) pick("Y"); }} />
            <label htmlFor="ev-sp">{GROUPS[0].label}</label>
            <input type="radio" name="ev" id="ev-ot" value="N" onChange={(e) => { if (e.target.checked) pick("N"); }} />
            <label htmlFor="ev-ot">{GROUPS[1].label}</label>
          </fieldset>
        </div>
        <p className="sr-only" role="status">{said}</p>
        <ul className="mx-key">
          <li><span className="mx-key-dot" aria-hidden="true" />Strength</li>
          <li><span className="mx-key-ci" aria-hidden="true" />95% interval</li>
          <li><span className="mx-key-zero" aria-hidden="true" />Zero, no link</li>
        </ul>
        <ForestTable d={d} />

        <h3 className="mx-h3">How the tests work</h3>
        <dl className="mx-terms mx-how">
          <div><dt>Strength</dt><dd>Spearman's rank correlation between brokers, from −1 to +1; 0 means no link. Brokers with equal values share their average rank.</dd></div>
          <div><dt>95% interval</dt><dd>The middle 95% of the strengths found in 3,000 resamples of the brokers.</dd></div>
          <div>
            <dt>p-value</dt>
            <dd>
              The share of 10,000 random shufflings of the brokers that gave a link at least as strong, in either direction.
              Under 0.05 a test “Holds up” if its link points the way the test says, or “Goes the other way”; otherwise it
              “Could be chance”.
            </dd>
          </div>
          <div><dt>Equal share price</dt><dd>A partial rank correlation that holds each broker's average share price fixed.</dd></div>
          <div>
            <dt>Same stocks</dt>
            <dd>
              Each broker against the others on every stock, order size and lot (100 shares, fewer, or a fraction) that at least
              three other brokers' customers traded; a broker needs 100 of them for a gap.
            </dd>
          </div>
          <div><dt>Few brokers</dt><dd>With {fewest === most ? fewest : `${fewest} to ${most}`} brokers a test has little power: a real link can look like chance, and none of these links shows a cause.</dd></div>
          {check && (
            <div>
              <dt>A check</dt>
              <dd>
                Robinhood's own payment report for {quarterLong(CHECK.quarter)} says it was paid {CHECK.stated}% of the spread in
                regular hours; read the site's way, the same report gives {check[0].toFixed(1)}% to {check[1].toFixed(1)}% (a
                quarter's rates over one month's spreads).
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  );
}
