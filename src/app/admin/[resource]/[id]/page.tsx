import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guards";
import { getRow } from "@/lib/admin/engine";
import { getResource } from "@/lib/admin/resources";
import { AdminFields } from "@/components/admin/AdminFields";
import { ActionForm } from "@/components/ActionForm";
import { deleteResourceAction, saveResourceAction } from "@/app/actions/admin";

export default async function EditResource({ params }: { params: Promise<{ resource: string; id: string }> }) {
  await requireAdminPage();
  const { resource, id } = await params;
  if (!getResource(resource)) notFound();
  const { def, row } = await getRow(resource, id);
  if (!row || def.canEdit === false || def.fields.length === 0) notFound();
  return (
    <div>
      <p className="mb-2 text-sm"><Link href={`/admin/${def.key}`} className="text-pandan-700 underline">← {def.label}</Link></p>
      <h2 className="mb-4 text-xl font-extrabold">Edit {def.singular}</h2>
      <div className="card p-5">
        <ActionForm action={saveResourceAction.bind(null, def.key, id)} submitLabel="Save changes" testId="admin-form">
          <AdminFields fields={def.fields} row={row} />
        </ActionForm>
      </div>
      {def.canDelete && (
        <details className="mt-6 rounded-xl border border-chili-100 bg-chili-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-chili-700">Delete this {def.singular}…</summary>
          <p className="mt-2 text-sm text-chili-700">This permanently deletes the record{def.key === "businesses" ? " and ALL its branches, deals, leads, photos and subscription" : def.key === "branches" ? " and its deals, reviews and photos" : ""}. It can’t be undone.</p>
          <form action={deleteResourceAction.bind(null, def.key, id)} className="mt-3"><button className="btn btn-accent btn-sm">Yes, delete permanently</button></form>
        </details>
      )}
    </div>
  );
}
