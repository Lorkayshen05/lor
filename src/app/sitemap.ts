import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/config/site";
import { listSeoPages } from "@/lib/queries/seo-pages";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [branches, categories, products, articles, seoPages] = await Promise.all([
    db.branch.findMany({ where: { isActive: true, business: { isPublished: true } }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true, kind: true, _count: { select: { branches: true } } } }),
    db.product.findMany({ where: { isPublished: true }, select: { slug: true } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    listSeoPages(),
  ]);
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/stores"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/deals"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/guides"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/business"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.3 },
    ...seoPages.map((p) => ({ url: absoluteUrl(`/${p.area}/${p.topic}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...branches.map((b) => ({ url: absoluteUrl(`/stores/${b.slug}`), lastModified: b.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    // Empty shop-type category pages are noindex, so keep them out of the sitemap too.
    ...categories.filter((c) => c.kind === "PRODUCT" || c._count.branches > 0).map((c) => ({ url: absoluteUrl(`/categories/${c.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: absoluteUrl(`/guides/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
