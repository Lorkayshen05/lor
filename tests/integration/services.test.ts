import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { actorOf, makeBusinessFixture, makeUser, resetDb } from "../helpers/db";
import { authenticate, registerUser } from "@/lib/services/auth";
import { approveClaim, rejectClaim, submitClaim } from "@/lib/services/claims";
import { createLead } from "@/lib/services/leads";
import { approveDeal, rejectDeal, submitDeal, activeDealWhere } from "@/lib/services/deals";
import { moderateReview, ratingsFor, submitReview } from "@/lib/services/reviews";
import { recordEvent, getBusinessStats, getAdminStats } from "@/lib/services/analytics";
import { updateBranchProfile, addBusinessProduct } from "@/lib/services/business";
import { ForbiddenError, ValidationFailure } from "@/lib/auth/errors";

beforeEach(resetDb);

const claimInput = (businessId: string) => ({
  businessId, claimantName: "Ah Meng", claimantRole: "Owner", phone: "012-345 6789", email: "meng@shop.my", note: "I own it",
});

describe("auth service", () => {
  it("registers, rejects duplicates and weak passwords", async () => {
    const ok = await registerUser({ name: "Aina", email: "AINA@Test.my", password: "a-long-password" });
    expect(ok.ok).toBe(true);
    const dup = await registerUser({ name: "Aina", email: "aina@test.my", password: "a-long-password" });
    expect(dup.ok).toBe(false);
    const weak = await registerUser({ name: "Bob", email: "bob@test.my", password: "short" });
    expect(weak.ok).toBe(false);
    if (!weak.ok) expect(weak.fieldErrors?.password).toBeTruthy();
    const stored = await db.user.findUnique({ where: { email: "aina@test.my" } });
    expect(stored?.email).toBe("aina@test.my"); // lower-cased
    expect(stored?.passwordHash).not.toContain("a-long-password");
    expect(stored?.role).toBe("USER"); // never self-assigned elevated role
  });

  it("logs in with correct password and locks after repeated failures", async () => {
    await registerUser({ name: "Aina", email: "aina@test.my", password: "a-long-password" });
    expect((await authenticate({ email: "aina@test.my", password: "a-long-password" })).ok).toBe(true);
    for (let i = 0; i < 5; i++) expect((await authenticate({ email: "aina@test.my", password: "wrong-password" })).ok).toBe(false);
    const locked = await authenticate({ email: "aina@test.my", password: "a-long-password" });
    expect(locked.ok).toBe(false); // even the right password is refused while locked
    // after the lock window it works again and counters reset
    const later = new Date(Date.now() + 16 * 60_000);
    expect((await authenticate({ email: "aina@test.my", password: "a-long-password" }, later)).ok).toBe(true);
  });

  it("gives the same error for unknown emails and wrong passwords", async () => {
    await registerUser({ name: "Aina", email: "aina@test.my", password: "a-long-password" });
    const a = await authenticate({ email: "aina@test.my", password: "nope-nope-nope" });
    const b = await authenticate({ email: "ghost@test.my", password: "nope-nope-nope" });
    expect(a).toEqual(b);
  });
});

