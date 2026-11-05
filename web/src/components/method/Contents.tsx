// "On this page": the page's sections in reading order, each a row that jumps to its card. It follows the first card in
// the page, so Tab and screen readers reach it second; on phones and tablets it shows there, and on a desktop CSS moves it
// into the right-hand column (method.css), where it stays in view beside the reading column (it covers nothing: the
// column is its own) and marks the section being read with the Here tint, as a table marks the page's own row. Each row
// ends in the world's go-to arrow ("Details", "Every broker's gap"), never the down chevron, which on this page and the
// broker page means "opens in place".
import { useEffect, useState, type CSSProperties } from "react";
import { Icon } from "../ui";

/** Every section's anchor and heading, in page order: the contents and the cards' own headings read the same words. */
export const SECTIONS = [
  { id: "sources", title: "Where the numbers come from" },
  { id: "fair-price", title: "What “above the fair price” means" },
  { id: "same-stocks", title: "Same stocks and order sizes" },
  { id: "payments", title: "What brokers are paid" },
  { id: "fees", title: "Fees" },
  { id: "limits", title: "What the data can't show" },
  { id: "questions", title: "Common questions" },
  { id: "evidence", title: "Do brokers paid more give worse prices?" },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];
export const titleOf = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.title;

/** The section being read: the last whose top has passed the upper third of the window (the first before any has).
 *  Followed only on a desktop, where the contents stay in view (method.css); phones never run it. */
const DESKTOP = "(min-width: 1024px)";
function useReading(): SectionId | null {
  const [cur, setCur] = useState<SectionId | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      let at: SectionId = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) at = s.id;
      }
      setCur(at);
    };
    const soon = () => { if (!frame) frame = requestAnimationFrame(check); };
    const follow = () => {
      removeEventListener("scroll", soon);
      removeEventListener("resize", soon);
      if (!mq.matches) { setCur(null); return; }
      check();
      addEventListener("scroll", soon, { passive: true });
      addEventListener("resize", soon);
    };
    follow();
    mq.addEventListener("change", follow);
    return () => {
      cancelAnimationFrame(frame);
      mq.removeEventListener("change", follow);
      removeEventListener("scroll", soon);
      removeEventListener("resize", soon);
    };
  }, []);
  return cur;
}

/** `rows`: how many cards of the reading column the contents run beside on a desktop. */
export function Contents({ rows }: { rows: number }) {
  const cur = useReading();
  return (
    <nav className="card mx-toc" aria-labelledby="toc-h" style={{ "--rows": rows } as CSSProperties}>
      <h2 id="toc-h">On this page</h2>
      <ul>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={cur === s.id ? "location" : undefined}><span>{s.title}</span><Icon name="arrow" size={18} /></a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
