"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories } from "@/config/categories";

const sortOptions = [
  { value: "newest", label: "最新上架" },
  { value: "price-asc", label: "价格：低到高" },
  { value: "price-desc", label: "价格：高到低" },
];

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const q = searchParams.get("q") ?? "";

  function navigate(next: { category?: string; sort?: string }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const nextCategory = next.category !== undefined ? next.category : category;
    const nextSort = next.sort !== undefined ? next.sort : sort;

    if (nextCategory) params.set("category", nextCategory);
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);

    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={category}
        onChange={(e) => navigate({ category: e.target.value })}
        className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm text-ink-800 outline-none focus:border-brand-400"
        aria-label="按分类筛选"
      >
        <option value="">全部分类</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => navigate({ sort: e.target.value })}
        className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm text-ink-800 outline-none focus:border-brand-400"
        aria-label="排序方式"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
