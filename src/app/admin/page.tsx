import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/services/analytics";

export default async function AdminHome() {
  await requireAdminPage();
  const [claims, deals, reviews, photos, leads, businesses, branches, unclaimed, stats] = await Promise.all([
    db.businessClaim.count({ where: { status: "PENDING" } }), db.deal.count({ where: { status: "PENDING" } }), db.review.count({ where: { status: "PENDING" } }),
    db.photo.count({ where: { status: "PENDING" } }), db.lead.count({ where: { status: "NEW" } }), db.business.count(), db.branch.count(),
    db.business.count({ where: { claimStatus: "UNCLAIMED" } }), getAdminStats(30),
  ]);
  const queue: [string, number, string][] = [["Claims to review", claims, "claims?status=PENDING"], ["Deals to approve", deals, "deals?status=PENDING"], ["Reviews to approve", reviews, "reviews?status=PENDING"], ["Photos to approve", photos, "photos?status=PENDING"], ["New leads", leads, "leads?status=NEW"]];
  const t = stats.byType;
  return (
    <div className="space-y-8">
      <section aria-labelledby="q"><h2 id="q" className="mb-3 text-lg font-extrabold">Needs attention</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {queue.map(([label, n, href]) => <Link key={label} href={`/admin/${href}`} className={`card p-4 hover:border-pandan-600 ${n > 0 ? "ring-2 ring-turmeric-400" : ""}`}><p className="text-3xl font-black">{n}</p><p className="text-xs text-muted">{label}</p></Link>)}
        </div>
      </section>
      <section aria-labelledby="d"><h2 id="d" className="mb-3 text-lg font-extrabold">Directory</h2>
        <p className="text-sm text-muted">{businesses} businesses · {branches} branches · {unclaimed} unclaimed</p></section>
      <section aria-labelledby="a"><h2 id="a" className="mb-3 text-lg font-extrabold">Last 30 days <Link href="/admin/analytics" className="ml-2 text-sm font-semibold text-pandan-700 underline">Full analytics</Link></h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([["Unique visitors", stats.uniqueVisitors], ["Page views", t.PAGE_VIEW ?? 0], ["Searches", t.SEARCH ?? 0], ["Store views", t.STORE_VIEW ?? 0]] as [string, number][]).map(([l, n]) => <div key={l} className="card p-4"><p className="text-2xl font-black">{n}</p><p className="text-xs text-muted">{l}</p></div>)}
        </div></section>
    </div>
  );
}
