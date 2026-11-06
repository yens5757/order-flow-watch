// Cost by order size: both brokers across the Rule 605 size buckets under $200,000, in dollars above the fair price per
// $10,000 traded or as a share of the spread. One generated line says at how many sizes each one's customers paid less;
// orders of $200,000 and over (a different market, far dearer everywhere) are named in the foot rather than drawn, so they
// don't flatten the rest of the chart. The key is HTML above the chart, and "Show as a table" gives every number.
import { useMemo, useState } from "react";
import { EChart } from "../../charts/EChart";
import { tip } from "../../charts/kit";
import { lines } from "../../charts/options";
import { money } from "../../lib/broker";
import { BUCKET_LABEL, execKey, SIZE_STEPS, type Data, type Filters, type Firm } from "../../lib/data";
import { DOT, pct } from "../../lib/format";
import { fairText } from "../../lib/metrics";
import { useTheme } from "../../lib/theme";
import { Card, ChartTable, Empty, Legend, Segmented } from "../ui";
import { capital, ordersWord, stocksWord } from "./pair";

type Unit = "usd" | "pct";
const SHORT: Record<number, string> = { 0: "<$250", 250: "$250", 1000: "$1k", 5000: "$5k", 10000: "$10k", 20000: "$20k", 50000: "$50k" };
const STEPS = SIZE_STEPS.filter((b) => b < 200000);
const BIG = 200000;

export function SizeCard({ d, f, A, B, monthName }: { d: Data; f: Filters; A: Firm; B: Firm; monthName: string }) {
  const { t } = useTheme();
  const [unit, setUnit] = useState<Unit>("usd");
  // a share below zero with a true minus, never "-5%" or "-0%" (lib/format.ts pct), as every other percentage on the site
  const fmt = unit === "usd" ? money : (v: number) => pct(v, 0);
  // a figure for a reader (the tooltip, the table, the foot): in dollars, "$0.12 below" rather than a minus sign; the
  // axis keeps the sign, where the zero line shows it
  const show = unit === "usd" ? fairText : fmt;
  // dollars above the midpoint on a $10,000 trade (the share of the spread × half the quoted spread), or the share itself
  const value = (F: Firm, bk: number): number | null => {
    const e = d.exec.get(execKey(F.id, f.month, f.sp, f.ot, bk));
    if (e?.efq == null) return null;
    return unit === "usd" ? (e.qs == null ? null : e.efq * e.qs * 5000) : e.efq * 100;
  };
  const vals = [A, B].map((F) => STEPS.map((bk) => value(F, bk)));
  const has = vals.some((v) => v.some((x) => x != null));

  const option = useMemo(() => {
    const o = lines(t, STEPS.map((bk) => SHORT[bk]), [A, B].map((F, i) => ({ name: F.short, color: t.s[i], dashed: i === 1, values: vals[i] })), { fmt });
    const words = (ps: { value: number | null; color: string; seriesName: string; axisValue: string }[]) =>
      tip(ps[0].axisValue, ps.filter((p) => p.value != null).map((p) => [p.color, p.seriesName, show(p.value!)] as [string, string, string]));
    return { ...o, legend: { show: false }, grid: { ...(o.grid as object), top: 12 }, tooltip: { ...(o.tooltip as object), formatter: words } };
  }, [t, A.id, B.id, f.month, f.sp, f.ot, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  // at how many sizes each one's customers paid less, on the figures as shown
  let aLess = 0, bLess = 0, n = 0;
  STEPS.forEach((_, i) => {
    const [a, b] = [vals[0][i], vals[1][i]];
    if (a == null || b == null) return;
    n++;
    if (fmt(a) === fmt(b)) return;
    if (a < b) aLess++; else bLess++;
  });
  const less = unit === "usd" ? "paid less" : "paid a smaller share of the spread";
  const all = n === STEPS.length ? `every order size under $200,000` : `all ${n} order sizes both report`;
  const take = n === 0 ? null
    : aLess === n ? `${A.short}'s customers ${less} at ${all}.`
      : bLess === n ? `${B.short}'s customers ${less} at ${all}.`
        : `${A.short}'s customers ${less} at ${aLess} of ${n} order sizes, ${B.short}'s at ${bLess}${aLess + bLess < n ? `; ${n - aLess - bLess} level` : ""}.`;

  const big = [A, B].map((F) => [F, value(F, BIG)] as const).filter(([, v]) => v != null);
  const unitWords = unit === "usd" ? "per $10,000 traded" : "of the spread";
  const foot = big.length
    ? `Orders of $200,000 and over are left out of the chart: ${big.map(([F, v]) => `${show(v!)} at ${F.short}`).join(" and ")} ${unitWords}.`
    : null;
  const label = `Cost by order size, ${A.short} and ${B.short}, ${unit === "usd" ? "dollars above the fair price per $10,000 traded" : "share of the spread paid"}`;

  return (
    <Card title="Cost by order size" className="cmp-size" sub={`${capital(stocksWord(f.sp))}${DOT}${ordersWord(f.ot)}${DOT}${monthName}`}
      right={<Segmented<Unit> size="sm" label="Unit" value={unit} onChange={setUnit} options={[["usd", "$ per $10,000"], ["pct", "% of spread"]]} />}
      foot={foot}>
      {has ? (
        <>
          {take && <p className="cmp-take">{take}</p>}
          <Legend items={[{ color: t.s[0], label: A.short }, { color: t.s[1], label: B.short, dashed: true }]} />
          <EChart option={option} height={260} label={label} />
          <ChartTable caption={label} head={["Order size", A.short, B.short]}
            rows={STEPS.map((bk, i) => [BUCKET_LABEL[bk], ...vals.map((v) => (v[i] == null ? "–" : show(v[i]!)))])} />
        </>
      ) : <Empty>No price figures by order size for these orders in {monthName}.</Empty>}
    </Card>
  );
}

