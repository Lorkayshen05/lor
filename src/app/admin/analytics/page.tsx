import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/services/analytics";

export const metadata: Metadata = { title: "Analytics" };

const LABELS: [string, string][] = [
  ["PAGE_VIEW", "Page views"], ["SEARCH", "Searches"], ["STORE_VIEW", "Store views"], ["DIRECTIONS_CLICK", "Directions clicks"], ["PHONE_CLICK", "Phone clicks"],
  ["WHATSAPP_CLICK", "WhatsApp clicks"], ["WEBSITE_CLICK", "Website clicks"], ["CLAIM_SUBMITTED", "Business claims"], ["LEAD_SUBMITTED", "Lead submissions"],
  ["SPONSORED_CLICK", "Sponsored clicks"], ["AD_CLICK", "Ad clicks"],
];

export default async function AdminAnalytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminPage();
  const d = Number((await searchParams).days);
  const days = [7, 30, 90].includes(d) ? d : 30;
  const s = await getAdminStats(days);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">Analytics — last {days} days</h2>
        <p className="flex gap-2">{[7, 30, 90].map((n) => <Link key={n} href={`/admin/analytics?days=${n}`} className={`btn btn-sm ${n === days ? "btn-primary" : "btn-outline"}`}>{n}d</Link>)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="card p-4"><p className="text-3xl font-black">{s.uniqueVisitors}</p><p className="text-sm text-muted">Approx. unique visitors</p></div>
        {LABELS.map(([k, l]) => <div key={k} className="card p-4"><p className="text-3xl font-black">{s.byType[k as keyof typeof s.byType] ?? 0}</p><p className="text-sm text-muted">{l}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="terms"><h3 id="terms" className="font-extrabold">Top search terms</h3>
          {s.topSearches.length ? <ol className="mt-2 space-y-1 text-sm">{s.topSearches.map((t) => <li key={t.term} className="flex justify-between"><span>{t.term}</span><span className="text-muted">{t.count}</span></li>)}</ol> : <p className="mt-2 text-sm text-muted">No searches yet.</p>}</section>
        <section className="card p-5" aria-labelledby="top"><h3 id="top" className="font-extrabold">Most viewed stores</h3>
          {s.topStores.length ? <ol className="mt-2 space-y-1 text-sm">{s.topStores.map((t) => <li key={t.branchId} className="flex justify-between gap-3"><span>{t.label}</span><span className="text-muted">{t.views}</span></li>)}</ol> : <p className="mt-2 text-sm text-muted">No store views yet.</p>}</section>
      </div>
      <p className="text-xs text-muted">Bots are excluded. Unique visitors use a daily-rotating anonymous hash, so multi-day totals over-count returning visitors.</p>
    </div>
  );
}
