import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProductCategoriesForStoreTypes, getStoreBySlug } from "@/lib/queries/stores";
import { hasVerifiedHours, openingHoursSchema, DAY_KEYS, DAY_LABELS } from "@/lib/hours";
import { formatMyPhone, formatMyr, formatDate, safeHttpUrl } from "@/lib/utils";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge } from "@/components/Badge";
import { Stars } from "@/components/Stars";
import { MapEmbed } from "@/components/MapEmbed";
import { StoreCard } from "@/components/StoreCard";
import { DealCard } from "@/components/DealCard";
import { TrackedLink } from "@/components/TrackedLink";
import { Track } from "@/components/Track";
import { JsonLd } from "@/components/JsonLd";
import { LeadForm, ReviewForm } from "@/components/forms";
import { leadAction, reviewAction } from "@/app/actions/public";
import { localBusinessJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await db.branch.findMany({ where: { isActive: true, business: { isPublished: true } }, select: { slug: true }, take: 200 });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStoreBySlug(slug);
  if (!data) return { title: "Store not found", robots: { index: false } };
  const { branch } = data;
  const name = `${branch.business.name} | ${branch.branchName}`;
  return pageMetadata({
    title: `${name} – ${branch.city}`,
    description: `${branch.business.nameAlt ?? branch.business.name} – ${branch.branchName}, ${branch.city}: address, directions, shop type and what to check before you go.`,
    path: `/stores/${slug}`,
  });
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getStoreBySlug(slug);
  if (!data) notFound();
  const { branch, card, deals, offerings, nearby, address } = data;
  const { business } = branch;
  const claimed = business.claimStatus === "CLAIMED";
  const hoursOk = hasVerifiedHours(branch.openingHours, branch.hoursVerifiedAt);
  const hours = hoursOk ? openingHoursSchema.parse(branch.openingHours) : null;
  const website = safeHttpUrl(branch.website ?? business.website);
  const productCats = await getProductCategoriesForStoreTypes(branch.categories.map((c) => c.slug));
  const otherBranches = business.branches.filter((b) => b.id !== branch.id);
  const path = `/stores/${slug}`;
  const ev = (type: "DIRECTIONS_CLICK" | "PHONE_CLICK" | "WHATSAPP_CLICK" | "WEBSITE_CLICK") => ({ type, branchId: branch.id });

  return (
    <div className="container-page py-6 sm:py-10">
      <Track type="STORE_VIEW" branchId={branch.id} path={path} />
      <JsonLd data={localBusinessJsonLd({
        name: business.name, branchName: branch.branchName, slug, description: business.description,
        addressLine: branch.addressLine, city: branch.city, state: branch.state, postcode: branch.postcode,
        phone: branch.phone, website, lat: branch.lat, lng: branch.lng, coordsApprox: branch.coordsApprox, hours, rating: card.rating,
      })} />
      <Breadcrumbs items={[{ name: "Stores", href: "/stores" }, { name: `${business.name} | ${branch.branchName}`, href: path }]} />

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {card.featured && <Badge variant="featured" title="Paid listing upgrade">★ Featured</Badge>}
          {claimed ? <Badge variant="neutral">Claimed by business</Badge> : <Badge variant="unclaimed">Unclaimed listing</Badge>}
          {card.status.state !== "unknown" && <Badge variant={card.status.state}>{card.status.label}</Badge>}
        </div>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-4xl">
          {business.name} <span className="text-pandan-700">| {branch.branchName}</span>
        </h1>
        {business.nameAlt && <p className="mt-1 text-muted">{business.nameAlt}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
          <span>📍 {address}</span>
          {card.rating && <Stars avg={card.rating.avg} count={card.rating.count} />}
        </p>
        {branch.promoDescription && <p className="mt-3 rounded-xl bg-turmeric-100 px-4 py-3 text-sm font-medium text-turmeric-700">{branch.promoDescription}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <TrackedLink href={card.directionsUrl} target="_blank" rel="noopener noreferrer" event={ev("DIRECTIONS_CLICK")} className="btn btn-primary">Directions</TrackedLink>
          {branch.phone && <TrackedLink href={`tel:+${branch.phone}`} event={ev("PHONE_CLICK")} className="btn btn-outline">Call {formatMyPhone(branch.phone)}</TrackedLink>}
          {branch.whatsapp && <TrackedLink href={`https://wa.me/${branch.whatsapp}`} target="_blank" rel="noopener noreferrer" event={ev("WHATSAPP_CLICK")} className="btn btn-outline">WhatsApp</TrackedLink>}
          {website && <TrackedLink href={website} target="_blank" rel="noopener noreferrer nofollow" event={ev("WEBSITE_CLICK")} className="btn btn-outline">Website</TrackedLink>}
        </div>
      </header>

      {!claimed && (
        <aside className="mt-6 rounded-2xl border border-line bg-white p-4 text-sm">
          <p className="font-bold">This listing hasn’t been claimed yet.</p>
          <p className="mt-1 text-muted">
            Name and address come from public information and haven’t been verified by the business. We haven’t verified opening hours, phone number, prices or stock, and this is not the business’s official page.
          </p>
          <Link href={`/business/claim?business=${business.id}`} className="mt-2 inline-block font-semibold text-pandan-700 underline">Own or manage this shop? Claim this listing →</Link>
        </aside>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section aria-labelledby="loc">
            <h2 id="loc" className="mb-3 text-xl font-extrabold">Location</h2>
            <MapEmbed address={`${branch.addressLine}, ${branch.postcode} ${branch.city}, Malaysia`} title={`${business.name} ${branch.branchName}`} />
          </section>

          <section aria-labelledby="hours">
            <h2 id="hours" className="mb-3 text-xl font-extrabold">Opening hours</h2>
            {hours ? (
              <table className="w-full max-w-md text-sm">
                <tbody>
                  {DAY_KEYS.map((d) => (
                    <tr key={d} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-semibold">{DAY_LABELS[d]}</th>
                      <td className="py-2">{hours[d]?.length ? hours[d]!.map((r) => `${r.open}–${r.close}`).join(", ") : "Closed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-muted">Opening hours haven’t been verified. Please call or message the shop before visiting.</p>
            )}
          </section>

          <section aria-labelledby="cats">
            <h2 id="cats" className="mb-3 text-xl font-extrabold">What kind of shop is this?</h2>
            <p className="flex flex-wrap gap-2">
              {branch.categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-full border border-pandan-200 bg-pandan-50 px-3 py-1 text-sm font-semibold text-pandan-800 hover:bg-pandan-100">{c.name}</Link>)}
            </p>
            {productCats.length > 0 && (
              <>
                <p className="mt-4 text-sm text-muted">Shops of this type usually sell the following. <strong>We haven’t verified what this branch stocks today</strong> — call ahead for a specific item.</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {productCats.map((c) => <li key={c.slug}><Link href={`/categories/${c.slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-sm hover:border-pandan-600"><span aria-hidden="true">{c.emoji}</span>{c.name}</Link></li>)}
                </ul>
              </>
            )}
          </section>

          {offerings.length > 0 && (
            <section aria-labelledby="products">
              <h2 id="products" className="mb-3 text-xl font-extrabold">Products listed by the business</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                {offerings.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <Link href={`/products/${o.product.slug}`} className="font-semibold text-pandan-800 hover:underline">{o.product.name}</Link>
                    <span className="text-muted">{o.priceSen != null ? `${formatMyr(o.priceSen)}${o.priceUnit ? ` ${o.priceUnit}` : ""}${o.priceUpdatedAt ? ` · as of ${formatDate(o.priceUpdatedAt)}` : ""}` : "Price not listed"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Supplied by the business. Prices and availability can change — confirm with the shop.</p>
            </section>
          )}

          <section aria-labelledby="deals">
            <h2 id="deals" className="mb-3 text-xl font-extrabold">Deals</h2>
            {deals.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">{deals.map((d) => <DealCard key={d.id} deal={{ ...d, business: { name: business.name, slug: business.slug }, branch: d.branchId ? { slug, branchName: branch.branchName } : null }} />)}</div>
            ) : (
              <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-muted">No approved deals for this store right now.</p>
            )}
          </section>

          <section aria-labelledby="reviews">
            <h2 id="reviews" className="mb-3 text-xl font-extrabold">Reviews</h2>
            {branch.reviews.length > 0 ? (
              <ul className="space-y-3">
                {branch.reviews.map((r) => (
                  <li key={r.id} className="card p-4 text-sm">
                    <p className="font-semibold"><span className="text-turmeric-500" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}</span> {r.user.name.split(" ")[0]} <span className="font-normal text-muted">· {formatDate(r.createdAt)}</span></p>
                    <p className="mt-1 whitespace-pre-line">{r.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No reviews yet. Ratings on BekuSegar only come from reviews checked by our team — we don’t copy ratings from other sites.</p>
            )}
            <details className="card mt-4 p-4">
              <summary className="cursor-pointer text-sm font-bold">Write a review</summary>
              <div className="mt-3"><ReviewForm action={reviewAction} branchId={branch.id} next={path} /></div>
            </details>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-4" aria-labelledby="contact">
            <h2 id="contact" className="text-lg font-extrabold">Contact</h2>
            <dl className="mt-2 space-y-2 text-sm">
              <div><dt className="font-semibold">Address</dt><dd className="text-muted">{address}</dd></div>
              <div><dt className="font-semibold">Phone</dt><dd className="text-muted">{branch.phone ? formatMyPhone(branch.phone) : "Not listed yet"}</dd></div>
              {branch.email && <div><dt className="font-semibold">Email</dt><dd className="text-muted">{branch.email}</dd></div>}
            </dl>
          </section>

          {claimed ? (
            <section className="card p-4" aria-labelledby="enquiry">
              <h2 id="enquiry" className="text-lg font-extrabold">Request a quotation</h2>
              <p className="mb-3 mt-1 text-sm text-muted">Buying in bulk or for an event? Send a message to {business.name}.</p>
              <LeadForm action={leadAction} businessId={business.id} branchId={branch.id} businessName={business.name} sourcePath={path} />
            </section>
          ) : (
            <section className="card p-4" aria-labelledby="claim">
              <h2 id="claim" className="text-lg font-extrabold">Is this your business?</h2>
              <p className="mb-3 mt-1 text-sm text-muted">Claim it for free to add hours, phone and WhatsApp, post deals and receive enquiries.</p>
              <Link href={`/business/claim?business=${business.id}`} className="btn btn-accent w-full">Claim this listing</Link>
            </section>
          )}

          {otherBranches.length > 0 && (
            <section className="card p-4" aria-labelledby="other">
              <h2 id="other" className="text-lg font-extrabold">Other branches</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {otherBranches.map((b) => <li key={b.id}><Link href={`/stores/${b.slug}`} className="text-pandan-700 hover:underline">{b.branchName}</Link> <span className="text-muted">· {b.city}</span></li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {nearby.length > 0 && (
        <section aria-labelledby="nearby" className="mt-12">
          <h2 id="nearby" className="mb-1 text-xl font-extrabold">Nearby stores</h2>
          <p className="mb-4 text-sm text-muted">Straight-line distance from this shop’s area (approximate).</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((s) => <StoreCard key={s.id} store={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}
