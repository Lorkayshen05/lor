import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts, type ProductSort } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { getCategoryLabel, isCategorySlug } from "@/config/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "全部商品",
  description: "浏览新鲜猪肉、鸡肉、牛肉、海鲜及各类冷冻食材。",
};

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category && isCategorySlug(params.category) ? params.category : undefined;
  const q = params.q?.trim() || undefined;
  const sort: ProductSort =
    params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "newest";

  let products;
  let loadError: string | null = null;
  try {
    products = await getProducts({ category, q, sort });
  } catch {
    products = [];
    loadError = "商品加载失败，请稍后重试。";
  }

  const heading = q ? `搜索"${q}"的结果` : category ? getCategoryLabel(category) : "全部商品";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{heading}</h1>
          <p className="mt-1 text-sm text-ink-400">共 {products.length} 件商品</p>
        </div>
        <Suspense fallback={<div className="h-10 w-64 animate-pulse rounded-full bg-ink-100" />}>
          <ProductFilters />
        </Suspense>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-cream-200 px-4 py-6 text-center text-sm text-ink-500">{loadError}</p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
