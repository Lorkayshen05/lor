import Link from "next/link";
import { categories } from "@/config/categories";
import { CategoryIcon } from "@/components/product/CategoryIcon";

export function CategoryNav({ activeCategory }: { activeCategory?: string }) {
  return (
    <nav aria-label="商品分类" className="relative border-b border-ink-100/70 bg-white">
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
      {/* Hints that the row scrolls further right - hidden once every category
          fits on screen (lg+), since there's nothing left to scroll to there. */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent lg:hidden" />
    </nav>
  );
}
