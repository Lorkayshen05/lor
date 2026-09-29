import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/queries/content";
import { getSponsoredCards, searchStores } from "@/lib/queries/stores";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StoreCard } from "@/components/StoreCard";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await db.category.findMany({ select: { slug: true } })).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) return { title: "Category not found", robots: { index: false } };
  const isStoreType = c.kind === "STORE_TYPE";
  return pageMetadata({
    title: isStoreType ? `${c.name} in Kuala Lumpur & Selangor` : `Where to buy ${c.name.toLowerCase()} – shops & buying tips`,
    description: `${c.description} Find ${isStoreType ? c.name.toLowerCase() : "shops that usually sell it"} around Kuala Lumpur and Selangor.`,
    path: `/categories/${slug}`,
    noindex: isStoreType && c._count.branches === 0, // an empty shop-type page would be thin content
  });
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const isStoreType = category.kind === "STORE_TYPE";
  const [{ cards, total }, sponsored] = await Promise.all([
    searchStores({ category: slug, pageSize: 12 }),
    getSponsoredCards({ placement: "CATEGORY", categoryId: category.id, limit: 2 }),
  ]);
  const path = `/categories/${slug}`;

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Categories", href: "/categories/chicken-breast" }, { name: category.name, href: path }]} />
      <header className="mt-3 flex items-start gap-3">
        <span className="text-4xl sm:text-5xl" aria-hidden="true">{category.emoji}</span>
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">{category.name}{category.nameZh && <span className="ml-2 text-lg font-semibold text-muted">{category.nameZh}</span>}</h1>
          <p className="mt-2 max-w-2xl text-muted">{category.description}</p>
        </div>
      </header>

      {category.products.length > 0 && (
        <section className="mt-8" aria-labelledby="prods">
          <h2 id="prods" className="mb-3 text-xl font-extrabold">Popular {category.name.toLowerCase()} products</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.products.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.slug}`} className="card block h-full p-4 hover:border-pandan-600">
                  <span className="font-bold">{p.name}</span>{p.nameZh && <span className="ml-2 text-sm text-muted">{p.nameZh}</span>}
                  <span className="mt-1 block text-sm text-muted">{p.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="stores">
        <h2 id="stores" className="mb-2 text-xl font-extrabold">{isStoreType ? `${category.name} near you` : `Shops to check for ${category.name.toLowerCase()}`}</h2>
        {!isStoreType && (
          <p className="mb-4 rounded-xl bg-turmeric-100 px-4 py-3 text-sm text-turmeric-700">
            Shops of these types usually sell {category.name.toLowerCase()}: {category.storeTypes.map((s) => s.name.toLowerCase()).join(", ")}.
            <strong> We haven’t verified what each branch stocks today</strong> — call ahead before you go.
          </p>
        )}
        {sponsored.length > 0 && (
          <div className="mb-4"><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ice-700">Sponsored</h3><div className="grid gap-4 sm:grid-cols-2">{sponsored.map((s) => <StoreCard key={`sp-${s.id}`} store={s} />)}</div></div>
        )}
        {cards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((s) => <StoreCard key={s.id} store={s} />)}</div>
        ) : (
          <p className="card p-6 text-sm text-muted">We don’t have any listings in this category yet.</p>
        )}
        {total > cards.length && <Link href={`/stores?category=${slug}`} className="btn btn-outline mt-4">See all {total} stores</Link>}
      </section>

      {cards.length > 0 && <JsonLd data={itemListJsonLd(`${category.name} stores`, cards.map((c) => ({ name: `${c.businessName} | ${c.branchName}`, path: `/stores/${c.slug}` })))} />}
    </div>
  );
}
