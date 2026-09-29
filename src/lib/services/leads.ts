import { db } from "@/lib/db";
import { ValidationFailure } from "@/lib/auth/errors";
import { leadSchema, fieldErrors } from "@/lib/validation/schemas";

/**
 * Enquiry forms are only accepted for CLAIMED, published businesses — we never collect messages for a
 * business that hasn't agreed to receive them. Click-to-call / WhatsApp are tracked as analytics events.
 */
export async function createLead(raw: unknown, userId: string | null) {
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationFailure("Please check the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;

  const business = await db.business.findUnique({ where: { id: data.businessId }, select: { id: true, claimStatus: true, isPublished: true } });
  if (!business || !business.isPublished) throw new ValidationFailure("Business not found.");
  if (business.claimStatus !== "CLAIMED") throw new ValidationFailure("This business hasn't claimed its listing yet, so it can't receive enquiries here.");
  if (data.branchId) {
    const branch = await db.branch.findFirst({ where: { id: data.branchId, businessId: business.id }, select: { id: true } });
    if (!branch) throw new ValidationFailure("Branch not found for this business.");
  }
  const lead = await db.lead.create({ data: { ...data, userId } });
  await db.analyticsEvent.create({
    data: { type: "LEAD_SUBMITTED", businessId: business.id, branchId: data.branchId ?? null, path: data.sourcePath ?? null, meta: { leadType: data.type } },
  });
  return lead;
}

export async function updateLeadStatus(actor: import("@/lib/auth/errors").Actor | null, leadId: string, status: "NEW" | "CONTACTED" | "CLOSED") {
  const { assertBusinessAccess } = await import("./access");
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { businessId: true } });
  if (!lead) throw new ValidationFailure("Lead not found.");
  await assertBusinessAccess(actor, lead.businessId);
  return db.lead.update({ where: { id: leadId }, data: { status } });
}
