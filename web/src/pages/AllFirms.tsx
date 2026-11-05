// firms/: every firm that files a monthly SEC Rule 605 price report (about a hundred), off the nav and reached from the
// Brokers explorer. A working table first: the shared filters pick the orders (stock group, order type, order size; the
// month sits beside the heading so the filter bar stays one short row), the rails show where the brokers on this site sit
// among every firm, and the table lists them all, the ones with a page here linked. Styles: components/firms/firms.css.
import { useMemo } from "react";
import "../components/firms/firms.css";
import { FirmField } from "../components/firms/FirmField";
import { firmRows } from "../components/firms/firms";
import { FirmTable } from "../components/firms/FirmTable";
import { FilterBar } from "../components/Filters";
import { Breadcrumb, PageHeader, Select } from "../components/ui";
import { BUCKET_LABEL, OT_LABEL, SP_LABEL, type Data, type Filters, type Sp } from "../lib/data";
import { monthLong } from "../lib/format";
import { href, pagePath } from "../lib/routes";

export default function AllFirms({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const rows = useMemo(() => firmRows(d, f), [d, f]);
  // the rails' axis holds every figure of this order type and size, both stock groups and every month: flipping the
  // stock switch or the month moves the dots, never the axis
  const { ot, b } = f;
  const scale = useMemo(() => d.meta.months.flatMap((month) => (["Y", "N"] as Sp[]).flatMap((sp) =>
    firmRows(d, { sp, ot, b, month, quarter: d.meta.quarter, clearing: false }))), [d, ot, b]);
  const month = monthLong(f.month);
  const scope = `${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${BUCKET_LABEL[f.b].toLowerCase()}`;
  const file = `rule605_firms_${f.month}_${f.sp === "Y" ? "sp500" : "other"}_${f.ot === "M" ? "market" : "marketable-limit"}_${f.b}.csv`;

  return (
    <div className="af">
      <Breadcrumb up="Brokers" upHref={href(pagePath("brokers"))} here="All firms" />
      <PageHeader title="Every firm with a price report" intro={`${rows.length} firms file one with the SEC each month (Rule 605).`}
        right={d.meta.months.length > 1 && (
          <Select label="Prices from" value={f.month} onChange={(month) => set({ month })} options={d.meta.months.map((m) => [m, monthLong(m)])} />
        )} />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "b"]} />
      <div className="af-cards">
        <FirmField rows={rows} scale={scale} month={month} />
        <FirmTable rows={rows} scope={scope} month={month} file={file} />
      </div>
    </div>
  );
}
