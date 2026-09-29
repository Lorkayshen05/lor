import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { getLatestDeals, getProductCategories, getPublishedArticles } from "@/lib/queries/content";
import { getNearestStores, getPopularStores, getSponsoredCards } from "@/lib/queries/stores";
import { listSeoPages } from "@/lib/queries/seo-pages";
import { db } from "@/lib/db";
import { SearchBox } from "@/components/SearchBox";
import { CategoryTile } from "@/components/CategoryTile";
import { NearbyStores } from "@/components/NearbyStores";
import { StoreCard } from "@/components/StoreCard";
import { DealCard } from "@/components/DealCard";
import { SectionHeading } from "@/components/SectionHeading";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd } from "@/components/JsonLd";
import { websiteJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  ...pageMetadata({ title: `${SITE.name} – ${SITE.tagline}`, description: SITE.description, path: "/" }),
  title: { absolute: `${SITE.name} – Frozen food, fresh meat & grocery shops near you (KL & Selangor)` },
};

const PROTEIN = ["chicken-breast", "tofu", "seafood", "beef"];

export default async function HomePage() {
  const [categories, nearby, sponsored, popular, deals, articles, seoPages, areas] = await Promise.all([
    getProductCategories(),
    getNearestStores(SITE.defaultCenter, 3),
    getSponsoredCards({ placement: "HOMEPAGE", limit: 2 }),
    getPopularStores(6),
    getLatestDeals(3),
    getPublishedArticles(3),
    listSeoPages(),
    db.area.findMany({ where: { isActive: true }, select: { slug: true, name: true } }),
  ]);
  const areaName = new Map(areas.map((a) => [a.slug, a.name]));
  const topicName: Record<string, string> = { "frozen-food": "frozen food", "fresh-meat": "fresh meat" };
  const protein = categories.filter((c) => PROTEIN.includes(c.slug));
  const mealPrep = articles.filter((a) => /meal-prep|protein/.test(a.slug)).slice(0, 2);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      {/* 1. Hero + search */}
      <section className="bg-gradient-to-b from-pandan-100 via-pandan-50 to-cream">
        <div className="container-page py-10 sm:py-16">
          <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold text-pandan-800 shadow-sm">🇲🇾 Kuala Lumpur & Selangor</p>
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-pandan-900 sm:text-5xl">
            Find frozen food, fresh meat &amp; groceries <span className="text-chili-600">near you.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
            Compare local shops, discover what to buy for hotpot, meal prep and high-protein cooking, and check the deals worth a trip.
          </p>
          <div className="mt-6 max-w-3xl"><SearchBox /></div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {["chicken breast", "hotpot", "seafood", "dumplings"].map((t) => (
              <Link key={t} href={`/stores?q=${encodeURIComponent(t)}`} className="rounded-full border border-pandan-200 bg-white px-3 py-1.5 font-medium text-pandan-800 hover:bg-pandan-50">{t}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page space-y-14 py-10">
        {/* 2. Popular categories */}
        <section aria-labelledby="cats">
          <SectionHeading title="Popular categories" sub="Start from what you want to cook." href="/categories/chicken-breast" cta="All categories" />
          <div id="cats" className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {categories.slice(0, 13).map((c, i) => <CategoryTile key={c.id} index={i} href={`/categories/${c.slug}`} emoji={c.emoji} name={c.name} nameZh={c.nameZh} />)}
          </div>
        </section>

        {/* Sponsored (only when a paid placement is active) */}
        {sponsored.length > 0 && (
          <section aria-label="Sponsored stores">
            <SectionHeading title="Sponsored stores" sub="Paid placements — shown separately from search results." />
            <div className="grid gap-4 sm:grid-cols-2">{sponsored.map((s) => <StoreCard key={s.id} store={s} />)}</div>
          </section>
        )}

        {/* 3. Nearby stores */}
        <section aria-labelledby="nearby">
          <SectionHeading title="Nearby stores" href="/stores" cta="See all stores" />
          <div id="nearby"><NearbyStores initial={nearby} fallbackLabel="Around central Kuala Lumpur — tap “Use my location” for the ones nearest you." /></div>
        </section>

        {/* 4. Popular stores */}
        <section aria-labelledby="popular">
          <SectionHeading title={popular.ranked ? "Popular stores" : "Browse stores"} sub={popular.ranked ? "Most viewed on BekuSegar in the last 30 days." : "Listings in our directory. Popularity ranking appears once we have enough visits."} href="/stores" cta="Full directory" />
          <div id="popular" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{popular.cards.map((s) => <StoreCard key={s.id} store={s} />)}</div>
        </section>

        <AdSlot slot="HOME_MID" />

        {/* 5. Latest deals */}
        <section aria-labelledby="deals">
          <SectionHeading title="Latest deals" sub="Owner-submitted and checked by our team before publishing." href="/deals" cta="All deals" />
          {deals.length > 0 ? (
            <div id="deals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{deals.map((d) => <DealCard key={d.id} deal={d} />)}</div>
          ) : (
            <div id="deals" className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted sm:text-base"><strong className="text-ink">No live deals yet.</strong> We only show real, approved promotions — never made-up prices. Run a shop? Post the first one.</p>
              <Link href="/business" className="btn btn-accent shrink-0">Post a deal</Link>
            </div>
          )}
        </section>

        {/* 6. High-protein discovery */}
        <section aria-labelledby="protein" className="rounded-3xl bg-pandan-900 p-5 text-white sm:p-8">
          <h2 id="protein" className="text-xl font-extrabold sm:text-2xl">High-protein grocery discovery</h2>
          <p className="mt-1 max-w-2xl text-sm text-pandan-100 sm:text-base">Chicken breast, tofu, seafood and beef — where to look, what to check, and how to compare protein per ringgit.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {protein.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-2xl bg-white/10 p-3 text-center hover:bg-white/20">
                <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
                <span className="mt-1 block text-sm font-bold">{c.name}</span>
              </Link>
            ))}
          </div>
          <Link href="/guides/affordable-high-protein-groceries-malaysia" className="btn mt-5 bg-turmeric-400 text-pandan-900 hover:bg-turmeric-500">Read the high-protein guide</Link>
        </section>

        {/* 7. Student meal-prep guides */}
        <section aria-labelledby="guides">
          <SectionHeading title="Student meal-prep guides" href="/guides" cta="All guides" />
          <div id="guides" className="grid gap-4 sm:grid-cols-2">
            {(mealPrep.length ? mealPrep : articles.slice(0, 2)).map((a) => (
              <Link key={a.id} href={`/guides/${a.slug}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <h3 className="text-lg font-extrabold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted">{a.excerpt}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-pandan-700">Read guide →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 8. SEO content */}
        <section aria-labelledby="seo" className="card p-5 sm:p-8">
          <h2 id="seo" className="text-xl font-extrabold sm:text-2xl">Buying frozen food and fresh meat in the Klang Valley</h2>
          <div className="prose-content mt-2 text-sm sm:text-base">
            <p>
              Frozen and fresh meat shops are a big part of how Malaysian households stock up on chicken, pork, beef, seafood and hotpot ingredients.
              Prices, stock and opening hours differ from branch to branch, so BekuSegar focuses on helping you decide <em>where to look</em>, then
              points you to the shop to confirm details. Listings marked “Unclaimed” have not yet been verified by the business.
            </p>
            <p>Browse by area:</p>
            <ul>
              {seoPages.slice(0, 12).map((p) => (
                <li key={`${p.area}/${p.topic}`}><Link href={`/${p.area}/${p.topic}`}>{topicName[p.topic] ?? p.topic} in {areaName.get(p.area)}</Link></li>
              ))}
            </ul>
          </div>
        </section>

        {/* 9. Business CTA */}
        <section aria-labelledby="biz" className="rounded-3xl border-2 border-dashed border-pandan-200 bg-white p-6 text-center sm:p-10">
          <h2 id="biz" className="text-xl font-extrabold sm:text-2xl">Own or manage a shop?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted sm:text-base">Claim your free listing to add opening hours, contact details, products and deals — and see how many people view your store and ask for directions.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/business/claim" className="btn btn-primary">Claim your listing</Link>
            <Link href="/business" className="btn btn-outline">See how it works</Link>
          </div>
        </section>
      </div>
    </>
  );
}
