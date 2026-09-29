import { db } from "@/lib/db";
import { ValidationFailure, type Actor } from "@/lib/auth/errors";
import { assertBusinessAccess } from "./access";
import { businessProductSchema, branchProfileSchema, businessProfileSchema, fieldErrors } from "@/lib/validation/schemas";
import { can, effectiveTier } from "@/lib/plans";
import { Prisma } from "@/generated/prisma/client";

function parse<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: import("zod").ZodError } }, raw: unknown): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new ValidationFailure("Please check the highlighted fields.", fieldErrors(r.error));
  return r.data;
}

export async function updateBusinessProfile(actor: Actor | null, businessId: string, raw: unknown) {
  await assertBusinessAccess(actor, businessId);
  const d = parse(businessProfileSchema, raw);
  return db.business.update({ where: { id: businessId }, data: { description: d.description ?? null, website: d.website ?? null, dataSource: "OWNER_SUBMITTED" } });
}

/**
 * Owner-editable branch fields. Hours become "verified" because the owner supplied them;
 * the promo blurb is a paid (FEATURED+) capability and silently ignored on the free plan.
 */
export async function updateBranchProfile(actor: Actor | null, branchId: string, raw: unknown) {
  const branch = await db.branch.findUnique({ where: { id: branchId }, include: { business: { include: { subscription: { include: { plan: true } } } } } });
  if (!branch) throw new ValidationFailure("Branch not found.");
  await assertBusinessAccess(actor, branch.businessId);
  const d = parse(branchProfileSchema, raw);
  const tier = effectiveTier(branch.business.subscription);
  const promoAllowed = actor!.role === "ADMIN" || can(tier, "promo_description");
  return db.branch.update({
    where: { id: branchId },
    data: {
      phone: d.phone ?? null,
      whatsapp: d.whatsapp ?? null,
      email: d.email ?? null,
      website: d.website ?? null,
      priceLevel: d.priceLevel ?? null,
      ...(promoAllowed ? { promoDescription: d.promoDescription ?? null } : {}),
      openingHours: d.openingHours ?? Prisma.DbNull,
      hoursVerifiedAt: d.openingHours ? new Date() : null,
    },
  });
}

/** Owner-listed products: the owner is the source, so rows are marked verified at creation. */
export async function addBusinessProduct(actor: Actor | null, businessId: string, raw: unknown) {
  await assertBusinessAccess(actor, businessId);
  const d = parse(businessProductSchema, raw);
  if (d.branchId) {
    const ok = await db.branch.findFirst({ where: { id: d.branchId, businessId }, select: { id: true } });
    if (!ok) throw new ValidationFailure("Branch not found for this business.");
  }
  const product = await db.product.findUnique({ where: { id: d.productId }, select: { id: true } });
  if (!product) throw new ValidationFailure("Product not found.");
  const dup = await db.businessProduct.findFirst({ where: { businessId, branchId: d.branchId ?? null, productId: d.productId } });
  if (dup) throw new ValidationFailure("You have already listed this product.");
  const now = new Date();
  return db.businessProduct.create({
    data: {
      businessId, branchId: d.branchId ?? null, productId: d.productId,
      priceSen: d.priceRm == null ? null : Math.round(d.priceRm * 100),
      priceUnit: d.priceUnit ?? null,
      priceUpdatedAt: d.priceRm == null ? null : now,
      verifiedAt: now,
    },
  });
}

export async function removeBusinessProduct(actor: Actor | null, businessProductId: string) {
  const row = await db.businessProduct.findUnique({ where: { id: businessProductId } });
  if (!row) throw new ValidationFailure("Not found.");
  await assertBusinessAccess(actor, row.businessId);
  await db.businessProduct.delete({ where: { id: businessProductId } });
}
