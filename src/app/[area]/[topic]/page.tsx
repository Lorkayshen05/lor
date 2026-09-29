import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaTopicPage, listSeoPages } from "@/lib/queries/seo-pages";
import { getStoreCardsByIds } from "@/lib/queries/stores";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StoreCard } from "@/components/StoreCard";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";
import { formatDistance } from "@/lib/geo";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return listSeoPages();
}

// Genuinely useful, topic-specific guidance. Kept general on purpose: no prices, no stock claims.
const TIPS: Record<string, string[]> = {
  "frozen-food": [
    "Choose packs that are frozen solid; heavy frost or ice crystals inside the bag can mean the item thawed and was refrozen.",
    "Check the packing or expiry date, and ask if bulk items have no label.",
    "Compare price per kg rather than per pack, especially between bulk and small packs.",
    "Bring a cooler bag and buy frozen items last — Malaysian heat thaws food quickly.",
  ],
  "fresh-meat": [
    "Fresh meat should look moist and evenly coloured, with no sour smell.",
    "Ask for the cut you want — many fresh meat shops will slice or mince to order.",
    "Buy only what you'll cook in a day or two; portion and freeze the rest promptly.",
    "If halal matters to you, ask about certification — some shops sell pork.",
  ],
};

async function load(area: string, topic: string) {
  const page = await getAreaTopicPage(area, topic);
  return page;
}

export async function generateMetadata({ params }: { params: Promise<{ area: string; topic: string }> }): Promise<Metadata> {
  const { area, topic } = await params;
  const p = await load(area, topic);
  if (!p) return { title: "Page not found", robots: { index: false } };
  const t = p.topic.name;
  return pageMetadata({
    title: `${t} in ${p.area.name} – directory & buying tips`,
    description: `${p.near.length} ${t.toLowerCase()} listed within about ${p.area.radiusKm} km of ${p.area.name}, with addresses, directions and what to check before you buy.`,
    path: `/${area}/${topic}`,
  });
}

export default async function AreaTopicPage({ params }: { params: Promise<{ area: string; topic: string }> }) {
  const { area: areaSlug, topic: topicSlug } = await params;
  const p = await load(areaSlug, topicSlug);
  if (!p) notFound();
  const { area, topic, near, inArea, relatedArticles, otherAreas } = p;
  const cards = await getStoreCardsByIds(near.slice(0, 12).map((n) => n.branch.id), { lat: area.lat, lng: area.lng });
  const nearest = near[0];
  const path = `/${areaSlug}/${topicSlug}`;
  const t = topic.name.toLowerCase();
  const faq = [
    { q: `How many ${t} are listed near ${area.name}?`, a: `We currently list ${near.length} ${t} within about ${area.radiusKm} km of ${area.name}${inArea ? `, ${inArea} of them in ${area.name} itself` : ""}. The directory is growing, so this is not an exhaustive list.` },
    { q: `Which listed shop is closest to ${area.name}?`, a: `${nearest.branch.business.name} (${nearest.branch.branchName}) is the closest one we list, roughly ${formatDistance(nearest.km)} in a straight line from the centre of ${area.name}. Actual driving distance will differ.` },
    { q: "Are opening hours, prices and stock listed?", a: "Not yet. Listings show the shop's name and address. We only display hours, phone numbers, prices and deals after they've been provided by the business or verified by our team, so please call ahead before you go." },
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd data={faqJsonLd(faq)} />
      <JsonLd data={itemListJsonLd(`${topic.name} in ${area.name}`, cards.map((c) => ({ name: `${c.businessName} | ${c.branchName}`, path: `/stores/${c.slug}` })))} />
      <Breadcrumbs items={[{ name: "Stores", href: "/stores" }, { name: `${topic.name} in ${area.name}`, href: path }]} />
      <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">{topic.name} in {area.name}</h1>
      <div className="mt-3 max-w-3xl space-y-3 text-muted">
        <p>
          We list <strong className="text-ink">{near.length}</strong> {t} within about {area.radiusKm} km of {area.name}
          {inArea > 0 ? <>, including {inArea} in {area.name} itself</> : <>. None are inside {area.name} itself yet — the nearest is {nearest.branch.business.name} ({nearest.branch.branchName}), roughly {formatDistance(nearest.km)} away</>}.
        </p>
        {area.blurb && <p>{area.blurb}</p>}
        <p className="text-sm">Distances are approximate straight-line figures from the middle of {area.name}, not driving distances.</p>
      </div>

      <section className="mt-8" aria-labelledby="list">
        <h2 id="list" className="mb-3 text-xl font-extrabold">Listed near {area.name}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((s) => <StoreCard key={s.id} store={s} />)}</div>
        {near.length > cards.length && <Link href={`/stores?category=${topicSlug}&area=${areaSlug}`} className="btn btn-outline mt-4">See all {near.length}</Link>}
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="tips">
        <h2 id="tips" className="text-xl font-extrabold">What to check before you buy</h2>
        <div className="prose-content"><ul>{(TIPS[topicSlug] ?? []).map((tip) => <li key={tip}>{tip}</li>)}</ul></div>
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-extrabold">Frequently asked questions</h2>
        <div className="mt-3 space-y-2">{faq.map((f) => <details key={f.q} className="card p-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>)}</div>
      </section>

      {relatedArticles.length > 0 && (
        <section className="mt-10" aria-labelledby="rel">
          <h2 id="rel" className="mb-3 text-xl font-extrabold">Related guides</h2>
          <ul className="grid gap-3 sm:grid-cols-2">{relatedArticles.map((a) => <li key={a.slug}><Link href={`/guides/${a.slug}`} className="card block p-4 hover:border-pandan-600"><span className="font-bold">{a.title}</span><span className="mt-1 block text-sm text-muted">{a.excerpt}</span></Link></li>)}</ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="areas">
        <h2 id="areas" className="mb-3 text-xl font-extrabold">Nearby areas</h2>
        <ul className="flex flex-wrap gap-2">{otherAreas.map((a) => <li key={a.slug}><Link className="rounded-full border border-pandan-200 bg-white px-3 py-1.5 text-sm font-semibold text-pandan-800 hover:bg-pandan-50" href={`/${a.slug}/${topicSlug}`}>{topic.name} in {a.name}</Link></li>)}</ul>
      </section>
    </div>
  );
}
