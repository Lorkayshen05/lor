import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProductById, getRelatedProducts } from "@/lib/data/products";
import { ProductImage } from "@/components/product/ProductImage";
import { StockBadge } from "@/components/product/StockBadge";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getCategoryLabel } from "@/config/categories";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id).catch(() => null);

  if (!product) {
    return { title: "商品未找到" };
  }

  return {
    title: product.name,
    description: product.description || `${product.name} - ${getCategoryLabel(product.category)}`,
    openGraph: product.image_url
      ? { images: [{ url: product.image_url }] }
      : undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product.category, product.id).catch(() => []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-ink-400">
        <Link href="/" className="hover:text-brand-600">
          首页
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/products?category=${product.category}`} className="hover:text-brand-600">
          {getCategoryLabel(product.category)}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-ink-600">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square overflow-hidden rounded-3xl">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            category={product.category}
            className="h-full w-full"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-brand-500">{getCategoryLabel(product.category)}</span>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <StockBadge status={product.stock_status} />
          </div>

          <div className="flex items-baseline gap-2 border-y border-ink-100 py-4">
            <span className="font-display text-3xl font-bold text-brand-700">
              {formatCurrency(product.price)}
            </span>
            <span className="text-sm text-ink-400">/ {product.unit}</span>
          </div>

          {product.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{product.description}</p>
          )}

          <div className="mt-2">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-xl font-bold text-ink-900">相关商品</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