describe("business claim flow", () => {
  it("requires login, validates, and only an admin can approve", async () => {
    const { business } = await makeBusinessFixture();
    const owner = await makeUser("USER");
    await expect(submitClaim(null, claimInput(business.id))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitClaim(actorOf(owner), { ...claimInput(business.id), phone: "abc" })).rejects.toBeInstanceOf(ValidationFailure);

    const claim = await submitClaim(actorOf(owner), claimInput(business.id));
    expect(claim.status).toBe("PENDING");
    await expect(submitClaim(actorOf(owner), claimInput(business.id))).rejects.toThrow(/pending/);
    await expect(approveClaim(actorOf(owner), claim.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(approveClaim(null, claim.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await db.business.findUnique({ where: { id: business.id } }))?.claimStatus).toBe("UNCLAIMED");

    const admin = await makeUser("ADMIN");
    await approveClaim(actorOf(admin), claim.id);
    const b = await db.business.findUnique({ where: { id: business.id } });
    expect(b?.claimStatus).toBe("CLAIMED");
    expect(b?.ownerId).toBe(owner.id);
    expect((await db.user.findUnique({ where: { id: owner.id } }))?.role).toBe("BUSINESS_OWNER");
    expect((await db.analyticsEvent.count({ where: { type: "CLAIM_SUBMITTED" } }))).toBe(1);
    await expect(approveClaim(actorOf(admin), claim.id)).rejects.toThrow(/already reviewed/);
  });

  it("refuses to claim an already-claimed business and can reject", async () => {
    const { business } = await makeBusinessFixture();
    const u1 = await makeUser();
    const u2 = await makeUser();
    const admin = await makeUser("ADMIN");
    const c1 = await submitClaim(actorOf(u1), claimInput(business.id));
    const c2 = await submitClaim(actorOf(u2), claimInput(business.id));
    await rejectClaim(actorOf(admin), c2.id);
    expect((await db.businessClaim.findUnique({ where: { id: c2.id } }))?.status).toBe("REJECTED");
    await approveClaim(actorOf(admin), c1.id);
    await expect(submitClaim(actorOf(u2), claimInput(business.id))).rejects.toThrow(/already been claimed/);
  });
});

describe("leads", () => {
  const lead = (businessId: string, branchId?: string) => ({ businessId, branchId, type: "QUOTATION", name: "Siti", phone: "0123456789", message: "Need 20kg chicken breast weekly" });

  it("are refused for unclaimed businesses", async () => {
    const { business } = await makeBusinessFixture();
    await expect(createLead(lead(business.id), null)).rejects.toThrow(/hasn't claimed/);
    expect(await db.lead.count()).toBe(0);
  });

  it("are stored for claimed businesses, need a contact method, and reject foreign branches", async () => {
    const { business, branch } = await makeBusinessFixture();
    const other = await makeBusinessFixture();
    await db.business.update({ where: { id: business.id }, data: { claimStatus: "CLAIMED" } });
    const saved = await createLead(lead(business.id, branch.id), null);
    expect(saved.status).toBe("NEW");
    expect(saved.phone).toBe("60123456789");
    expect(await db.analyticsEvent.count({ where: { type: "LEAD_SUBMITTED", businessId: business.id } })).toBe(1);
    await expect(createLead({ ...lead(business.id), phone: undefined }, null)).rejects.toBeInstanceOf(ValidationFailure);
    await expect(createLead(lead(business.id, other.branch.id), null)).rejects.toThrow(/Branch not found/);
    await expect(createLead({ ...lead(business.id), message: "hi" }, null)).rejects.toBeInstanceOf(ValidationFailure);
  });
});

describe("deals moderation", () => {
  const input = (branchId?: string) => ({
    branchId, title: "Chicken breast promo", priceRm: "12.90", originalPriceRm: "15", priceUnit: "per kg",
    startsAt: new Date(Date.now() - 86_400_000).toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  it("owner submissions are PENDING and invisible until an admin approves", async () => {
    const { business, branch } = await makeBusinessFixture();
    const owner = await makeUser("BUSINESS_OWNER");
    await db.business.update({ where: { id: business.id }, data: { ownerId: owner.id, claimStatus: "CLAIMED" } });
    const stranger = await makeUser("BUSINESS_OWNER");
    await expect(submitDeal(actorOf(stranger), business.id, input())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitDeal(null, business.id, input())).rejects.toBeInstanceOf(ForbiddenError);

    const deal = await submitDeal(actorOf(owner), business.id, input(branch.id));
    expect(deal.status).toBe("PENDING");
    expect(deal.priceSen).toBe(1290);
    expect(await db.deal.count({ where: activeDealWhere() })).toBe(0);

    await expect(approveDeal(actorOf(owner), deal.id)).rejects.toBeInstanceOf(ForbiddenError);
    const admin = await makeUser("ADMIN");
    await approveDeal(actorOf(admin), deal.id);
    expect(await db.deal.count({ where: activeDealWhere() })).toBe(1);
  });

  it("validates dates/prices, hides expired and future deals, supports rejection", async () => {
    const { business } = await makeBusinessFixture();
    const admin = await makeUser("ADMIN");
    const failure = async (p: Promise<unknown>) => (await p.then(() => null, (e) => e)) as ValidationFailure;
    const badDates = await failure(submitDeal(actorOf(admin), business.id, { ...input(), endsAt: new Date(Date.now() - 10 * 86_400_000).toISOString() }));
    expect(badDates).toBeInstanceOf(ValidationFailure);
    expect(badDates.fieldErrors?.endsAt?.[0]).toMatch(/End date/);
    const badPrice = await failure(submitDeal(actorOf(admin), business.id, { ...input(), priceRm: "20", originalPriceRm: "10" }));
    expect(badPrice.fieldErrors?.originalPriceRm?.[0]).toMatch(/Original price/);
    const future = await submitDeal(actorOf(admin), business.id, { ...input(), startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(), endsAt: new Date(Date.now() + 9 * 86_400_000).toISOString() });
    await approveDeal(actorOf(admin), future.id);
    expect(await db.deal.count({ where: activeDealWhere() })).toBe(0);
    const d = await submitDeal(actorOf(admin), business.id, input());
    await rejectDeal(actorOf(admin), d.id, "Price looks wrong");
    expect((await db.deal.findUnique({ where: { id: d.id } }))?.status).toBe("REJECTED");
    expect(await db.deal.count({ where: activeDealWhere() })).toBe(0);
  });
});

describe("reviews & ratings", () => {
  it("ratings count only approved reviews; one review per user; owners can't self-review", async () => {
    const { business, branch } = await makeBusinessFixture();
    const u1 = await makeUser();
    const u2 = await makeUser();
    const admin = await makeUser("ADMIN");
    await expect(submitReview(null, { branchId: branch.id, rating: 5, body: "Great place for meat" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(submitReview(actorOf(u1), { branchId: branch.id, rating: 6, body: "Great place for meat" })).rejects.toBeInstanceOf(ValidationFailure);
    const r1 = await submitReview(actorOf(u1), { branchId: branch.id, rating: 5, body: "Great place for meat" });
    const r2 = await submitReview(actorOf(u2), { branchId: branch.id, rating: 3, body: "Okay, a bit crowded" });
    await expect(submitReview(actorOf(u1), { branchId: branch.id, rating: 4, body: "Second review attempt" })).rejects.toThrow(/already reviewed/);
    expect((await ratingsFor([branch.id])).size).toBe(0); // nothing approved yet → no rating shown
    await expect(moderateReview(actorOf(u1), r1.id, "APPROVED")).rejects.toBeInstanceOf(ForbiddenError);
    await moderateReview(actorOf(admin), r1.id, "APPROVED");
    await moderateReview(actorOf(admin), r2.id, "REJECTED");
    expect((await ratingsFor([branch.id])).get(branch.id)).toEqual({ avg: 5, count: 1 });
    await db.business.update({ where: { id: business.id }, data: { ownerId: u2.id } });
    const fresh = await makeUser();
    await db.business.update({ where: { id: business.id }, data: { ownerId: fresh.id } });
    await expect(submitReview(actorOf(fresh), { branchId: branch.id, rating: 5, body: "Best shop ever, trust me" })).rejects.toThrow(/own business/);
  });
});

describe("analytics", () => {
  const ctx = { ip: "1.2.3.4", userAgent: "Mozilla/5.0 (iPhone) Safari" };
  it("records real events, derives businessId from the branch and ignores bots/invalid input", async () => {
    const { business, branch } = await makeBusinessFixture();
    const other = await makeBusinessFixture();
    expect((await recordEvent({ type: "STORE_VIEW", branchId: branch.id, businessId: other.business.id, path: "/stores/x" }, ctx)).recorded).toBe(true);
    const ev = await db.analyticsEvent.findFirst();
    expect(ev?.businessId).toBe(business.id); // spoofed businessId ignored
    expect(ev?.visitorHash).toHaveLength(24);
    expect(JSON.stringify(ev)).not.toContain("1.2.3.4");
    expect((await recordEvent({ type: "STORE_VIEW", branchId: branch.id }, { ip: "1.1.1.1", userAgent: "Googlebot/2.1" })).recorded).toBe(false);
    expect((await recordEvent({ type: "HACK", branchId: branch.id }, ctx)).recorded).toBe(false);
    expect((await recordEvent({ type: "STORE_VIEW", branchId: "nope" }, ctx)).recorded).toBe(false);
    expect((await recordEvent({ type: "PAGE_VIEW", path: "javascript:alert(1)" }, ctx)).recorded).toBe(false);
    expect(await db.analyticsEvent.count()).toBe(1);
  });

  it("aggregates for the business dashboard and admin dashboard", async () => {
    const { business, branch } = await makeBusinessFixture();
    for (const type of ["STORE_VIEW", "STORE_VIEW", "DIRECTIONS_CLICK", "PHONE_CLICK", "WHATSAPP_CLICK", "WEBSITE_CLICK"] as const) {
      await recordEvent({ type, branchId: branch.id, path: "/stores/main" }, ctx);
    }
    await recordEvent({ type: "SEARCH", searchTerm: "Chicken Breast" }, ctx);
    await recordEvent({ type: "SEARCH", searchTerm: "chicken breast" }, { ...ctx, ip: "9.9.9.9" });
    const s = await getBusinessStats(business.id, 30, true);
    expect(s.totals).toMatchObject({ STORE_VIEW: 2, DIRECTIONS_CLICK: 1, PHONE_CLICK: 1, WHATSAPP_CLICK: 1, WEBSITE_CLICK: 1, LEADS: 0 });
    expect(s.daily.reduce((a, d) => a + d.views, 0)).toBe(2);
    expect(s.byBranch[0]).toMatchObject({ views: 2, directions: 1 });
    const a = await getAdminStats(30);
    expect(a.topSearches[0]).toEqual({ term: "chicken breast", count: 2 });
    expect(a.uniqueVisitors).toBe(2);
    expect(a.topStores[0].views).toBe(2);
  });
});

describe("owner profile edits", () => {
  it("owner can edit own branch; others cannot; hours only verified when supplied; promo gated by plan", async () => {
    const { business, branch } = await makeBusinessFixture();
    const owner = await makeUser("BUSINESS_OWNER");
    const stranger = await makeUser("BUSINESS_OWNER");
    await db.business.update({ where: { id: business.id }, data: { ownerId: owner.id, claimStatus: "CLAIMED" } });
    const hours = JSON.stringify({ mon: [{ open: "09:00", close: "18:00" }] });

    await expect(updateBranchProfile(actorOf(stranger), branch.id, { phone: "0123456789" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateBranchProfile(actorOf(owner), branch.id, { website: "javascript:alert(1)" })).rejects.toBeInstanceOf(ValidationFailure);
    await expect(updateBranchProfile(actorOf(owner), branch.id, { openingHours: "{bad" })).rejects.toBeInstanceOf(ValidationFailure);

    const updated = await updateBranchProfile(actorOf(owner), branch.id, { phone: "012-345 6789", whatsapp: "0123456789", openingHours: hours, promoDescription: "Big sale" });
    expect(updated.phone).toBe("60123456789");
    expect(updated.hoursVerifiedAt).not.toBeNull();
    expect(updated.promoDescription).toBeNull(); // FREE plan: promo ignored

    const plan = await db.plan.create({ data: { code: "f", name: "Featured", tier: "FEATURED", priceSen: 4900 } });
    await db.subscription.create({ data: { businessId: business.id, planId: plan.id, status: "ACTIVE" } });
    const featured = await updateBranchProfile(actorOf(owner), branch.id, { phone: "0123456789", openingHours: hours, promoDescription: "Big sale" });
    expect(featured.promoDescription).toBe("Big sale");
    const cleared = await updateBranchProfile(actorOf(owner), branch.id, { phone: "0123456789" });
    expect(cleared.hoursVerifiedAt).toBeNull(); // removing hours removes verification
  });

  it("owner-listed products are verified rows; duplicates and strangers are refused", async () => {
    const { business } = await makeBusinessFixture();
    const owner = await makeUser("BUSINESS_OWNER");
    await db.business.update({ where: { id: business.id }, data: { ownerId: owner.id } });
    const cat = await db.category.create({ data: { slug: "chicken", name: "Chicken", kind: "PRODUCT", description: "x" } });
    const product = await db.product.create({ data: { slug: "cb", name: "Chicken breast", categoryId: cat.id, description: "x" } });
    const row = await addBusinessProduct(actorOf(owner), business.id, { productId: product.id, priceRm: "11.50", priceUnit: "per kg" });
    expect(row.priceSen).toBe(1150);
    expect(row.verifiedAt).not.toBeNull();
    await expect(addBusinessProduct(actorOf(owner), business.id, { productId: product.id })).rejects.toThrow(/already listed/);
    await expect(addBusinessProduct(actorOf(await makeUser("BUSINESS_OWNER")), business.id, { productId: product.id })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
