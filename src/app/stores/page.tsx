import type { Metadata } from "next";
import Link from "next/link";
import { getSponsoredCards, getStoreFacets, searchStores } from "@/lib/queries/stores";
import { isValidLatLng } from "@/lib/geo";
import { SearchBox } from "@/components/SearchBox";
import { StoreCard } from "@/components/StoreCard";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd } from "@/components/JsonLd";
import { Track } from "@/components/Track";
import { itemListJsonLd, pageMetadata } from "@/lib/seo";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = ["q", "category", "area", "open", "price", "featured", "lat", "lng", "sort"].some((k) => one(sp[k]));
  return pageMetadata({
    title: "Frozen food & fresh meat store directory – Kuala Lumpur & Selangor",
    description: "Browse frozen food and fresh meat shops around Kuala Lumpur and Selangor. Search by product, filter by area and category, and sort by distance.",
    path: "/stores",
    noindex: filtered, // filtered/sorted views are for people; the clean /stores is what we want indexed
  });
}

export default async function StoresPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 100) || undefined;
  const lat = Number(one(sp.lat));
  const lng = Number(one(sp.lng));
  const origin = one(sp.lat) && one(sp.lng) && isValidLatLng(lat, lng) ? { lat, lng } : null;
  const priceLevel = Number(one(sp.price)) >= 1 && Number(one(sp.price)) <= 3 ? Number(one(sp.price)) : undefined;
  const filters = {
    q, origin, priceLevel,
    category: one(sp.category) || undefined,
    area: one(sp.area) || undefined,
    openNow: one(sp.open) === "1",
    featured: one(sp.featured) === "1",
    sort: (one(sp.sort) === "name" ? "name" : origin ? "distance" : "name") as "name" | "distance",
    page: Math.max(1, Number(one(sp.page)) || 1),
  };
  const [result, facets] = await Promise.all([searchStores(filters), getStoreFacets()]);
  const anyFilter = !!(q || filters.category || filters.area || filters.openNow || filters.featured || priceLevel);
  const sponsored = result.page === 1 && !filters.openNow ? await getSponsoredCards({ placement: "STORE_DIRECTORY", limit: 2, origin }) : [];

  const keep = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category: filters.category, area: filters.area, open: filters.openNow ? "1" : undefined, price: priceLevel, featured: filters.featured ? "1" : undefined, lat: origin?.lat.toFixed(4), lng: origin?.lng.toFixed(4), sort: origin ? filters.sort : undefined, ...over })) {
      if (v !== undefined && v !== "") p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/stores?${s}` : "/stores";
  };

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Stores", href: "/stores" }]} />
      <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Frozen food & fresh meat stores</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {result.total} {result.total === 1 ? "store" : "stores"}{anyFilter ? " match your filters" : " listed in Kuala Lumpur and Selangor"}.
        {origin && " Sorted by straight-line distance from your location (approximate)."}
      </p>
      <div className="mt-4"><SearchBox defaultValue={q} compact /></div>
      {q && <Track type="SEARCH" searchTerm={q} meta={{ results: result.total }} />}

      <details className="card mt-4 p-4" open={!!(filters.category || filters.area || filters.openNow || filters.featured || priceLevel)}>
        <summary className="cursor-pointer text-sm font-bold">Filters &amp; sorting</summary>
        <form method="get" action="/stores" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {q && <input type="hidden" name="q" value={q} />}
          {origin && <><input type="hidden" name="lat" value={origin.lat.toFixed(4)} /><input type="hidden" name="lng" value={origin.lng.toFixed(4)} /></>}
          <label className="text-sm font-semibold">Category
            <select name="category" defaultValue={filters.category ?? ""} className="input mt-1">
              <option value="">All categories</option>
              {facets.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.kind === "STORE_TYPE" ? " (shop type)" : ""}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Area
            <select name="area" defaultValue={filters.area ?? ""} className="input mt-1">
              <option value="">All areas</option>
              {facets.areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Sort by
            <select name="sort" defaultValue={filters.sort} className="input mt-1">
              <option value="name">Name (A–Z)</option>
              {origin && <option value="distance">Nearest first</option>}
            </select>
          </label>
          {facets.hasPriceData && (
            <label className="text-sm font-semibold">Price level
              <select name="price" defaultValue={priceLevel ?? ""} className="input mt-1">
                <option value="">Any</option><option value="1">$ (budget)</option><option value="2">$$ and below</option><option value="3">$$$ and below</option>
              </select>
            </label>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:col-span-2 lg:col-span-4">
            {facets.hasHoursData && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="open" value="1" defaultChecked={filters.openNow} className="size-5" /> Open now</label>}
            {facets.hasFeatured && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="featured" value="1" defaultChecked={filters.featured} className="size-5" /> Featured &amp; sponsored only</label>}
            {!facets.hasHoursData && <span className="text-xs text-muted">“Open now” appears once shops have verified opening hours.</span>}
            <span className="flex-1" />
            {anyFilter && <Link href="/stores" className="btn btn-outline btn-sm">Reset</Link>}
            <button className="btn btn-primary btn-sm">Apply</button>
          </div>
        </form>
      </details>

      {result.matchedProducts.length > 0 && (
        <p className="mt-4 rounded-xl bg-turmeric-100 px-4 py-3 text-sm text-turmeric-700">
          <strong>{result.matchedProducts.join(", ")}</strong> — we show shop types that usually stock this (fresh meat and frozen food shops). We haven’t verified what each branch has today, so call ahead.
        </p>
      )}

      {sponsored.length > 0 && (
        <section aria-label="Sponsored" className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ice-700">Sponsored</h2>
          <div className="grid gap-4 sm:grid-cols-2">{sponsored.map((s) => <StoreCard key={`sp-${s.id}`} store={s} />)}</div>
        </section>
      )}

      <section aria-label="Results" className="mt-6">
        {sponsored.length > 0 && <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">All results</h2>}
        {result.cards.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-bold">No stores match those filters.</p>
            <p className="mt-1 text-sm text-muted">Try a broader search, or reset the filters.</p>
            <Link href="/stores" className="btn btn-primary mt-4">Reset filters</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.cards.map((s) => <StoreCard key={s.id} store={s} headingLevel={sponsored.length ? 3 : 2} />)}</div>
        )}
        <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => keep({ page: p })} />
      </section>

      <div className="mt-10"><AdSlot slot="DIRECTORY_INLINE" /></div>
      {!anyFilter && <JsonLd data={itemListJsonLd("Frozen food & fresh meat stores", result.cards.map((c) => ({ name: `${c.businessName} | ${c.branchName}`, path: `/stores/${c.slug}` })))} />}
    </div>
  );
}
