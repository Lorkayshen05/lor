import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guards";
import { getPath, listResource } from "@/lib/admin/engine";
import { getResource, type Column } from "@/lib/admin/resources";
import { rowAction } from "@/app/actions/admin";
import { Badge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { formatDate, formatMyr } from "@/lib/utils";

type SP = { q?: string; status?: string; page?: string; saved?: string; deleted?: string; done?: string; error?: string };

function cell(col: Column, row: Record<string, unknown>) {
  const v = getPath(row, col.path);
  if (v == null || v === "") return <span className="text-muted">—</span>;
  switch (col.format) {
    case "date": return formatDate(v as Date);
    case "money": return formatMyr(v as number);
    case "bool": return v ? "Yes" : "No";
    case "badge": return <Badge variant={v === "APPROVED" || v === "CLAIMED" || v === "ACTIVE" ? "open" : v === "REJECTED" || v === "CANCELED" ? "closed" : "neutral"}>{String(v).toLowerCase()}</Badge>;
    case "trunc": return <span title={String(v)}>{String(v).slice(0, 70)}{String(v).length > 70 ? "…" : ""}</span>;
    default: return col.path === "url" ? <a className="text-pandan-700 underline" href={String(v)} target="_blank" rel="noopener noreferrer">view</a> : String(v);
  }
}

export default async function ResourceList({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<SP> }) {
  await requireAdminPage();
  const { resource } = await params;
  if (!getResource(resource)) notFound();
  const sp = await searchParams;
  const { def, rows, total, page, pageCount } = await listResource(resource, { q: sp.q, status: sp.status, page: Number(sp.page) || 1 });
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, ...over }).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    return `/admin/${def.key}${p.size ? `?${p}` : ""}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{def.label} <span className="text-base font-medium text-muted">({total})</span></h2>
        {def.canCreate && <Link href={`/admin/${def.key}/new`} className="btn btn-primary btn-sm">+ New {def.singular}</Link>}
      </div>
      {sp.saved && <p role="status" className="mb-3 rounded-lg bg-pandan-100 px-3 py-2 text-sm text-pandan-900">Saved.</p>}
      {sp.deleted && <p role="status" className="mb-3 rounded-lg bg-pandan-100 px-3 py-2 text-sm text-pandan-900">Deleted.</p>}
      {sp.done && <p role="status" className="mb-3 rounded-lg bg-pandan-100 px-3 py-2 text-sm text-pandan-900">Done: {sp.done}.</p>}
      {sp.error && <p role="alert" className="mb-3 rounded-lg bg-chili-50 px-3 py-2 text-sm text-chili-700">{sp.error}</p>}

      {(def.search || def.statusFilter) && (
        <form className="mb-4 flex flex-wrap gap-2" action={`/admin/${def.key}`}>
          {def.search && <input name="q" defaultValue={sp.q} placeholder="Search…" className="input max-w-xs" />}
          {def.statusFilter && (
            <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[12rem]" aria-label="Filter by status">
              <option value="">All statuses</option>
              {def.statusFilter.options.map((o) => <option key={o} value={o}>{o.toLowerCase()}</option>)}
            </select>
          )}
          <button className="btn btn-outline btn-sm">Filter</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">{def.columns.map((c) => <th key={c.label} className="px-3 py-2">{c.label}</th>)}<th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-b border-line last:border-0 align-top" data-testid="admin-row">
                {def.columns.map((c) => <td key={c.label} className="px-3 py-2">{cell(c, row)}</td>)}
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {def.canEdit !== false && def.fields.length > 0 && <Link className="btn btn-outline btn-sm" href={`/admin/${def.key}/${row.id}`}>Edit</Link>}
                    {def.rowActions?.filter((a) => !a.show || a.show(row)).map((a) => (
                      <form key={a.key} action={rowAction.bind(null, def.key, String(row.id), a.key)}><button className={`btn btn-sm ${a.key === "approve" ? "btn-primary" : "btn-outline"}`}>{a.label}</button></form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={def.columns.length + 1} className="px-3 py-8 text-center text-muted">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => qs({ page: p })} />
    </div>
  );
}
