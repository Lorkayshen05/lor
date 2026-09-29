import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { RESOURCES } from "@/lib/admin/resources";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const [claims, deals, reviews, photos, leads] = await Promise.all([
    db.businessClaim.count({ where: { status: "PENDING" } }), db.deal.count({ where: { status: "PENDING" } }),
    db.review.count({ where: { status: "PENDING" } }), db.photo.count({ where: { status: "PENDING" } }), db.lead.count({ where: { status: "NEW" } }),
  ]);
  const badge: Record<string, number> = { claims, deals, reviews, photos, leads };
  const groups = ["Moderation", "Directory", "Growth", "People"] as const;
  return (
    <div className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">Admin</h1>
        <p className="flex items-center gap-3 text-sm text-muted">{admin.email}<form action={logoutAction}><button className="btn btn-outline btn-sm">Log out</button></form></p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Admin" className="lg:sticky lg:top-20 lg:self-start">
          <details className="lg:hidden card p-3" open><summary className="cursor-pointer text-sm font-bold">Sections</summary><NavList groups={groups} badge={badge} /></details>
          <div className="hidden lg:block"><NavList groups={groups} badge={badge} /></div>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function NavList({ groups, badge }: { groups: readonly string[]; badge: Record<string, number> }) {
  return (
    <div className="mt-2 space-y-4 text-sm">
      <ul><li><Link href="/admin" className="block rounded px-2 py-1.5 font-semibold hover:bg-pandan-50">Overview</Link></li><li><Link href="/admin/analytics" className="block rounded px-2 py-1.5 font-semibold hover:bg-pandan-50">Analytics</Link></li></ul>
      {groups.map((g) => (
        <div key={g}>
          <p className="px-2 text-xs font-bold uppercase tracking-wide text-muted">{g}</p>
          <ul>{RESOURCES.filter((r) => r.group === g).map((r) => (
            <li key={r.key}><Link href={`/admin/${r.key}`} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-pandan-50">{r.label}{badge[r.key] > 0 && <span className="rounded-full bg-chili-600 px-1.5 text-xs font-bold text-white">{badge[r.key]}</span>}</Link></li>
          ))}</ul>
        </div>
      ))}
    </div>
  );
}
