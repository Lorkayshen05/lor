import { db } from "@/lib/db";
import { ForbiddenError, type Actor } from "@/lib/auth/errors";

/** Owner of the business, or an admin. Throws ForbiddenError otherwise. */
export async function assertBusinessAccess(actor: Actor | null, businessId: string) {
  if (!actor) throw new ForbiddenError("Please log in.");
  if (actor.role === "ADMIN") return;
  const b = await db.business.findUnique({ where: { id: businessId }, select: { ownerId: true } });
  if (!b || b.ownerId !== actor.id) throw new ForbiddenError();
}

/** Businesses this actor may manage (all of them for admins). */
export async function managedBusinesses(actor: Actor) {
  return db.business.findMany({
    where: actor.role === "ADMIN" ? {} : { ownerId: actor.id },
    orderBy: { name: "asc" },
    include: { branches: { orderBy: { branchName: "asc" } }, subscription: { include: { plan: true } } },
  });
}
