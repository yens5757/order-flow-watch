import "@fontsource-variable/figtree";
import "./index.css";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { loadData } from "./lib/data";
import { fixLocation } from "./lib/hooks";
import { ThemeProvider } from "./lib/theme";

// The data first, then the app. A pre-rendered page (scripts/prerender.mjs) is already on screen and readable: React
// takes it over in place (hydrateRoot), so nothing blanks or jumps. It renders from scratch instead when there is nothing
// to take over (the dev server and 404.html show the loader), when an old link was rewritten to another URL, or when
// the URL carries a query (brokers/?m=gap, calculator/?b=…): the pre-render was made without one, so its markup would
// not match the page the query asks for.
const root = document.getElementById("root")!;
const prerendered = root.firstElementChild != null && !document.getElementById("app-loading");
loadData().then((data) => {
  const rewritten = fixLocation(data); // an old #/ link or an old path name becomes the new URL before the first render
  const app = (
    <StrictMode>
      <ThemeProvider>
        <App data={data} />
      </ThemeProvider>
    </StrictMode>
  );
  if (prerendered && !rewritten && !location.search) hydrateRoot(root, app);
  else createRoot(root).render(app);
}).catch((e: unknown) => {
  const html = document.documentElement;
  html.classList.remove("q"); // nothing will replace the pre-rendered figures, so show them
  console.error(e);
  if (prerendered) {
    // the page is already readable: keep it, and show the version that works without the app (every table row, the
    // stock switch, no buttons that would do nothing), with one quiet line saying the rest didn't load
    html.classList.remove("js");
    const note = document.createElement("p");
    note.className = "load-note";
    note.setAttribute("role", "status");
    note.textContent = "Some interactive parts didn't load. Reload the page to try again.";
    document.querySelector("main")?.prepend(note);
    return;
  }
  createRoot(root).render(<p className="mx-auto max-w-xl py-24 text-center text-ink2">The latest reports didn't load. Reload the page to try again.</p>);
});
