import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getBusinessStats } from "@/lib/services/analytics";
import { hasVerifiedHours } from "@/lib/hours";

export const metadata: Metadata = { title: "Business dashboard", robots: { index: false, follow: false } };

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const { business } = ctx;
  const [stats, newLeads, pendingDeals, activeDeals] = await Promise.all([
    getBusinessStats(business.id, 30),
    db.lead.count({ where: { businessId: business.id, status: "NEW" } }),
    db.deal.count({ where: { businessId: business.id, status: "PENDING" } }),
    db.deal.count({ where: { businessId: business.id, status: "APPROVED", endsAt: { gte: new Date() } } }),
  ]);
  const t = stats.totals;
  const cards: [string, number][] = [["Store views", t.STORE_VIEW], ["Direction clicks", t.DIRECTIONS_CLICK], ["Calls", t.PHONE_CLICK], ["WhatsApp clicks", t.WHATSAPP_CLICK], ["Website clicks", t.WEBSITE_CLICK], ["Enquiries", t.LEADS]];
  const todo = business.branches.flatMap((b) => [
    !b.phone && `${b.branchName}: add a phone number`,
    !b.whatsapp && `${b.branchName}: add WhatsApp`,
    !hasVerifiedHours(b.openingHours, b.hoursVerifiedAt) && `${b.branchName}: add opening hours`,
  ]).filter(Boolean) as string[];

  return (
    <DashboardShell ctx={ctx} active="" title="Overview">
      <section aria-labelledby="last30">
        <h2 id="last30" className="mb-3 text-lg font-extrabold">Last 30 days</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map(([label, n]) => <div key={label} className="card p-4"><p className="text-2xl font-black" data-testid="stat-value">{n}</p><p className="text-xs text-muted">{label}</p></div>)}
        </div>
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="todo">
          <h2 id="todo" className="text-lg font-extrabold">Complete your profile</h2>
          {todo.length ? (
            <><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{todo.map((x) => <li key={x}>{x}</li>)}</ul><Link href={`/business/dashboard/profile?b=${business.id}`} className="btn btn-primary btn-sm mt-3">Edit profile</Link></>
          ) : <p className="mt-2 text-sm text-muted">Everything is filled in. 🎉</p>}
        </section>
        <section className="card p-5" aria-labelledby="activity">
          <h2 id="activity" className="text-lg font-extrabold">Activity</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link className="font-semibold text-pandan-700 underline" href={`/business/dashboard/leads?b=${business.id}`}>{newLeads} new {newLeads === 1 ? "enquiry" : "enquiries"}</Link></li>
            <li>{activeDeals} live {activeDeals === 1 ? "deal" : "deals"}, {pendingDeals} awaiting approval</li>
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
