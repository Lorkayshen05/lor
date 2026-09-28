import Link from "next/link";
import { categories } from "@/config/categories";
import { CategoryIcon } from "@/components/product/CategoryIcon";

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/products?category=${category.slug}`}
          className="group flex flex-col items-center gap-3 rounded-2xl border border-ink-100/70 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-ink-900/5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
            <CategoryIcon slug={category.slug} className="h-6 w-6" />
          </span>
          <span className="font-display text-sm font-semibold text-ink-900">{category.label}</span>
        </Link>
      ))}
    </div>
  );
}
