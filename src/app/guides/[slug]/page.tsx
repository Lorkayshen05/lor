import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getArticleBySlug, getArticleListings } from "@/lib/queries/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge } from "@/components/Badge";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/Markdown";
import { AdSlot } from "@/components/AdSlot";
import { articleJsonLd, faqJsonLd, pageMetadata, parseFaq } from "@/lib/seo";
import { formatDate, safeHttpUrl } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";

export const revalidate = 600;

export async function generateStaticParams() {
  return (await db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } })).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticleBySlug((await params).slug);
  if (!a) return { title: "Guide not found", robots: { index: false } };
  return pageMetadata({ title: a.metaTitle ?? a.title, description: a.metaDescription ?? a.excerpt, path: `/guides/${a.slug}`, type: "article", publishedTime: a.publishedAt, modifiedTime: a.updatedAt });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticleBySlug((await params).slug);
  if (!article) notFound();
  const faq = parseFaq(article.faq);
  const { stores, area } = await getArticleListings(article);
  const path = `/guides/${article.slug}`;
  const sponsorUrl = safeHttpUrl(article.sponsorUrl);

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd data={articleJsonLd(article)} />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}
      <Breadcrumbs items={[{ name: "Guides", href: "/guides" }, { name: article.title, href: path }]} />
      <article className="mx-auto mt-4 max-w-3xl">
        {article.isSponsored && (
          <p className="mb-3"><Badge variant="sponsored">Sponsored content{article.sponsorName ? ` · ${article.sponsorName}` : ""}</Badge>{sponsorUrl && <> <a className="text-sm underline" href={sponsorUrl} rel="sponsored nofollow noopener noreferrer" target="_blank">Visit sponsor</a></>}</p>
        )}
        <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {article.publishedAt && <>Published {formatDate(article.publishedAt)}</>}
          {article.reviewedAt && <> · Last reviewed {formatDate(article.reviewedAt)}</>}
        </p>
        <Markdown>{article.body}</Markdown>

        {stores.length > 0 && (
          <section aria-labelledby="listings" className="card mt-8 p-5">
            <h2 id="listings" className="text-lg font-extrabold">Shops in our directory{area ? ` near ${area.name}` : ""}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {stores.map((s) => (
                <li key={s.slug}><Link className="font-semibold text-pandan-700 hover:underline" href={`/stores/${s.slug}`}>{s.name} | {s.branchName}</Link>
                  <span className="text-muted"> · {s.areaName}{s.km != null ? ` · ${formatDistance(s.km)} from ${area?.name}` : ""}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Listings show name and address only. We haven’t verified hours, prices or stock — please call ahead.</p>
          </section>
        )}

        {faq.length > 0 && (
          <section aria-labelledby="faq" className="mt-8">
            <h2 id="faq" className="text-xl font-extrabold">Frequently asked questions</h2>
            <div className="mt-3 space-y-2">
              {faq.map((f) => (
                <details key={f.q} className="card p-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>
              ))}
            </div>
          </section>
        )}
        <div className="mt-8"><AdSlot slot="ARTICLE_INLINE" /></div>
      </article>
    </div>
  );
}
