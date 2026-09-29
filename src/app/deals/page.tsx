import type { Metadata } from "next";
import Link from "next/link";
import { getActiveDeals } from "@/lib/queries/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DealCard } from "@/components/DealCard";
import { Pagination } from "@/components/Pagination";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: "Frozen food & fresh meat deals in Kuala Lumpur & Selangor",
  description: "Current promotions from local frozen food and fresh meat shops. Every deal is submitted by the business and approved by our team before it appears.",
  path: "/deals",
});

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { deals, pageCount, total } = await getActiveDeals(page, 12);
  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Deals", href: "/deals" }]} />
      <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Deals</h1>
      <p className="mt-2 max-w-2xl text-muted">Promotions submitted by shops and approved by our team. Prices and dates are the shop’s — always confirm before travelling.</p>
      {deals.length > 0 ? (
        <>
          <p className="mt-4 text-sm text-muted">{total} live {total === 1 ? "deal" : "deals"}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{deals.map((d) => <DealCard key={d.id} deal={d} />)}</div>
          <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(p) => `/deals?page=${p}`} />
        </>
      ) : (
        <div className="card mt-6 p-8 text-center">
          <p className="text-lg font-extrabold">No live deals right now</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">We only publish real promotions from real shops, so this page stays empty until they’re submitted. If you run a shop, you can post a deal for free.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/business" className="btn btn-accent">Post a deal</Link>
            <Link href="/stores" className="btn btn-outline">Browse stores</Link>
          </div>
        </div>
      )}
    </div>
  );
}
