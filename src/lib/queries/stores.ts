import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { effectiveTier, can } from "@/lib/plans";
import { getOpenStatus, hasVerifiedHours, type OpenStatus } from "@/lib/hours";
import { directionsUrl, haversineKm, type LatLng } from "@/lib/geo";
import { ratingsFor } from "@/lib/services/reviews";
import { activeDealWhere } from "@/lib/services/deals";

export type StoreCard = {
  id: string;
  slug: string;
  businessName: string;
  businessNameAlt: string | null;
  branchName: string;
  location: string;
  area: { slug: string; name: string };
  categories: { slug: string; name: string }[];
  distanceKm: number | null;
  status: OpenStatus;
  priceLevel: number | null;
  rating: { avg: number; count: number } | null;
  featured: boolean;
  sponsored: boolean;
  claimed: boolean;
  phone: string | null;
  whatsapp: string | null;
  directionsUrl: string;
  businessId: string;
  lat: number | null;
  lng: number | null;
};

const cardInclude = {
  business: { select: { id: true, name: true, nameAlt: true, claimStatus: true, subscription: { include: { plan: true } } } },
  area: { select: { slug: true, name: true } },
  categories: { select: { slug: true, name: true }, orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.BranchInclude;

type BranchWithCard = Prisma.BranchGetPayload<{ include: typeof cardInclude }>;

export function toStoreCard(
  b: BranchWithCard,
  opts: { origin?: LatLng | null; rating?: { avg: number; count: number } | null; sponsored?: boolean; now?: Date } = {},
): StoreCard {
  const tier = effectiveTier(b.business.subscription, opts.now);
  const distanceKm = opts.origin && b.lat != null && b.lng != null ? haversineKm(opts.origin, { lat: b.lat, lng: b.lng }) : null;
  return {
    id: b.id,
    slug: b.slug,
    businessId: b.businessId,
    businessName: b.business.name,
    businessNameAlt: b.business.nameAlt,
    branchName: b.branchName,
    location: `${b.city}, ${b.state}`,
    area: b.area,
    categories: b.categories,
    distanceKm,
    status: getOpenStatus(b.openingHours, b.hoursVerifiedAt, opts.now),
    priceLevel: b.priceLevel,
    rating: opts.rating ?? null,
    featured: can(tier, "featured_badge"),
    sponsored: opts.sponsored ?? false,
    claimed: b.business.claimStatus === "CLAIMED",
    phone: b.phone,
    whatsapp: b.whatsapp,
    directionsUrl: directionsUrl(`${b.addressLine}, ${b.postcode} ${b.city}, Malaysia`),
    lat: b.lat,
    lng: b.lng,
  };
}

export type StoreFilters = {
  q?: string;
  category?: string;
  area?: string;
  openNow?: boolean;
  priceLevel?: number;
  featured?: boolean;
  origin?: LatLng | null;
  sort?: "distance" | "name";
  page?: number;
  pageSize?: number;
};

const ci = (t: string) => ({ contains: t, mode: "insensitive" as const });

/** Branches whose business currently has a paid tier (Featured/Premium) or an active sponsored listing. */
function featuredWhere(now: Date): Prisma.BranchWhereInput {
  return {
    business: {
      OR: [
        {
          subscription: {
            status: { in: ["ACTIVE", "TRIALING"] },
            plan: { tier: { in: ["FEATURED", "PREMIUM"] } },
            OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }],
          },
        },
        { sponsoredListings: { some: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } } },
      ],
    },
  };
}

