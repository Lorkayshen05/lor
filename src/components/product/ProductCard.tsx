import Link from "next/link";
import { ProductImage } from "./ProductImage";
import { StockBadge } from "./StockBadge";
import { QuickAddButton } from "./QuickAddButton";
import { getCategoryLabel } from "@/config/categories";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types/database";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100/70 bg-white transition-shadow hover:shadow-lg hover:shadow-ink-900/5"
    >
      <div className="relative aspect-square w-full">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute right-3 top-3">
          <StockBadge status={product.stock_status} />
        </div>
        <div className="absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
          <QuickAddButton product={product} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium text-brand-500">{getCategoryLabel(product.category)}</span>
        <h3 className="line-clamp-2 font-display text-base font-semibold text-ink-900">{product.name}</h3>
        <div className="mt-auto flex items-baseline gap-1 pt-2">
          <span className="font-display text-lg font-bold text-brand-700">
            {formatCurrency(product.price)}
          </span>
          <span className="text-xs text-ink-400">/ {product.unit}</span>
        </div>
      </div>
    </Link>
  );
}
