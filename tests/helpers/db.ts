import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export async function resetDb() {
  const rows = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = rows.map((r) => `"${r.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`); // test DB only; constant identifiers
}

let n = 0;
export async function makeUser(role: "USER" | "BUSINESS_OWNER" | "ADMIN" = "USER", password = "test-password-123") {
  n += 1;
  return db.user.create({ data: { email: `user${n}-${Date.now()}@test.my`, name: `User ${n}`, role, passwordHash: await hashPassword(password) } });
}

export async function makeBusinessFixture() {
  const area = await db.area.create({ data: { slug: `area-${++n}`, name: "Test Area", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.07, lng: 101.69 } });
  const business = await db.business.create({ data: { slug: `biz-${n}`, name: "Test Shop" } });
  const branch = await db.branch.create({
    data: { businessId: business.id, areaId: area.id, slug: `branch-${n}`, branchName: "Main", addressLine: "1 Jalan Test", postcode: "50000", city: "Kuala Lumpur", state: "Kuala Lumpur" },
  });
  return { area, business, branch };
}

export const actorOf = (u: { id: string; role: "USER" | "BUSINESS_OWNER" | "ADMIN" }) => ({ id: u.id, role: u.role });
