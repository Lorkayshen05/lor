import Link from "next/link";
import type { StoreCard as Store } from "@/lib/queries/stores";
import { formatDistance } from "@/lib/geo";
import { Badge } from "./Badge";
import { Stars } from "./Stars";
import { TrackedLink } from "./TrackedLink";

export function StoreCard({ store, headingLevel = 3 }: { store: Store; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const dollars = store.priceLevel ? "$".repeat(store.priceLevel) : null;
  const ev = (type: "DIRECTIONS_CLICK" | "PHONE_CLICK" | "WHATSAPP_CLICK") => ({ type, branchId: store.id });
  return (
    <article className="card flex h-full flex-col p-4" data-testid="store-card">
      <div className="flex flex-wrap items-center gap-1.5">
        {store.sponsored && <Badge variant="sponsored" title="Paid placement">Sponsored</Badge>}
        {store.featured && !store.sponsored && <Badge variant="featured" title="Paid listing upgrade">★ Featured</Badge>}
        {store.status.state !== "unknown" && <Badge variant={store.status.state}>{store.status.label}</Badge>}
        {!store.claimed && <Badge variant="unclaimed" title="Details compiled from public information; not verified by the business">Unclaimed</Badge>}
      </div>
      <H className="mt-2 text-lg font-extrabold leading-snug">
        <Link href={`/stores/${store.slug}`} className="hover:text-pandan-700">
          {store.businessName} <span className="text-pandan-700">| {store.branchName}</span>
        </Link>
      </H>
      {store.businessNameAlt && <p className="text-xs text-muted">{store.businessNameAlt}</p>}
      <p className="mt-2 text-sm text-muted">
        <span aria-hidden="true">📍</span> {store.area.name}, {store.location}
        {store.distanceKm != null && <span className="ml-2 font-semibold text-ink">{formatDistance(store.distanceKm)} away</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {store.categories.map((c) => (
          <Link key={c.slug} href={`/categories/${c.slug}`} className="text-pandan-700 hover:underline">{c.name}</Link>
        ))}
        {dollars && <span className="text-muted" title="Price level (owner-reported)">{dollars}</span>}
        {store.rating && <Stars avg={store.rating.avg} count={store.rating.count} />}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
        <Link href={`/stores/${store.slug}`} className="btn btn-primary btn-sm col-span-2 sm:col-span-1">View store</Link>
        <TrackedLink href={store.directionsUrl} target="_blank" rel="noopener noreferrer" event={ev("DIRECTIONS_CLICK")} className="btn btn-outline btn-sm">Directions</TrackedLink>
        {store.phone && <TrackedLink href={`tel:+${store.phone}`} event={ev("PHONE_CLICK")} className="btn btn-outline btn-sm">Call</TrackedLink>}
        {store.whatsapp && (
          <TrackedLink href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener noreferrer" event={ev("WHATSAPP_CLICK")} className="btn btn-outline btn-sm">WhatsApp</TrackedLink>
        )}
      </div>
    </article>
  );
}
