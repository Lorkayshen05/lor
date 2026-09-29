import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { actorOf, makeBusinessFixture, makeUser, resetDb } from "../helpers/db";
import { deleteResource, listResource, parseFields, parseMyt, runRowAction, saveResource, toMytInput } from "@/lib/admin/engine";
import { getResource, RESOURCES } from "@/lib/admin/resources";
import { ForbiddenError, ValidationFailure } from "@/lib/auth/errors";
import { submitClaim } from "@/lib/services/claims";

beforeEach(resetDb);

const form = (o: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => fd.append(k, x));
  return fd;
};

describe("admin engine – authorization", () => {
  it("rejects anonymous users and non-admins for every operation", async () => {
    const user = await makeUser("USER");
    const owner = await makeUser("BUSINESS_OWNER");
    const { business } = await makeBusinessFixture();
    for (const actor of [null, actorOf(user), actorOf(owner)]) {
      await expect(saveResource(actor, "categories", null, form({ name: "X", kind: "PRODUCT", description: "d" }))).rejects.toBeInstanceOf(ForbiddenError);
      await expect(saveResource(actor, "businesses", business.id, form({ name: "Hacked", claimStatus: "CLAIMED", dataSource: "ADMIN_ENTERED" }))).rejects.toBeInstanceOf(ForbiddenError);
      await expect(deleteResource(actor, "businesses", business.id)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(runRowAction(actor, "claims", "x", "approve")).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect((await db.business.findUnique({ where: { id: business.id } }))?.name).toBe("Test Shop");
    expect(await db.category.count()).toBe(0);
  });

  it("rejects unknown resources", async () => {
    const admin = await makeUser("ADMIN");
    await expect(saveResource(actorOf(admin), "passwords", null, form({}))).rejects.toBeInstanceOf(ValidationFailure);
    await expect(deleteResource(actorOf(admin), "users", "x")).rejects.toBeInstanceOf(ForbiddenError); // users can't be deleted here
  });
});

describe("admin engine – CRUD & validation", () => {
  it("creates, edits and deletes a category with slug generation", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const c = await saveResource(admin, "categories", null, form({ name: "Frozen Dim Sum", kind: "PRODUCT", description: "Steamed goodies", emoji: "🥟", sortOrder: "3" }));
    expect(c.slug).toBe("frozen-dim-sum");
    expect(c.sortOrder).toBe(3);
    const u = await saveResource(admin, "categories", String(c.id), form({ name: "Dim Sum", slug: "dim-sum", kind: "PRODUCT", description: "Updated", sortOrder: "4" }));
    expect(u.slug).toBe("dim-sum");
    const listed = await listResource("categories", { q: "dim" });
    expect(listed.total).toBe(1);
    await deleteResource(admin, "categories", String(c.id));
    expect(await db.category.count()).toBe(0);
  });

  it("reports field errors and unique-constraint conflicts", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const bad = await saveResource(admin, "categories", null, form({ name: "", kind: "NOPE", description: "" })).catch((e) => e as ValidationFailure);
    expect(bad).toBeInstanceOf(ValidationFailure);
    expect(Object.keys((bad as ValidationFailure).fieldErrors ?? {})).toEqual(expect.arrayContaining(["name", "kind", "description"]));
    await saveResource(admin, "categories", null, form({ name: "Tofu", kind: "PRODUCT", description: "d" }));
    await expect(saveResource(admin, "categories", null, form({ name: "Tofu 2", slug: "tofu", kind: "PRODUCT", description: "d" }))).rejects.toThrow(/already exists/);
    await expect(saveResource(admin, "categories", null, form({ name: "X", slug: "Bad Slug!", kind: "PRODUCT", description: "d" }))).rejects.toBeInstanceOf(ValidationFailure);
  });

  it("ignores fields that are not whitelisted (mass-assignment) on users and reviews", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const target = await makeUser("USER");
    await saveResource(admin, "users", target.id, form({ role: "BUSINESS_OWNER", email: "evil@x.my", passwordHash: "x", sessionVersion: "99" }));
    const after = await db.user.findUnique({ where: { id: target.id } });
    expect(after).toMatchObject({ role: "BUSINESS_OWNER", email: target.email, passwordHash: target.passwordHash, sessionVersion: 0 });

    const { branch } = await makeBusinessFixture();
    const review = await db.review.create({ data: { userId: target.id, branchId: branch.id, rating: 2, body: "Meh, not great" } });
    await saveResource(admin, "reviews", review.id, form({ status: "APPROVED", body: "Meh, not great", rating: "5", userId: admin.id }));
    expect(await db.review.findUnique({ where: { id: review.id } })).toMatchObject({ status: "APPROVED", rating: 2, userId: target.id });
  });

  it("stops an admin removing their own admin role and rejects invalid roles", async () => {
    const me = await makeUser("ADMIN");
    await expect(saveResource(actorOf(me), "users", me.id, form({ role: "USER" }))).rejects.toThrow(/own admin role/);
    await expect(saveResource(actorOf(me), "users", me.id, form({ role: "SUPERUSER" }))).rejects.toBeInstanceOf(ValidationFailure);
    expect((await db.user.findUnique({ where: { id: me.id } }))?.role).toBe("ADMIN");
  });

  it("plan pricing is editable data (RM → sen) and json fields are validated", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const plan = await saveResource(admin, "plans", null, form({ code: "featured-monthly", name: "Featured", tier: "FEATURED", priceSen: "49", interval: "month", features: '["Badge","Promo text"]', sortOrder: "1", isActive: "on" }));
    expect(plan.priceSen).toBe(4900);
    const changed = await saveResource(admin, "plans", String(plan.id), form({ code: "featured-monthly", name: "Featured", tier: "FEATURED", priceSen: "59.90", interval: "month", features: '["Badge"]', isActive: "on" }));
    expect(changed.priceSen).toBe(5990);
    await expect(saveResource(admin, "plans", String(plan.id), form({ code: "featured-monthly", name: "F", tier: "FEATURED", priceSen: "10", interval: "month", features: "{not json" }))).rejects.toBeInstanceOf(ValidationFailure);
    await expect(saveResource(admin, "plans", String(plan.id), form({ code: "featured-monthly", name: "F", tier: "FEATURED", priceSen: "10", interval: "month", features: '{"a":1}' }))).rejects.toBeInstanceOf(ValidationFailure);
    await expect(saveResource(admin, "plans", String(plan.id), form({ code: "featured-monthly", name: "F", tier: "FEATURED", priceSen: "-5", interval: "month" }))).rejects.toBeInstanceOf(ValidationFailure);
  });

  it("creates articles with FAQ json, stamps publishedAt, and refuses javascript: sponsor URLs", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const a = await saveResource(admin, "articles", null, form({ title: "Best hotpot tips", excerpt: "e", body: "b", status: "PUBLISHED", faq: '[{"q":"Q?","a":"A."}]' }));
    expect(a.slug).toBe("best-hotpot-tips");
    expect(a.publishedAt).toBeInstanceOf(Date);
    expect(a.authorId).toBe(admin.id);
    await expect(saveResource(admin, "articles", null, form({ title: "T", excerpt: "e", body: "b", status: "DRAFT", sponsorUrl: "javascript:alert(1)" }))).rejects.toBeInstanceOf(ValidationFailure);
  });

  it("creates a branch with shop types and normalises phone; datetimes are Malaysia time", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const { business, area } = await makeBusinessFixture();
    const cat = await db.category.create({ data: { slug: "frozen-food", name: "Frozen", kind: "STORE_TYPE", description: "d" } });
    const b = await saveResource(admin, "branches", null, form({
      businessId: business.id, areaId: area.id, branchName: "Second", addressLine: "2 Jalan Test", postcode: "50000", city: "KL", state: "KL",
      phone: "03-1234 5678", coordsApprox: "on", isActive: "on", categories: [cat.id],
    }));
    expect(b.slug).toBe("second");
    expect(b.phone).toBe("60312345678");
    const withCats = await db.branch.findUnique({ where: { id: String(b.id) }, include: { categories: true } });
    expect(withCats?.categories.map((c) => c.slug)).toEqual(["frozen-food"]);
    expect(parseMyt("2026-10-01T09:00")?.toISOString()).toBe("2026-10-01T01:00:00.000Z");
    expect(toMytInput(new Date("2026-10-01T01:00:00Z"))).toBe("2026-10-01T09:00");
  });

  it("every resource definition is coherent (fields parse, columns resolve)", () => {
    expect(new Set(RESOURCES.map((r) => r.key)).size).toBe(RESOURCES.length);
    for (const r of RESOURCES) {
      const { errors } = parseFields(r, new FormData(), "create");
      expect(typeof errors).toBe("object");
      for (const f of r.fields) expect(f.name).not.toMatch(/^(passwordHash|sessionVersion|id)$/); // sensitive columns are never editable
      expect(getResource(r.key)).toBe(r);
    }
  });
});

