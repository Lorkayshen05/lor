import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getBusinessStats } from "@/lib/services/analytics";
import { can } from "@/lib/plans";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const full = can(ctx.tier, "analytics_full") || ctx.session.role === "ADMIN";
  const s = await getBusinessStats(ctx.business.id, 30, full);
  const t = s.totals;
  const rows: [string, number][] = [["Store page views", t.STORE_VIEW], ["Direction clicks", t.DIRECTIONS_CLICK], ["Calls", t.PHONE_CLICK], ["WhatsApp clicks", t.WHATSAPP_CLICK], ["Website clicks", t.WEBSITE_CLICK], ["Enquiries (leads)", t.LEADS]];
  const max = Math.max(1, ...s.daily.map((d) => d.views));
  return (
    <DashboardShell ctx={ctx} active="/analytics" title="Analytics">
      <p className="mb-4 text-sm text-muted">Last 30 days. Bots are excluded; each click is counted once per tap.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map(([label, n]) => <div key={label} className="card p-4"><p className="text-3xl font-black">{n}</p><p className="text-sm text-muted">{label}</p></div>)}
      </div>
      {full ? (
        <>
          <section className="card mt-6 p-5" aria-labelledby="daily">
            <h2 id="daily" className="text-lg font-extrabold">Daily store views</h2>
            {s.daily.length === 0 ? <p className="mt-2 text-sm text-muted">No views recorded yet.</p> : (
              <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label="Bar chart of daily store views">
                {s.daily.map((d) => <div key={d.day} title={`${d.day}: ${d.views}`} className="flex-1 rounded-t bg-pandan-500" style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }} />)}
              </div>
            )}
          </section>
          <section className="card mt-6 p-5" aria-labelledby="branches">
            <h2 id="branches" className="text-lg font-extrabold">By branch</h2>
            <table className="mt-2 w-full text-sm"><thead><tr className="text-left text-muted"><th className="py-1">Branch</th><th>Views</th><th>Directions</th></tr></thead>
              <tbody>{s.byBranch.map((b) => <tr key={b.branchId} className="border-t border-line"><td className="py-2">{b.branchName}</td><td>{b.views}</td><td>{b.directions}</td></tr>)}</tbody></table>
          </section>
        </>
      ) : (
        <p className="mt-6 rounded-xl bg-turmeric-100 px-4 py-3 text-sm text-turmeric-700">Daily trends and per-branch breakdowns are part of the Premium plan. <Link className="font-semibold underline" href={`/business/dashboard/subscription?b=${ctx.business.id}`}>See plans</Link></p>
      )}
    </DashboardShell>
  );
}