export async function searchStores(f: StoreFilters) {
  const now = new Date();
  const pageSize = Math.min(Math.max(f.pageSize ?? 12, 1), 50);
  const tokens = (f.q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 5).map((t) => t.slice(0, 50));
  const and: Prisma.BranchWhereInput[] = [{ isActive: true, business: { isPublished: true } }];
  const matchedProducts = new Set<string>();

  for (const t of tokens) {
    // A product word ("chicken breast", "hotpot") widens the search to shop TYPES that usually sell it.
    // This is category-level discovery only — never a claim that a branch has it in stock.
    const productCats = await db.category.findMany({
      where: { kind: "PRODUCT", OR: [{ name: ci(t) }, { nameZh: ci(t) }, { slug: ci(t) }, { products: { some: { OR: [{ name: ci(t) }, { nameZh: ci(t) }] } } }] },
      select: { name: true, storeTypes: { select: { id: true } } },
    });
    const storeTypeIds = [...new Set(productCats.flatMap((c) => c.storeTypes.map((s) => s.id)))];
    productCats.forEach((c) => matchedProducts.add(c.name));
    and.push({
      OR: [
        { branchName: ci(t) }, { addressLine: ci(t) }, { city: ci(t) }, { postcode: ci(t) },
        { area: { name: ci(t) } },
        { business: { OR: [{ name: ci(t) }, { nameAlt: ci(t) }] } },
        { categories: { some: { OR: [{ name: ci(t) }, { nameZh: ci(t) }] } } },
        ...(storeTypeIds.length ? [{ categories: { some: { id: { in: storeTypeIds } } } }] : []),
      ],
    });
  }

  if (f.category) {
    const cat = await db.category.findUnique({ where: { slug: f.category }, select: { id: true, kind: true, storeTypes: { select: { id: true } } } });
    if (cat) {
      and.push(cat.kind === "STORE_TYPE" ? { categories: { some: { id: cat.id } } } : { categories: { some: { id: { in: cat.storeTypes.map((s) => s.id) } } } });
    } else {
      and.push({ id: "__none__" });
    }
  }
  if (f.area) and.push({ area: { slug: f.area } });
  if (f.priceLevel) and.push({ priceLevel: { lte: f.priceLevel } });
  if (f.featured) and.push(featuredWhere(now));

  const rows = await db.branch.findMany({ where: { AND: and }, include: cardInclude, take: 2000 });
  let cards = rows.map((b) => toStoreCard(b, { origin: f.origin, now }));
  if (f.openNow) cards = cards.filter((c) => c.status.state === "open");

  const sort = f.sort ?? (f.origin ? "distance" : "name");
  cards.sort((a, b) =>
    sort === "distance" && a.distanceKm != null && b.distanceKm != null
      ? a.distanceKm - b.distanceKm
      : a.businessName.localeCompare(b.businessName) || a.branchName.localeCompare(b.branchName),
  );

  const total = cards.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(f.page ?? 1, 1), pageCount);
  const slice = cards.slice((page - 1) * pageSize, page * pageSize);
  const ratings = await ratingsFor(slice.map((c) => c.id));
  slice.forEach((c) => (c.rating = ratings.get(c.id) ?? null));
  return { cards: slice, total, page, pageCount, matchedProducts: [...matchedProducts] };
}

/** Which optional filters have any data behind them (we hide filters that could only ever return nothing). */
export async function getStoreFacets() {
  const [areas, categories, withHours, withPrice, withFeatured] = await Promise.all([
    db.area.findMany({ where: { isActive: true, branches: { some: { isActive: true } } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.category.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }], select: { slug: true, name: true, kind: true } }),
    db.branch.count({ where: { isActive: true, hoursVerifiedAt: { not: null } } }),
    db.branch.count({ where: { isActive: true, priceLevel: { not: null } } }),
    db.branch.count({ where: { isActive: true, ...featuredWhere(new Date()) } }),
  ]);
  return { areas, categories, hasHoursData: withHours > 0, hasPriceData: withPrice > 0, hasFeatured: withFeatured > 0 };
}

export async function getSponsoredCards(opts: { placement: "HOMEPAGE" | "STORE_DIRECTORY" | "CATEGORY" | "AREA"; categoryId?: string; areaId?: string; limit?: number; origin?: LatLng | null }) {
  const now = new Date();
  const listings = await db.sponsoredListing.findMany({
    where: {
      placement: opts.placement, isActive: true, startsAt: { lte: now }, endsAt: { gte: now },
      business: { isPublished: true },
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.areaId ? { areaId: opts.areaId } : {}),
    },
    orderBy: [{ priority: "desc" }, { startsAt: "asc" }],
    take: opts.limit ?? 3,
    include: { branch: { include: cardInclude }, business: { include: { branches: { where: { isActive: true }, include: cardInclude, take: 3 } } } },
  });
  const seen = new Set<string>();
  const cards: StoreCard[] = [];
  for (const l of listings) {
    for (const b of l.branch ? [l.branch] : l.business.branches) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      cards.push(toStoreCard(b, { origin: opts.origin, sponsored: true, now }));
    }
  }
  const ratings = await ratingsFor(cards.map((c) => c.id));
  cards.forEach((c) => (c.rating = ratings.get(c.id) ?? null));
  return cards.slice(0, opts.limit ?? 3);
}

