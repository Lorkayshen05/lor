import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/config/site";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Badge } from "@/components/Badge";
import { formatDate, formatMyr } from "@/lib/utils";
import { tierLabel } from "@/lib/plans";

export const metadata: Metadata = { title: "Your plan", robots: { index: false, follow: false } };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const { business, tier } = ctx;
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const sub = business.subscription;
  const contactHref = SITE.contactWhatsapp
    ? `https://wa.me/${SITE.contactWhatsapp}?text=${encodeURIComponent(`Hi, I'd like to upgrade ${business.name} on ${SITE.name}.`)}`
    : `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(`Upgrade ${business.name}`)}`;
  return (
    <DashboardShell ctx={ctx} active="/subscription" title="Plan">
      <section className="card p-5" aria-labelledby="cur">
        <h2 id="cur" className="text-lg font-extrabold">Current plan: {tierLabel(tier)}</h2>
        {sub ? <p className="mt-1 text-sm text-muted">Status: <Badge variant={sub.status === "ACTIVE" ? "open" : "unknown"}>{sub.status.toLowerCase()}</Badge>{sub.currentPeriodEnd && <> · renews/ends {formatDate(sub.currentPeriodEnd)}</>}</p> : <p className="mt-1 text-sm text-muted">You’re on the free listing. No payment is needed to keep it.</p>}
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Plans">
        {plans.map((p) => (
          <div key={p.id} className={`card p-5 ${p.tier === tier ? "ring-2 ring-pandan-600" : ""}`}>
            <h3 className="font-extrabold">{p.name} {p.tier === tier && <Badge variant="neutral">Current</Badge>}</h3>
            <p className="mt-1 text-2xl font-black">{p.priceSen === 0 ? "Free" : <>{formatMyr(p.priceSen)}<span className="text-sm font-semibold text-muted">/{p.interval}</span></>}</p>
            <ul className="mt-3 space-y-1.5 text-sm">{(Array.isArray(p.features) ? (p.features as string[]) : []).map((f) => <li key={f}>✓ {f}</li>)}</ul>
          </div>
        ))}
      </section>
      <p className="mt-6 text-sm text-muted">Upgrades are arranged with our team during launch — no online payment yet. <a className="font-semibold text-pandan-700 underline" href={contactHref}>Contact us to upgrade</a>. Paid placements are always labelled “Featured” or “Sponsored”.</p>
    </DashboardShell>
  );
}
