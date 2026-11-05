// The broker page's one control: S&P 500 stocks or other stocks. A native radio group (arrow keys move and pick, as in any
// radio group), uncontrolled: whichever radio is checked decides through CSS which group's figures show (broker.css), so
// the switch works before the script loads, without one, and after the browser restores a checked radio on Back.
// `onBefore` runs just before a pick can happen (a press or a key), while the page still shows the old group, so the
// page can measure the table and animate its re-ranking.
import type { Sp } from "../../lib/data";

export function StockSwitch({ onPick, onBefore }: { onPick: (sp: Sp) => void; onBefore?: () => void }) {
  return (
    <fieldset className="seg" onPointerDownCapture={onBefore} onKeyDownCapture={onBefore}>
      <legend className="sr-only">Stocks</legend>
      <input type="radio" name="sg" id="sg-sp" value="Y" defaultChecked onChange={(e) => { if (e.target.checked) onPick("Y"); }} />
      <label htmlFor="sg-sp">S&amp;P&nbsp;500 stocks</label>
      <input type="radio" name="sg" id="sg-ot" value="N" onChange={(e) => { if (e.target.checked) onPick("N"); }} />
      <label htmlFor="sg-ot">Other stocks</label>
    </fieldset>
  );
}
