// Any address the site has no page for: an unknown path, or a broker or pair the data doesn't know. GitHub Pages serves
// its 404.html shell for these (with a 404 status); the app renders this page there once its data is in, and
// describeRoute (lib/routes.ts) gives it its own title, no canonical link and noindex. A mistyped broker or pair
// (brokers/robinhod/, compare/fidelty-vs-robinhood/) gets one line under the heading with the page it most likely meant,
// from the path alone (suggestPath), so the pre-render can draw it too.
import { Icon, PageHeader } from "../components/ui";
import type { Data } from "../lib/data";
import { href, pagePath, suggestPath, type PageName } from "../lib/routes";

const WHERE: [PageName, string][] = [["home", "Home"], ["brokers", "Brokers"], ["compare", "Compare"]];

export default function NotFound({ d, path }: { d: Data; path: string }) {
  const near = suggestPath(d, path);
  return (
    <>
      <PageHeader title="Page not found" intro={near ? (
        <>
          There's no page at this address. Did you mean{" "}
          {/* padded to a 44px target without moving the line */}
          <a className="ulink inline-block py-2.5 -my-2.5" href={href(near.path)}>{near.name}</a>?
        </>
      ) : "There's no page at this address."} />
      <nav className="card max-w-[44rem]" aria-label="Other pages">
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {WHERE.map(([page, label]) => (
            <li key={page}>
              <a className="pill-soft" href={href(pagePath(page))}><span>{label}</span><Icon name="right" size={18} /></a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
