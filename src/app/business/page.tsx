import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SITE } from "@/config/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { formatMyr } from "@/lib/utils";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "List your frozen food or meat shop – free business listing",
  description: `Claim your free ${SITE.name} listing: add opening hours, contact details and deals, receive enquiries and see how many shoppers view your store.`,
  path: "/business",
});

const FAQ = [
  { q: "Is a listing really free?", a: "Yes. A basic listing with your address and contact details is free. Paid plans are optional and add visibility and analytics." },
  { q: "How do you verify that I own the shop?", a: "After you submit a claim, our team contacts the shop to confirm before approving it." },
  { q: "Do I have to pay to receive enquiries?", a: "No. Enquiries from shoppers are delivered to your dashboard on every plan." },
  { q: "Do deals appear immediately?", a: "Deals are checked by our team before they go live, usually within a day." },
];

export default async function BusinessLanding() {
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <JsonLd data={faqJsonLd(FAQ)} />
      <section className="bg-gradient-to-b from-turmeric-100 to-cream">
        <div className="container-page py-10 sm:py-16">
          <Breadcrumbs items={[{ name: "For businesses", href: "/business" }]} />
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-pandan-900 sm:text-5xl">Get found by shoppers looking for frozen food and fresh meat.</h1>
          <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">Your shop may already be listed. Claim it to control what shoppers see, and find out how many of them look at your store, ask for directions or call you.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/business/claim" className="btn btn-accent !min-h-12">Claim your free listing</Link>
            <Link href="/business/dashboard" className="btn btn-outline !min-h-12">Business dashboard</Link>
          </div>
        </div>
      </section>

      <div className="container-page space-y-14 py-10">
        <section aria-labelledby="how">
          <h2 id="how" className="mb-4 text-xl font-extrabold sm:text-2xl">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Claim", "Find your shop and submit a claim. We call the shop to verify."],
              ["2", "Complete your profile", "Add opening hours, phone, WhatsApp, products and photos."],
              ["3", "Get customers", "Post deals, receive quotation requests and track views, calls and directions."],
            ].map(([n, t, d]) => (
              <li key={n} className="card p-5"><span className="grid size-8 place-items-center rounded-full bg-pandan-700 font-bold text-white">{n}</span><h3 className="mt-3 font-extrabold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="plans">
          <h2 id="plans" className="mb-1 text-xl font-extrabold sm:text-2xl">Plans</h2>
          <p className="mb-4 text-sm text-muted">Start free. Upgrade only if it’s worth it to you. During launch, upgrades are arranged with our team directly — no card required to list.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const features = Array.isArray(p.features) ? (p.features as string[]) : [];
              return (
                <div key={p.id} className={`card flex flex-col p-5 ${p.tier === "FEATURED" ? "ring-2 ring-turmeric-400" : ""}`} data-testid="plan-card">
                  <h3 className="text-lg font-extrabold">{p.name}</h3>
                  <p className="mt-1 text-3xl font-black">{p.priceSen === 0 ? "Free" : <>{formatMyr(p.priceSen)}<span className="text-sm font-semibold text-muted">/{p.interval}</span></>}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">{features.map((f) => <li key={f} className="flex gap-2"><span aria-hidden="true" className="text-pandan-600">✓</span>{f}</li>)}</ul>
                  <Link href="/business/claim" className={`btn mt-5 ${p.tier === "FREE" ? "btn-primary" : "btn-outline"}`}>{p.tier === "FREE" ? "Start free" : "Claim, then upgrade"}</Link>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Featured and Premium placements are always labelled “Featured” or “Sponsored” so shoppers know what is paid.</p>
        </section>

        <section id="advertise" aria-labelledby="ads" className="card p-5 sm:p-8">
          <h2 id="ads" className="text-xl font-extrabold sm:text-2xl">Advertise or sponsor a guide</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">Suppliers and brands can sponsor a deal, a category placement or a buying guide. Everything is labelled “Sponsored”. Email <a className="font-semibold text-pandan-700 underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
        </section>

        <section aria-labelledby="faq" className="max-w-3xl">
          <h2 id="faq" className="mb-3 text-xl font-extrabold sm:text-2xl">Questions</h2>
          <div className="space-y-2">{FAQ.map((f) => <details key={f.q} className="card p-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>)}</div>
        </section>
      </div>
    </>
  );
}
