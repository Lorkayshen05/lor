import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/queries/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: "Grocery guides: frozen food, meal prep, hotpot & high-protein shopping",
  description: "Practical guides for shopping frozen food, fresh meat and groceries in Malaysia — meal-prep, hotpot checklists and comparing protein sources.",
  path: "/guides",
});

export default async function GuidesPage() {
  const articles = await getPublishedArticles();
  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Guides", href: "/guides" }]} />
      <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Guides</h1>
      <p className="mt-2 max-w-2xl text-muted">Practical, no-hype buying advice. We don’t quote prices we can’t back up — we show you how to compare instead.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <article key={a.id} className="card p-5">
            {a.isSponsored && <Badge variant="sponsored">Sponsored{a.sponsorName ? ` by ${a.sponsorName}` : ""}</Badge>}
            <h2 className="mt-1 text-lg font-extrabold"><Link href={`/guides/${a.slug}`} className="hover:text-pandan-700">{a.title}</Link></h2>
            <p className="mt-2 text-sm text-muted">{a.excerpt}</p>
            {a.publishedAt && <p className="mt-3 text-xs text-muted">Published {formatDate(a.publishedAt)}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
