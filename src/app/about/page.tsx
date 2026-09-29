import type { Metadata } from "next";
import Link from "next/link";
import { NOT_OFFICIAL_NOTICE, SITE } from "@/config/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About & data policy",
  description: `How ${SITE.name} compiles listings, what we verify, and what we never show: no invented prices, ratings, hours or stock.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "About", href: "/about" }]} />
      <article className="prose-content mx-auto mt-4 max-w-3xl">
        <h1 className="!m-0 text-2xl font-black sm:text-4xl">About {SITE.name} & our data policy</h1>
        <p>{SITE.name} helps people in Kuala Lumpur and Selangor decide where to buy frozen food, fresh meat and groceries — and helps local shops reach them.</p>
        <h2>Independent, not official</h2>
        <p>{NOT_OFFICIAL_NOTICE} Business names and addresses are used only to help people find them. If you represent a listed business and want a listing corrected, claimed or removed, <Link href="/business/claim">claim it</Link> or email {SITE.contactEmail}.</p>
        <h2>What we show — and what we don’t</h2>
        <ul>
          <li><strong>Listings</strong> start with a business name, branch and address from public information. They are marked <em>Unclaimed</em> until the owner verifies them.</li>
          <li><strong>We never invent</strong> prices, stock, promotions, ratings, reviews, opening hours or partnerships. If we don’t have verified data, we say so.</li>
          <li><strong>Ratings</strong> come only from reviews written on {SITE.name} and approved by our team. We don’t copy ratings from other sites.</li>
          <li><strong>Products:</strong> category pages describe what kinds of shops usually sell an item. Only a business itself can tell us that a branch stocks a specific product.</li>
          <li><strong>Distances</strong> use approximate neighbourhood-level coordinates and straight-line distance. Directions use the written address.</li>
          <li><strong>Paid placements</strong> are always labelled “Featured” or “Sponsored” and never change organic result order.</li>
        </ul>
      </article>
    </div>
  );
}
