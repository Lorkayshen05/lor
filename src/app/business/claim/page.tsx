import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClaimForm } from "@/components/forms";
import { claimAction } from "@/app/actions/public";

export const metadata: Metadata = { title: "Claim your business listing", description: "Claim a listing to add hours, contact details, products and deals.", alternates: { canonical: "/business/claim" } };

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const { business: businessId } = await searchParams;
  const session = await getSession();
  const selected = businessId
    ? await db.business.findFirst({ where: { id: businessId, isPublished: true }, include: { branches: { select: { branchName: true }, orderBy: { branchName: "asc" } } } })
    : null;
  const candidates = selected ? [] : await db.business.findMany({ where: { isPublished: true, claimStatus: "UNCLAIMED" }, include: { _count: { select: { branches: true } } }, orderBy: { name: "asc" }, take: 50 });
  const here = `/business/claim${selected ? `?business=${selected.id}` : ""}`;

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "For businesses", href: "/business" }, { name: "Claim a listing", href: "/business/claim" }]} />
      <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Claim your business listing</h1>

      {!selected ? (
        <section className="mt-6 max-w-2xl">
          <p className="text-muted">Choose your business. Not listed? Email us and we’ll add it.</p>
          <ul className="mt-4 space-y-2">
            {candidates.map((b) => (
              <li key={b.id}><Link href={`/business/claim?business=${b.id}`} className="card flex items-center justify-between p-4 hover:border-pandan-600"><span><strong>{b.name}</strong>{b.nameAlt && <span className="block text-sm text-muted">{b.nameAlt}</span>}</span><span className="text-sm text-muted">{b._count.branches} {b._count.branches === 1 ? "branch" : "branches"} →</span></Link></li>
            ))}
            {candidates.length === 0 && <li className="card p-4 text-sm text-muted">All listed businesses have been claimed.</li>}
          </ul>
        </section>
      ) : selected.claimStatus === "CLAIMED" ? (
        <p className="card mt-6 max-w-xl p-5 text-sm">This listing has already been claimed. If you believe this is a mistake, contact us.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="card p-5 lg:col-span-2">
            <h2 className="text-lg font-extrabold">{selected.name}</h2>
            <p className="text-sm text-muted">{selected.nameAlt} · {selected.branches.length} branches</p>
            {session ? (
              <div className="mt-4"><ClaimForm action={claimAction} businessId={selected.id} defaultName={session.name} defaultEmail={session.email} /></div>
            ) : (
              <div className="mt-4 rounded-xl bg-pandan-50 p-4 text-sm">
                <p className="font-semibold">Log in or create a free account to submit your claim.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Link className="btn btn-primary" href={`/register?next=${encodeURIComponent(here)}`}>Create account</Link>
                  <Link className="btn btn-outline" href={`/login?next=${encodeURIComponent(here)}`}>Log in</Link>
                </div>
              </div>
            )}
          </section>
          <aside className="card h-fit p-5 text-sm">
            <h2 className="font-extrabold">What happens next</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted"><li>We review your claim and call the shop.</li><li>Once approved, your dashboard unlocks.</li><li>Add hours, contact details, products and deals.</li></ol>
            <p className="mt-3 text-xs text-muted">Claiming is free. We may ask for proof such as a business registration or a call to the shop’s number.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
