import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProductBySlug } from "@/lib/queries/content";
import { searchStores } from "@/lib/queries/stores";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StoreCard } from "@/components/StoreCard";
import { DealCard } from "@/components/DealCard";
import { Markdown } from "@/components/Markdown";
import { pageMetadata } from "@/lib/seo";
import { formatMyr } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await db.product.findMany({ where: { isPublished: true }, select: { slug: true } })).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return { title: "Product not found", robots: { index: false } };
  return pageMetadata({
    title: `${data.product.name}: where to buy & what to check (Malaysia)`,
    description: `${data.product.description} Shop types to check around Kuala Lumpur and Selangor, plus buying tips.`,
    path: `/products/${slug}`,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();
  const { product, deals, related } = data;
  const { cards } = await searchStores({ category: product.category.slug, pageSize: 6 });
  const path = `/products/${slug}`;

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: product.category.name, href: `/categories/${product.category.slug}` }, { name: product.name, href: path }]} />
      <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">{product.name}{product.nameZh && <span className="ml-2 text-lg font-semibold text-muted">{product.nameZh}</span>}</h1>
      <p className="mt-2 max-w-2xl text-muted">{product.description}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {product.buyingTips && (
            <section aria-labelledby="tips"><h2 id="tips" className="text-xl font-extrabold">What to check when buying</h2><Markdown>{product.buyingTips}</Markdown></section>
          )}
          {product.nutritionNote && (
            <section aria-labelledby="nutrition"><h2 id="nutrition" className="text-xl font-extrabold">Protein & nutrition</h2><p className="mt-2 text-muted">{product.nutritionNote}</p></section>
          )}

          {product.offerings.length > 0 && (
            <section aria-labelledby="verified">
              <h2 id="verified" className="mb-3 text-xl font-extrabold">Shops that list this product</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                {product.offerings.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>{o.branch ? <Link className="font-semibold text-pandan-800 hover:underline" href={`/stores/${o.branch.slug}`}>{o.business.name} | {o.branch.branchName}</Link> : <span className="font-semibold">{o.business.name} (all branches)</span>}</span>
                    <span className="text-muted">{o.priceSen != null ? `${formatMyr(o.priceSen)}${o.priceUnit ? ` ${o.priceUnit}` : ""}` : "Price not listed"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Listed by the businesses themselves. Confirm price and availability with the shop.</p>
            </section>
          )}

          <section aria-labelledby="where">
            <h2 id="where" className="mb-2 text-xl font-extrabold">Where to look</h2>
            <p className="mb-4 rounded-xl bg-turmeric-100 px-4 py-3 text-sm text-turmeric-700">
              {product.category.name} is usually sold at {product.category.storeTypes.map((s) => s.name.toLowerCase()).join(" and ")}. The shops below are of those types.
              <strong> We haven’t verified that any of them has {product.name.toLowerCase()} in stock</strong> — call ahead.
            </p>
            {cards.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">{cards.map((s) => <StoreCard key={s.id} store={s} />)}</div>
            ) : <p className="text-sm text-muted">No listings yet.</p>}
            <Link href={`/stores?category=${product.category.slug}`} className="btn btn-outline mt-4">Browse all shops</Link>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-4" aria-labelledby="deals">
            <h2 id="deals" className="text-lg font-extrabold">Deals</h2>
            {deals.length > 0 ? <div className="mt-3 space-y-3">{deals.map((d) => <DealCard key={d.id} deal={d} />)}</div> : <p className="mt-2 text-sm text-muted">No approved deals for this product right now.</p>}
          </section>
          {related.length > 0 && (
            <section className="card p-4" aria-labelledby="related">
              <h2 id="related" className="text-lg font-extrabold">More in {product.category.name}</h2>
              <ul className="mt-2 space-y-1.5 text-sm">{related.map((r) => <li key={r.id}><Link className="text-pandan-700 hover:underline" href={`/products/${r.slug}`}>{r.name}</Link></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
