import { db } from "@/lib/db";
import { activeDealWhere } from "@/lib/services/deals";
import { haversineKm } from "@/lib/geo";

export const getProductCategories = () =>
  db.category.findMany({ where: { kind: "PRODUCT" }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });

export const getStoreTypeCategories = () => db.category.findMany({ where: { kind: "STORE_TYPE" }, orderBy: { sortOrder: "asc" } });

export async function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: {
      products: { where: { isPublished: true }, orderBy: { sortOrder: "asc" } },
      storeTypes: { orderBy: { sortOrder: "asc" } },
      _count: { select: { branches: true } },
    },
  });
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findFirst({
    where: { slug, isPublished: true },
    include: {
      category: { include: { storeTypes: { orderBy: { sortOrder: "asc" } } } },
      offerings: { where: { verifiedAt: { not: null } }, include: { business: { select: { name: true, slug: true } }, branch: { select: { slug: true, branchName: true } } } },
    },
  });
  if (!product) return null;
  const now = new Date();
  const deals = await db.deal.findMany({
    where: { ...activeDealWhere(now), OR: [{ productId: product.id }, { categoryId: product.categoryId }] },
    orderBy: { endsAt: "asc" }, take: 6, include: { business: { select: { name: true, slug: true } }, branch: { select: { slug: true, branchName: true } } },
  });
  const related = await db.product.findMany({ where: { categoryId: product.categoryId, id: { not: product.id }, isPublished: true }, take: 6, orderBy: { sortOrder: "asc" } });
  return { product, deals, related };
}

export async function getActiveDeals(page = 1, pageSize = 12) {
  const now = new Date();
  const where = activeDealWhere(now);
  const [total, deals] = await Promise.all([
    db.deal.count({ where }),
    db.deal.findMany({
      where, orderBy: [{ isSponsored: "asc" }, { endsAt: "asc" }], skip: (page - 1) * pageSize, take: pageSize,
      include: { business: { select: { name: true, slug: true } }, branch: { select: { slug: true, branchName: true } }, product: { select: { name: true, slug: true } } },
    }),
  ]);
  return { deals, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export const getLatestDeals = async (limit = 3) => (await getActiveDeals(1, limit)).deals;

export const getPublishedArticles = (limit?: number) =>
  db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: limit });

export const getArticleBySlug = (slug: string) => db.article.findFirst({ where: { slug, status: "PUBLISHED" } });

/** Live directory listings attached to an article (by area and/or category). */
export async function getArticleListings(article: { areaSlug: string | null; categorySlug: string | null }) {
  if (!article.areaSlug && !article.categorySlug) return { stores: [], area: null as { name: string; slug: string } | null };
  const area = article.areaSlug ? await db.area.findUnique({ where: { slug: article.areaSlug } }) : null;
  const branches = await db.branch.findMany({
    where: {
      isActive: true, business: { isPublished: true },
      ...(article.categorySlug ? { categories: { some: { slug: article.categorySlug } } } : {}),
    },
    include: { business: { select: { name: true } }, area: { select: { name: true } } },
    take: 500,
  });
  const scored = branches
    .map((b) => ({ b, km: area && b.lat != null && b.lng != null ? haversineKm({ lat: area.lat, lng: area.lng }, { lat: b.lat, lng: b.lng }) : null }))
    .filter((x) => !area || (x.km != null && x.km <= Math.max(area.radiusKm, 8)))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
    .slice(0, 6);
  return { stores: scored.map((s) => ({ slug: s.b.slug, name: s.b.business.name, branchName: s.b.branchName, areaName: s.b.area.name, km: s.km })), area: area ? { name: area.name, slug: area.slug } : null };
}
