// Any address the site has no page for: an unknown path, or a broker or pair the data doesn't know. GitHub Pages serves
// its 404.html shell for these (with a 404 status); the app renders this page there once its data is in, and
// describeRoute (lib/routes.ts) gives it its own title, no canonical link and noindex.
import { Icon, PageHeader } from "../components/ui";
import { href, pagePath, type PageName } from "../lib/routes";

const WHERE: [PageName, string][] = [["home", "Home"], ["brokers", "Brokers"], ["compare", "Compare"]];

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" intro="There's no page at this address." />
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
