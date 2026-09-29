import type { Metadata } from "next";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/forms";
import { updateBranchAction, updateBusinessProfileAction } from "@/app/actions/business";
import { DAY_KEYS, DAY_LABELS, openingHoursSchema } from "@/lib/hours";
import { can } from "@/lib/plans";

export const metadata: Metadata = { title: "Edit profile", robots: { index: false, follow: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const { business, tier } = ctx;
  const promoOk = can(tier, "promo_description") || ctx.session.role === "ADMIN";
  return (
    <DashboardShell ctx={ctx} active="/profile" title="Profile">
      <section className="card p-5" aria-labelledby="biz">
        <h2 id="biz" className="mb-3 text-lg font-extrabold">Business details</h2>
        <ActionForm action={updateBusinessProfileAction.bind(null, business.id)} submitLabel="Save business details" testId="business-form">
          <Field label="Description" name="description"><textarea id="description" name="description" className="input" rows={3} maxLength={1500} defaultValue={business.description ?? ""} /></Field>
          <Field label="Website" name="website" hint="https://…"><input id="website" name="website" className="input" type="url" defaultValue={business.website ?? ""} /></Field>
        </ActionForm>
      </section>

      {business.branches.map((b) => {
        const parsedHours = openingHoursSchema.safeParse(b.openingHours);
        const parsed = parsedHours.success ? parsedHours.data : null;
        return (
          <section key={b.id} className="card mt-6 p-5" aria-labelledby={`b-${b.id}`}>
            <h2 id={`b-${b.id}`} className="mb-3 text-lg font-extrabold">Branch: {b.branchName}</h2>
            <ActionForm action={updateBranchAction.bind(null, b.id)} submitLabel={`Save ${b.branchName}`} testId={`branch-form-${b.branchName}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone" name={`phone-${b.id}`}><input name="phone" id={`phone-${b.id}`} className="input" type="tel" defaultValue={b.phone ? `+${b.phone}` : ""} placeholder="03-1234 5678" /></Field>
                <Field label="WhatsApp" name={`wa-${b.id}`}><input name="whatsapp" id={`wa-${b.id}`} className="input" type="tel" defaultValue={b.whatsapp ? `+${b.whatsapp}` : ""} placeholder="012-345 6789" /></Field>
                <Field label="Email" name={`em-${b.id}`}><input name="email" id={`em-${b.id}`} className="input" type="email" defaultValue={b.email ?? ""} /></Field>
                <Field label="Website (branch)" name={`web-${b.id}`}><input name="website" id={`web-${b.id}`} className="input" type="url" defaultValue={b.website ?? ""} /></Field>
                <Field label="Price level" name={`pl-${b.id}`} hint="How would you describe your prices?">
                  <select name="priceLevel" id={`pl-${b.id}`} className="input" defaultValue={b.priceLevel ?? ""}><option value="">Not set</option><option value="1">$ – budget</option><option value="2">$$ – mid</option><option value="3">$$$ – premium</option></select>
                </Field>
              </div>
              {promoOk ? (
                <Field label="Promotional description (Featured)" name={`promo-${b.id}`}><textarea name="promoDescription" id={`promo-${b.id}`} className="input" rows={2} maxLength={600} defaultValue={b.promoDescription ?? ""} /></Field>
              ) : <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-muted">A promotional description is part of the Featured plan.</p>}
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Opening hours <span className="font-normal text-muted">(leave a day blank if closed; leave all blank if unsure)</span></legend>
                <div className="grid gap-1.5">
                  {DAY_KEYS.map((d) => (
                    <div key={d} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2 text-sm">
                      <span className="font-medium">{DAY_LABELS[d]}</span>
                      <input aria-label={`${DAY_LABELS[d]} opens`} name={`hours_${d}_open`} type="time" className="input" defaultValue={parsed?.[d]?.[0]?.open ?? ""} />
                      <input aria-label={`${DAY_LABELS[d]} closes`} name={`hours_${d}_close`} type="time" className="input" defaultValue={parsed?.[d]?.[0]?.close ?? ""} />
                    </div>
                  ))}
                </div>
              </fieldset>
            </ActionForm>
          </section>
        );
      })}
    </DashboardShell>
  );
}
