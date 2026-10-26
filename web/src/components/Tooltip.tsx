import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Show = (content: ReactNode, e: { clientX: number; clientY: number }) => void;
const Ctx = createContext<{ show: Show; hide: () => void }>({ show: () => {}, hide: () => {} });
export const useTip = () => useContext(Ctx);

/** One floating tooltip for the whole app; charts call show() on hover. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ content: ReactNode; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const show = useCallback<Show>((content, e) => setState({ content, x: e.clientX, y: e.clientY }), []);
  const hide = useCallback(() => setState(null), []);
  let left = 0, top = 0;
  if (state) {
    const w = box.current?.offsetWidth ?? 240, h = box.current?.offsetHeight ?? 80;
    left = state.x + 14 + w > innerWidth - 8 ? state.x - w - 14 : state.x + 14;
    top = state.y + 14 + h > innerHeight - 8 ? state.y - h - 14 : state.y + 14;
  }
  return (
    <Ctx.Provider value={{ show, hide }}>
      {children}
      <div ref={box} role="tooltip"
        className="pointer-events-none fixed z-50 max-w-[300px] rounded-xl border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-snug text-ink transition-opacity duration-75"
        style={{ left: Math.max(8, left), top: Math.max(8, top), opacity: state ? 1 : 0, boxShadow: "var(--shadow)" }}>
        {state?.content}
      </div>
    </Ctx.Provider>
  );
}

export function TipTitle({ children }: { children: ReactNode }) {
  return <div className="mb-1 font-semibold">{children}</div>;
}
export function TipRow({ label, value, color }: { label: ReactNode; value: ReactNode; color?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-ink2">
        {color && <i className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />}{label}
      </span>
      <span className="tnum">{value}</span>
    </div>
  );
}
