import { db } from "@/lib/db";
import { ValidationFailure, type Actor } from "@/lib/auth/errors";
import { assertBusinessAccess } from "./access";
import { processAndStoreImage } from "@/lib/storage";
import { can, effectiveTier } from "@/lib/plans";

const FREE_PHOTO_LIMIT = 3;
const EXTRA_PHOTO_LIMIT = 12;

export async function uploadPhoto(actor: Actor | null, businessId: string, file: Buffer, alt: string, branchId?: string | null) {
  await assertBusinessAccess(actor, businessId);
  const cleanAlt = alt.trim().slice(0, 140);
  if (cleanAlt.length < 3) throw new ValidationFailure("Please describe the photo (alt text).");
  const business = await db.business.findUnique({ where: { id: businessId }, include: { subscription: { include: { plan: true } } } });
  if (!business) throw new ValidationFailure("Business not found.");
  const limit = can(effectiveTier(business.subscription), "extra_photos") ? EXTRA_PHOTO_LIMIT : FREE_PHOTO_LIMIT;
  const count = await db.photo.count({ where: { businessId, status: { not: "REJECTED" } } });
  if (count >= limit) throw new ValidationFailure(`Photo limit reached (${limit}). ${limit === FREE_PHOTO_LIMIT ? "Featured listings can upload more." : ""}`.trim());
  if (branchId) {
    const ok = await db.branch.findFirst({ where: { id: branchId, businessId }, select: { id: true } });
    if (!ok) throw new ValidationFailure("Branch not found for this business.");
  }
  const { url } = await processAndStoreImage(file);
  // Photos go through admin approval before they appear publicly.
  return db.photo.create({ data: { businessId, branchId: branchId ?? null, url, alt: cleanAlt, status: "PENDING", uploadedById: actor!.id } });
}
