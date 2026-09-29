import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Badge } from "@/components/Badge";
import { setLeadStatusAction } from "@/app/actions/business";
import { formatDate, formatMyPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads", robots: { index: false, follow: false } };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const leads = await db.lead.findMany({ where: { businessId: ctx.business.id }, orderBy: { createdAt: "desc" }, include: { branch: { select: { branchName: true } } }, take: 100 });
  return (
    <DashboardShell ctx={ctx} active="/leads" title="Leads">
      <p className="mb-4 max-w-2xl text-sm text-muted">Enquiries and quotation requests from shoppers. Reply by phone, WhatsApp or email, then mark the status.</p>
      {leads.length === 0 ? <p className="card p-6 text-sm text-muted" data-testid="no-leads">No enquiries yet. Complete your profile and post deals to attract them.</p> : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="card p-4 text-sm" data-testid="lead">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{l.name}</strong><Badge variant={l.status === "NEW" ? "featured" : l.status === "CONTACTED" ? "neutral" : "unknown"}>{l.status.toLowerCase()}</Badge>
                <Badge variant="neutral">{l.type === "QUOTATION" ? "Quotation" : "Question"}</Badge>
                <span className="text-muted">{formatDate(l.createdAt)}{l.branch && ` · ${l.branch.branchName}`}</span>
              </div>
              <p className="mt-2 whitespace-pre-line">{l.message}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted">
                {l.phone && <a className="font-semibold text-pandan-700 underline" href={`tel:+${l.phone}`}>{formatMyPhone(l.phone)}</a>}
                {l.phone && <a className="font-semibold text-pandan-700 underline" href={`https://wa.me/${l.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                {l.email && <a className="font-semibold text-pandan-700 underline" href={`mailto:${l.email}`}>{l.email}</a>}
              </p>
              <div className="mt-3 flex gap-2">
                {(["NEW", "CONTACTED", "CLOSED"] as const).filter((s) => s !== l.status).map((s) => (
                  <form key={s} action={setLeadStatusAction.bind(null, l.id, s)}><button className="btn btn-outline btn-sm">Mark {s.toLowerCase()}</button></form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
