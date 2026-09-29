"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/errors";
import { formToObject, toFormState, type FormState } from "@/lib/form-state";
import { addBusinessProduct, removeBusinessProduct, updateBranchProfile, updateBusinessProfile } from "@/lib/services/business";
import { submitDeal } from "@/lib/services/deals";
import { updateLeadStatus } from "@/lib/services/leads";
import { uploadPhoto } from "@/lib/services/photos";
import { DAY_KEYS } from "@/lib/hours";

/**
 * Public pages are ISR-cached, so any owner change must invalidate them or it would take up to
 * `revalidate` seconds to appear. At this scale, invalidating the whole layout tree is simplest and cheap:
 * pages are only marked stale and regenerate on their next request.
 */
const invalidateSite = () => revalidatePath("/", "layout");

async function run(fn: (actor: NonNullable<Awaited<ReturnType<typeof getSession>>>) => Promise<string>): Promise<FormState> {
  const session = await getSession();
  try {
    if (!session) throw new ForbiddenError("Please log in.");
    const message = await fn(session);
    invalidateSite();
    return { ok: true, message };
  } catch (e) {
    return toFormState(e, !!session);
  }
}

export async function updateBusinessProfileAction(businessId: string, _prev: FormState, fd: FormData) {
  return run(async (a) => { await updateBusinessProfile(a, businessId, formToObject(fd)); return "Business details saved."; });
}

/** Per-day open/close inputs → the JSON structure the service validates. Fully blank = no hours. */
function hoursFromForm(fd: FormData): string {
  const hours: Record<string, { open: string; close: string }[]> = {};
  for (const d of DAY_KEYS) {
    const open = String(fd.get(`hours_${d}_open`) ?? "");
    const close = String(fd.get(`hours_${d}_close`) ?? "");
    if (open && close) hours[d] = [{ open, close }];
  }
  return Object.keys(hours).length ? JSON.stringify(hours) : "";
}

export async function updateBranchAction(branchId: string, _prev: FormState, fd: FormData) {
  const input = { ...formToObject(fd), openingHours: hoursFromForm(fd) };
  return run(async (a) => { await updateBranchProfile(a, branchId, input); return "Branch saved."; });
}

export async function addProductAction(businessId: string, _prev: FormState, fd: FormData) {
  return run(async (a) => { await addBusinessProduct(a, businessId, formToObject(fd)); return "Product added."; });
}

export async function removeProductAction(id: string) {
  const session = await getSession();
  await removeBusinessProduct(session, id).catch(() => undefined);
  invalidateSite();
}

/** Deals are entered in Malaysia time (datetime-local has no zone). */
export async function submitDealAction(businessId: string, _prev: FormState, fd: FormData) {
  const raw = formToObject(fd);
  const input = { ...raw, startsAt: raw.startsAt ? `${raw.startsAt}+08:00` : "", endsAt: raw.endsAt ? `${raw.endsAt}+08:00` : "" };
  return run(async (a) => { await submitDeal(a, businessId, input); return "Deal submitted. It will go live once our team approves it."; });
}

export async function setLeadStatusAction(leadId: string, status: "NEW" | "CONTACTED" | "CLOSED") {
  const session = await getSession();
  await updateLeadStatus(session, leadId, status).catch(() => undefined);
  invalidateSite();
}

export async function uploadPhotoAction(businessId: string, _prev: FormState, fd: FormData) {
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image to upload." };
  return run(async (a) => {
    await uploadPhoto(a, businessId, Buffer.from(await file.arrayBuffer()), String(fd.get("alt") ?? ""), String(fd.get("branchId") ?? "") || null);
    return "Photo uploaded. It will appear once approved.";
  });
}
