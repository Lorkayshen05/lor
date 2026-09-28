import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { categories } from "@/config/categories";
import { getProducts } from "@/lib/data/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/products`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${siteConfig.url}/products?category=${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  try {
    const products = await getProducts();
    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${siteConfig.url}/products/${product.id}`,
      lastModified: product.updated_at,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
