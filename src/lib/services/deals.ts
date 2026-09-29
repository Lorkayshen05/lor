import { db } from "@/lib/db";
import { assertAdmin, ValidationFailure, type Actor } from "@/lib/auth/errors";
import { dealSchema, fieldErrors } from "@/lib/validation/schemas";
import { assertBusinessAccess } from "./access";

const toSen = (rm: number | undefined) => (rm == null ? null : Math.round(rm * 100));

/** Deals submitted by owners always start PENDING; nothing is public until an admin approves it. */
export async function submitDeal(actor: Actor | null, businessId: string, raw: unknown) {
  await assertBusinessAccess(actor, businessId);
  const parsed = dealSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailure("Please check the highlighted fields.", fieldErrors(parsed.error));
  const d = parsed.data;
  if (d.branchId) {
    const ok = await db.branch.findFirst({ where: { id: d.branchId, businessId }, select: { id: true } });
    if (!ok) throw new ValidationFailure("Branch not found for this business.");
  }
  if (d.productId) {
    const ok = await db.product.findUnique({ where: { id: d.productId }, select: { id: true } });
    if (!ok) throw new ValidationFailure("Product not found.");
  }
  return db.deal.create({
    data: {
      businessId,
      branchId: d.branchId ?? null,
      productId: d.productId ?? null,
      title: d.title,
      description: d.description ?? null,
      priceSen: toSen(d.priceRm),
      originalPriceSen: toSen(d.originalPriceRm),
      priceUnit: d.priceUnit ?? null,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      status: "PENDING",
      submittedById: actor!.id,
    },
  });
}

export async function approveDeal(actor: Actor | null, dealId: string) {
  assertAdmin(actor);
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new ValidationFailure("Deal not found.");
  return db.deal.update({ where: { id: dealId }, data: { status: "APPROVED", reviewedById: actor.id, reviewedAt: new Date(), rejectionReason: null } });
}

export async function rejectDeal(actor: Actor | null, dealId: string, reason?: string) {
  assertAdmin(actor);
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new ValidationFailure("Deal not found.");
  return db.deal.update({
    where: { id: dealId },
    data: { status: "REJECTED", reviewedById: actor.id, reviewedAt: new Date(), rejectionReason: reason?.slice(0, 300) || null },
  });
}

/** Public visibility rule, shared by every query that lists deals. */
export function activeDealWhere(now: Date = new Date()) {
  return { status: "APPROVED" as const, startsAt: { lte: now }, endsAt: { gte: now }, business: { isPublished: true } };
}