export async function getStoreBySlug(slug: string) {
  const now = new Date();
  const branch = await db.branch.findFirst({
    where: { slug, isActive: true, business: { isPublished: true } },
    include: {
      ...cardInclude,
      business: { include: { subscription: { include: { plan: true } }, branches: { where: { isActive: true }, select: { id: true, slug: true, branchName: true, city: true } } } },
      photos: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });
  if (!branch) return null;

  const [deals, offerings, ratings, nearbyRows] = await Promise.all([
    db.deal.findMany({
      where: { ...activeDealWhere(now), businessId: branch.businessId, OR: [{ branchId: null }, { branchId: branch.id }] },
      orderBy: { endsAt: "asc" }, take: 10, include: { product: { select: { name: true, slug: true } } },
    }),
    db.businessProduct.findMany({
      where: { businessId: branch.businessId, verifiedAt: { not: null }, OR: [{ branchId: null }, { branchId: branch.id }] },
      include: { product: { select: { name: true, slug: true } } }, orderBy: { product: { name: "asc" } },
    }),
    ratingsFor([branch.id]),
    db.branch.findMany({ where: { isActive: true, id: { not: branch.id }, business: { isPublished: true }, lat: { not: null }, lng: { not: null } }, include: cardInclude, take: 500 }),
  ]);

  const origin = branch.lat != null && branch.lng != null ? { lat: branch.lat, lng: branch.lng } : null;
  const nearby = nearbyRows
    .map((b) => toStoreCard(b, { origin, now }))
    .filter((c) => c.distanceKm != null)
    .sort((a, b) => a.distanceKm! - b.distanceKm!)
    .slice(0, 4);

  const tier = effectiveTier(branch.business.subscription, now);
  const card = toStoreCard(branch, { now, rating: ratings.get(branch.id) ?? null });
  return {
    branch, card, tier, deals, offerings, nearby,
    hoursVerified: hasVerifiedHours(branch.openingHours, branch.hoursVerifiedAt),
    address: `${branch.addressLine}, ${branch.postcode} ${branch.city}, ${branch.state}`,
  };
}

export async function getPopularStores(limit = 6) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const top = await db.analyticsEvent.groupBy({
    by: ["branchId"], where: { type: "STORE_VIEW", createdAt: { gte: since }, branchId: { not: null } },
    _count: { _all: true }, orderBy: { _count: { branchId: "desc" } }, take: limit,
  });
  const ranked = top.length >= 3;
  const rows = ranked
    ? await db.branch.findMany({ where: { id: { in: top.map((t) => t.branchId!) }, isActive: true, business: { isPublished: true } }, include: cardInclude })
    : await db.branch.findMany({ where: { isActive: true, business: { isPublished: true } }, include: cardInclude, orderBy: { branchName: "asc" }, take: limit });
  const order = new Map(top.map((t, i) => [t.branchId, i]));
  const cards = rows.map((b) => toStoreCard(b)).sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  const ratings = await ratingsFor(cards.map((c) => c.id));
  cards.forEach((c) => (c.rating = ratings.get(c.id) ?? null));
  return { cards, ranked };
}

export async function getNearestStores(origin: LatLng, limit = 6) {
  const rows = await db.branch.findMany({ where: { isActive: true, business: { isPublished: true }, lat: { not: null }, lng: { not: null } }, include: cardInclude, take: 2000 });
  const cards = rows.map((b) => toStoreCard(b, { origin })).sort((a, b) => a.distanceKm! - b.distanceKm!).slice(0, limit);
  const ratings = await ratingsFor(cards.map((c) => c.id));
  cards.forEach((c) => (c.rating = ratings.get(c.id) ?? null));
  return cards;
}

/** Product categories that this shop type usually stocks (category-level only; never a per-branch claim). */
export async function getProductCategoriesForStoreTypes(storeTypeSlugs: string[]) {
  if (storeTypeSlugs.length === 0) return [];
  return db.category.findMany({
    where: { kind: "PRODUCT", storeTypes: { some: { slug: { in: storeTypeSlugs } } } },
    orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, emoji: true },
  });
}

export async function getStoreCardsByIds(ids: string[], origin?: LatLng | null) {
  if (ids.length === 0) return [];
  const rows = await db.branch.findMany({ where: { id: { in: ids }, isActive: true }, include: cardInclude });
  const cards = rows.map((b) => toStoreCard(b, { origin }));
  const ratings = await ratingsFor(cards.map((c) => c.id));
  cards.forEach((c) => (c.rating = ratings.get(c.id) ?? null));
  const order = new Map(ids.map((id, i) => [id, i]));
  return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
