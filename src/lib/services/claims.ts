import { db } from "@/lib/db";
import { assertAdmin, ForbiddenError, ValidationFailure, type Actor } from "@/lib/auth/errors";
import { claimSchema, fieldErrors } from "@/lib/validation/schemas";

export async function submitClaim(actor: Actor | null, raw: unknown) {
  if (!actor) throw new ForbiddenError("Please log in to claim a listing.");
  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailure("Please check the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;

  const business = await db.business.findUnique({ where: { id: data.businessId }, select: { id: true, claimStatus: true, isPublished: true } });
  if (!business || !business.isPublished) throw new ValidationFailure("Business not found.");
  if (business.claimStatus === "CLAIMED") throw new ValidationFailure("This listing has already been claimed. Contact us if you believe this is a mistake.");

  const pending = await db.businessClaim.findFirst({ where: { businessId: data.businessId, userId: actor.id, status: "PENDING" } });
  if (pending) throw new ValidationFailure("You already have a pending claim for this business.");

  const claim = await db.businessClaim.create({ data: { ...data, userId: actor.id } });
  await db.analyticsEvent.create({ data: { type: "CLAIM_SUBMITTED", businessId: data.businessId, path: "/business/claim" } });
  return claim;
}

/** Approve: links the business to the claimant. Refuses if someone else already owns it. */
export async function approveClaim(actor: Actor | null, claimId: string) {
  assertAdmin(actor);
  return db.$transaction(async (tx) => {
    const claim = await tx.businessClaim.findUnique({ where: { id: claimId }, include: { business: true } });
    if (!claim) throw new ValidationFailure("Claim not found.");
    if (claim.status !== "PENDING") throw new ValidationFailure("This claim was already reviewed.");
    if (claim.business.claimStatus === "CLAIMED" && claim.business.ownerId && claim.business.ownerId !== claim.userId) {
      throw new ValidationFailure("This business already has an owner. Remove the current owner first.");
    }
    await tx.businessClaim.update({ where: { id: claimId }, data: { status: "APPROVED", reviewedById: actor.id, reviewedAt: new Date() } });
    await tx.business.update({ where: { id: claim.businessId }, data: { ownerId: claim.userId, claimStatus: "CLAIMED" } });
    const user = await tx.user.findUnique({ where: { id: claim.userId } });
    if (user && user.role === "USER") await tx.user.update({ where: { id: user.id }, data: { role: "BUSINESS_OWNER" } });
    return claim;
  });
}

export async function rejectClaim(actor: Actor | null, claimId: string) {
  assertAdmin(actor);
  const claim = await db.businessClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new ValidationFailure("Claim not found.");
  if (claim.status !== "PENDING") throw new ValidationFailure("This claim was already reviewed.");
  return db.businessClaim.update({ where: { id: claimId }, data: { status: "REJECTED", reviewedById: actor.id, reviewedAt: new Date() } });
}
