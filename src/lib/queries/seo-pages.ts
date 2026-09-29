import { db } from "@/lib/db";
import { haversineKm } from "@/lib/geo";

/**
 * Location SEO pages (/[area]/[topic]) are only "real" when there is at least one actual listing
 * within the area's radius for that store type. Pairs with no listings 404 and stay out of the sitemap,
 * which keeps us clear of thin "doorway" pages.
 */
export async function getAreaTopicPage(areaSlug: string, topicSlug: string) {
  const [area, topic] = await Promise.all([
    db.area.findFirst({ where: { slug: areaSlug, isActive: true } }),
    db.category.findFirst({ where: { slug: topicSlug, kind: "STORE_TYPE" } }),
  ]);
  if (!area || !topic) return null;
  const branches = await db.branch.findMany({
    where: { isActive: true, business: { isPublished: true }, categories: { some: { id: topic.id } }, lat: { not: null }, lng: { not: null } },
    include: { business: { select: { name: true, claimStatus: true } }, area: { select: { name: true, slug: true } } },
  });
  const near = branches
    .map((b) => ({ branch: b, km: haversineKm({ lat: area.lat, lng: area.lng }, { lat: b.lat!, lng: b.lng! }) }))
    .filter((x) => x.km <= area.radiusKm)
    .sort((a, b) => a.km - b.km);
  if (near.length === 0) return null;
  const inArea = near.filter((n) => n.branch.area.slug === area.slug).length;
  const relatedArticles = await db.article.findMany({
    where: { status: "PUBLISHED", OR: [{ areaSlug: area.slug }, { categorySlug: topic.slug }] },
    take: 3, orderBy: { publishedAt: "desc" }, select: { slug: true, title: true, excerpt: true },
  });
  const nearbyAreas = await db.area.findMany({ where: { isActive: true, id: { not: area.id } }, select: { slug: true, name: true, lat: true, lng: true } });
  const otherAreas = nearbyAreas
    .map((a) => ({ ...a, km: haversineKm({ lat: area.lat, lng: area.lng }, a) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);
  return { area, topic, near, inArea, relatedArticles, otherAreas };
}

export async function listSeoPages(): Promise<{ area: string; topic: string }[]> {
  const [areas, topics, branches] = await Promise.all([
    db.area.findMany({ where: { isActive: true } }),
    db.category.findMany({ where: { kind: "STORE_TYPE" }, select: { id: true, slug: true } }),
    db.branch.findMany({ where: { isActive: true, business: { isPublished: true }, lat: { not: null }, lng: { not: null } }, select: { lat: true, lng: true, categories: { select: { id: true } } } }),
  ]);
  const out: { area: string; topic: string }[] = [];
  for (const a of areas) {
    for (const t of topics) {
      const has = branches.some((b) => b.categories.some((c) => c.id === t.id) && haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat!, lng: b.lng! }) <= a.radiusKm);
      if (has) out.push({ area: a.slug, topic: t.slug });
    }
  }
  return out;
}
