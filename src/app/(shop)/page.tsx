import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedProducts } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { TrustSection } from "@/components/home/TrustSection";
import { LinkButton } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import type { Product } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let featuredProducts: Product[] = [];
  let featuredError: string | null = null;

  try {
    featuredProducts = await getFeaturedProducts(8);
  } catch {
    featuredError = "暂时无法加载精选商品，请稍后再试。";
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 60%, white 0, transparent 40%)",
          }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold-200 ring-1 ring-white/20">
              每日新鲜直送 · 欢迎WhatsApp下单
            </span>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
              {siteConfig.name}
            </h1>
            <p className="mt-4 text-balance text-base text-cream-100/90 sm:text-lg">
              {siteConfig.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/products" variant="secondary" size="lg">
                立即选购 <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                href="/products?category=pork"
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:border-white hover:bg-white/10 hover:text-white"
              >
                浏览新鲜猪肉
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">商品分类</h2>
        </div>
        <CategoryGrid />
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">精选推荐</h2>
            <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              查看全部 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {featuredError ? (
            <p className="rounded-xl bg-cream-200 px-4 py-6 text-center text-sm text-ink-500">{featuredError}</p>
          ) : (
            <ProductGrid products={featuredProducts} />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <TrustSection />
      </section>
    </div>
  );
}
