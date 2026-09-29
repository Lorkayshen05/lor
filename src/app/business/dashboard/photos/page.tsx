import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/forms";
import { Badge } from "@/components/Badge";
import { uploadPhotoAction } from "@/app/actions/business";
import { uploadsEnabled } from "@/lib/storage";

export const metadata: Metadata = { title: "Photos", robots: { index: false, follow: false } };

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const { business } = ctx;
  const photos = await db.photo.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
  return (
    <DashboardShell ctx={ctx} active="/photos" title="Photos">
      {uploadsEnabled() ? (
        <section className="card p-5" aria-labelledby="up">
          <h2 id="up" className="mb-3 text-lg font-extrabold">Upload a photo</h2>
          <ActionForm action={uploadPhotoAction.bind(null, business.id)} encType="multipart/form-data" submitLabel="Upload" resetOnSuccess testId="photo-form">
            <Field label="Image (JPEG, PNG or WebP, up to 5 MB)" name="photo"><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" required /></Field>
            <Field label="Describe the photo" name="alt" hint="Used as alt text, e.g. “Frozen meat display at the Sri Petaling branch”."><input id="alt" name="alt" className="input" required minLength={3} maxLength={140} /></Field>
            <Field label="Branch" name="branchId"><select id="branchId" name="branchId" className="input" defaultValue=""><option value="">General</option>{business.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Only upload photos you own or have permission to use. Photos appear after admin approval.</p>
        </section>
      ) : <p className="card p-5 text-sm text-muted">Photo uploads are not enabled on this deployment yet.</p>}
      <section className="mt-6" aria-labelledby="list">
        <h2 id="list" className="mb-3 text-lg font-extrabold">Your photos</h2>
        {photos.length === 0 ? <p className="card p-5 text-sm text-muted">No photos yet.</p> : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="p-2 text-xs"><Badge variant={p.status === "APPROVED" ? "open" : p.status === "REJECTED" ? "closed" : "unknown"}>{p.status.toLowerCase()}</Badge></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
