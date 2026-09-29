import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { areas } from "./seed-data/areas";
import { business, branches } from "./seed-data/branches";
import { storeTypes, productCategories } from "./seed-data/categories";
import { products } from "./seed-data/products";
import { articles } from "./seed-data/articles";
import { plans } from "./seed-data/plans";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function seedAdmin() {
  const isProd = process.env.NODE_ENV === "production";
  const email = (process.env.ADMIN_EMAIL ?? (isProd ? "" : "admin@example.com")).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? (isProd ? "" : "admin-dev-password-1");
  if (!email || password.length < 12) {
    if (isProd) throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before seeding production.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  // Only create; never overwrite an existing admin's password on re-seed.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    return;
  }
  await prisma.user.create({ data: { email, name: "Admin", passwordHash, role: "ADMIN" } });
  console.log(`  admin user created: ${email}`);
}

async function main() {
  console.log("Seeding…");

  for (const a of areas) {
    await prisma.area.upsert({ where: { slug: a.slug }, update: {}, create: { ...a } });
  }

  const catIds = new Map<string, string>();
  for (const c of storeTypes) {
    const { ...rest } = c;
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...rest, kind: "STORE_TYPE" } });
    catIds.set(c.slug, row.id);
  }
  for (const c of productCategories) {
    const { storeTypes: st, ...rest } = c;
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...rest, kind: "PRODUCT", storeTypes: { connect: st.map((s) => ({ slug: s })) } },
    });
    catIds.set(c.slug, row.id);
  }

  for (const p of products) {
    const { category, ...rest } = p;
    const categoryId = catIds.get(category);
    if (!categoryId) throw new Error(`Unknown category ${category}`);
    await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: { ...rest, categoryId } });
  }

  const biz = await prisma.business.upsert({ where: { slug: business.slug }, update: {}, create: { ...business } });
  const areaBySlug = new Map((await prisma.area.findMany()).map((a) => [a.slug, a]));
  for (const b of branches) {
    const area = areaBySlug.get(b.area);
    if (!area) throw new Error(`Unknown area ${b.area}`);
    const { area: _a, ...rest } = b;
    void _a;
    await prisma.branch.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        ...rest,
        businessId: biz.id,
        areaId: area.id,
        lat: area.lat,
        lng: area.lng,
        coordsApprox: true,
        categories: { connect: [{ slug: "frozen-food" }, { slug: "fresh-meat" }] },
      },
    });
  }

  for (const a of articles) {
    const { faq, ...rest } = a;
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...rest, faq, status: "PUBLISHED", publishedAt: new Date(), reviewedAt: new Date() },
    });
  }

  for (const p of plans) {
    await prisma.plan.upsert({ where: { code: p.code }, update: {}, create: { ...p, features: [...p.features] } });
  }

  await seedAdmin();
  const counts = {
    areas: await prisma.area.count(),
    branches: await prisma.branch.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    articles: await prisma.article.count(),
    plans: await prisma.plan.count(),
  };
  console.log("Done:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
