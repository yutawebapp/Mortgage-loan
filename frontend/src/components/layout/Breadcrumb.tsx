import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo";

// Renders the visible breadcrumb and its BreadcrumbList JSON-LD from the same list,
// so the two can never drift apart.
export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <ol>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={c.path}>
                {last ? <span aria-current="page">{c.name}</span> : <Link href={c.path}>{c.name}</Link>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
