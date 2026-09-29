import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/forms";
import { Badge } from "@/components/Badge";
import { submitDealAction } from "@/app/actions/business";
import { formatDate, formatMyr } from "@/lib/utils";

export const metadata: Metadata = { title: "Deals", robots: { index: false, follow: false } };

const STATUS = { PENDING: "unknown", APPROVED: "open", REJECTED: "closed" } as const;

export default async function DealsDashboard({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const { business } = ctx;
  const [deals, products] = await Promise.all([
    db.deal.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, include: { branch: true }, take: 50 }),
    db.product.findMany({ where: { isPublished: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <DashboardShell ctx={ctx} active="/deals" title="Deals">
      <p className="mb-4 max-w-2xl text-sm text-muted">Submit a real promotion with an accurate price and dates. Our team approves deals before they appear on the site (dates are in Malaysia time).</p>
      <section className="card p-5" aria-labelledby="new">
        <h2 id="new" className="mb-3 text-lg font-extrabold">Submit a deal</h2>
        <ActionForm action={submitDealAction.bind(null, business.id)} submitLabel="Submit for approval" resetOnSuccess testId="deal-form">
          <Field label="Title" name="title"><input id="title" name="title" className="input" required maxLength={120} placeholder="Chicken breast – weekend special" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Branch" name="branchId"><select id="branchId" name="branchId" className="input" defaultValue=""><option value="">All branches</option>{business.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
            <Field label="Product (optional)" name="productId"><select id="productId" name="productId" className="input" defaultValue=""><option value="">—</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Deal price (RM)" name="priceRm"><input id="priceRm" name="priceRm" className="input" inputMode="decimal" /></Field>
            <Field label="Normal price (RM)" name="originalPriceRm"><input id="originalPriceRm" name="originalPriceRm" className="input" inputMode="decimal" /></Field>
            <Field label="Per…" name="priceUnit"><input id="priceUnit" name="priceUnit" className="input" placeholder="per kg" maxLength={30} /></Field>
            <span />
            <Field label="Starts" name="startsAt"><input id="startsAt" name="startsAt" type="datetime-local" className="input" required /></Field>
            <Field label="Ends" name="endsAt"><input id="endsAt" name="endsAt" type="datetime-local" className="input" required /></Field>
          </div>
          <Field label="Details (optional)" name="description"><textarea id="description" name="description" className="input" rows={2} maxLength={1000} /></Field>
        </ActionForm>
      </section>
      <section className="mt-6" aria-labelledby="list">
        <h2 id="list" className="mb-3 text-lg font-extrabold">Your deals</h2>
        {deals.length === 0 ? <p className="card p-5 text-sm text-muted">No deals yet.</p> : (
          <ul className="space-y-2">
            {deals.map((d) => (
              <li key={d.id} className="card p-4 text-sm" data-testid="my-deal">
                <div className="flex flex-wrap items-center gap-2"><strong>{d.title}</strong><Badge variant={STATUS[d.status]}>{d.status.toLowerCase()}</Badge></div>
                <p className="mt-1 text-muted">{d.branch?.branchName ?? "All branches"} · {formatDate(d.startsAt)} → {formatDate(d.endsAt)}{d.priceSen != null && ` · ${formatMyr(d.priceSen)}`}</p>
                {d.rejectionReason && <p className="mt-1 text-chili-700">Rejected: {d.rejectionReason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
