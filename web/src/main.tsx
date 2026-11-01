import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadData } from "./lib/data";
import { fixLocation } from "./lib/hooks";
import { ThemeProvider } from "./lib/theme";
import "./index.css";

// The data first, then the app: the pre-rendered page (or the template's loading state) stays on screen until the app
// has everything it needs, and is replaced in one go.
const root = document.getElementById("root")!;
loadData().then((data) => {
  fixLocation(data); // an old #/ link or an old path name becomes the new URL before the first render
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <App data={data} />
      </ThemeProvider>
    </StrictMode>,
  );
}).catch((e: unknown) => {
  createRoot(root).render(<div className="mx-auto max-w-xl py-24 text-center text-ink2">{String((e as { message?: unknown })?.message ?? e)}</div>);
});