describe("admin workflows via row actions", () => {
  it("approves a claim through the admin action and releases ownership", async () => {
    const admin = actorOf(await makeUser("ADMIN"));
    const user = await makeUser("USER");
    const { business } = await makeBusinessFixture();
    const claim = await submitClaim(actorOf(user), { businessId: business.id, claimantName: "Ah Meng", claimantRole: "Owner", phone: "0123456789", email: "a@b.my" });
    await runRowAction(admin, "claims", claim.id, "approve");
    expect((await db.business.findUnique({ where: { id: business.id } }))?.ownerId).toBe(user.id);
    await runRowAction(admin, "businesses", business.id, "release");
    expect(await db.business.findUnique({ where: { id: business.id } })).toMatchObject({ ownerId: null, claimStatus: "UNCLAIMED" });
    await expect(runRowAction(admin, "claims", claim.id, "nonsense")).rejects.toBeInstanceOf(ValidationFailure);
  });

  it("lists with status filter and pagination metadata", async () => {
    const { business, branch } = await makeBusinessFixture();
    const u = await makeUser();
    for (const status of ["PENDING", "APPROVED", "PENDING"] as const) {
      const other = await makeUser();
      await db.deal.create({ data: { businessId: business.id, branchId: branch.id, title: `Deal ${status}`, startsAt: new Date(), endsAt: new Date(Date.now() + 1e6), status, submittedById: u.id } }).then(() => other);
    }
    const pending = await listResource("deals", { status: "PENDING" });
    expect(pending.total).toBe(2);
    expect((await listResource("deals", { status: "BOGUS" })).total).toBe(3); // invalid filter ignored
    expect((await listResource("deals", { q: "approved" })).total).toBe(1);
  });
});
