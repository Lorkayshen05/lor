import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { tierLabel } from "@/lib/plans";
import type { DashboardContext } from "@/lib/dashboard";
import { Badge } from "@/components/Badge";

const TABS = [
  ["", "Overview"], ["/profile", "Profile"], ["/products", "Products"], ["/deals", "Deals"],
  ["/leads", "Leads"], ["/analytics", "Analytics"], ["/photos", "Photos"], ["/subscription", "Plan"],
] as const;

export function DashboardShell({ ctx, active, title, children }: { ctx: DashboardContext; active: string; title: string; children: React.ReactNode }) {
  const { business, businesses, tier, session } = ctx;
  const q = `?b=${business.id}`;
  return (
    <div className="container-page py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Business dashboard</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{business.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted"><Badge variant={tier === "FREE" ? "neutral" : "featured"}>{tierLabel(tier)} plan</Badge> {session.email}</p>
        </div>
        <form action={logoutAction}><button className="btn btn-outline btn-sm">Log out</button></form>
      </div>
      {businesses.length > 1 && (
        <p className="mt-3 flex flex-wrap gap-2 text-sm">
          {businesses.map((b) => <Link key={b.id} href={`/business/dashboard${active}?b=${b.id}`} className={`rounded-full border px-3 py-1 ${b.id === business.id ? "border-pandan-600 bg-pandan-50 font-semibold" : "border-line bg-white"}`}>{b.name}</Link>)}
        </p>
      )}
      <nav aria-label="Dashboard" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map(([href, label]) => (
            <li key={label}><Link href={`/business/dashboard${href}${q}`} aria-current={active === href ? "page" : undefined} className={`block border-b-2 px-3 py-2.5 text-sm font-semibold ${active === href ? "border-pandan-700 text-pandan-800" : "border-transparent text-muted hover:text-ink"}`}>{label}</Link></li>
          ))}
        </ul>
      </nav>
      <h2 className="sr-only">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}
