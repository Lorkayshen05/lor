import { db } from "@/lib/db";
import { assertAdmin, ForbiddenError, ValidationFailure, type Actor } from "@/lib/auth/errors";
import { reviewSchema, fieldErrors } from "@/lib/validation/schemas";

export async function submitReview(actor: Actor | null, raw: unknown) {
  if (!actor) throw new ForbiddenError("Please log in to write a review.");
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailure("Please check the highlighted fields.", fieldErrors(parsed.error));
  const { branchId, rating, body } = parsed.data;
  const branch = await db.branch.findUnique({ where: { id: branchId }, include: { business: { select: { ownerId: true } } } });
  if (!branch) throw new ValidationFailure("Store not found.");
  if (branch.business.ownerId === actor.id) throw new ValidationFailure("You can't review your own business.");
  const existing = await db.review.findUnique({ where: { userId_branchId: { userId: actor.id, branchId } } });
  if (existing) throw new ValidationFailure("You have already reviewed this store.");
  return db.review.create({ data: { userId: actor.id, branchId, rating, body, status: "PENDING" } });
}

export async function moderateReview(actor: Actor | null, reviewId: string, status: "APPROVED" | "REJECTED") {
  assertAdmin(actor);
  const r = await db.review.findUnique({ where: { id: reviewId } });
  if (!r) throw new ValidationFailure("Review not found.");
  return db.review.update({ where: { id: reviewId }, data: { status, moderatedById: actor.id, moderatedAt: new Date() } });
}

/** Ratings shown publicly come ONLY from approved reviews on this platform. */
export async function ratingsFor(branchIds: string[]) {
  if (branchIds.length === 0) return new Map<string, { avg: number; count: number }>();
  const rows = await db.review.groupBy({
    by: ["branchId"],
    where: { branchId: { in: branchIds }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.branchId, { avg: r._avg.rating ?? 0, count: r._count._all }]));
}
