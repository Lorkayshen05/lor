import Link from "next/link";
import { categories } from "@/config/categories";
import { CategoryIcon } from "@/components/product/CategoryIcon";

export function CategoryNav({ activeCategory }: { activeCategory?: string }) {
  return (
    <nav aria-label="商品分类" className="border-b border-ink-100/70 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/products"
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !activeCategory
              ? "bg-brand-600 text-white"
              : "text-ink-600 hover:bg-cream-200"
          }`}
        >
          全部商品
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === category.slug
                ? "bg-brand-600 text-white"
                : "text-ink-600 hover:bg-cream-200"
            }`}
          >
            <CategoryIcon slug={category.slug} className="h-4 w-4" />
            {category.shortLabel}
          </Link>
        ))}
      </div>
    </nav>
  );
}
