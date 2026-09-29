import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export type Crumb = { name: string; href: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <JsonLd data={breadcrumbJsonLd(all)} />
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {all.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === all.length - 1 ? (
              <span aria-current="page" className="font-medium text-ink">{c.name}</span>
            ) : (
              <Link href={c.href} className="hover:text-pandan-700 hover:underline">{c.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
