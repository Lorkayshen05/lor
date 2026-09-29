import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guards";
import { getResource } from "@/lib/admin/resources";
import { AdminFields } from "@/components/admin/AdminFields";
import { ActionForm } from "@/components/ActionForm";
import { saveResourceAction } from "@/app/actions/admin";

export default async function NewResource({ params }: { params: Promise<{ resource: string }> }) {
  await requireAdminPage();
  const def = getResource((await params).resource);
  if (!def || !def.canCreate) notFound();
  return (
    <div>
      <p className="mb-2 text-sm"><Link href={`/admin/${def.key}`} className="text-pandan-700 underline">← {def.label}</Link></p>
      <h2 className="mb-4 text-xl font-extrabold">New {def.singular}</h2>
      <div className="card p-5">
        <ActionForm action={saveResourceAction.bind(null, def.key, "")} submitLabel={`Create ${def.singular}`} testId="admin-form">
          <AdminFields fields={def.fields} row={null} defaults={def.defaults} />
        </ActionForm>
      </div>
    </div>
  );
}
