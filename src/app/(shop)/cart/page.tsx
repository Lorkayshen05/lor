"use client";

import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { ProductImage } from "@/components/product/ProductImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getCategoryLabel } from "@/config/categories";
import { formatCurrency } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, isHydrated } = useCart();

  if (!isHydrated) {
    return <div className="mx-auto max-w-4xl px-4 py-16" />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title="购物车是空的"
          description="快去挑选一些新鲜食材吧！"
          action={<LinkButton href="/products">开始选购</LinkButton>}
        />
      </div>
    );
  }

  const belowMinimum = siteConfig.minOrderAmount > 0 && subtotal < siteConfig.minOrderAmount;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-900">购物车</h1>

      <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
            <Link href={`/products/${item.productId}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24">
              <ProductImage
                src={item.imageUrl}
                alt={item.name}
                category={item.category}
                className="h-full w-full"
                sizes="96px"
              />
            </Link>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-brand-500">{getCategoryLabel(item.category)}</span>
                  <Link href={`/products/${item.productId}`} className="block font-display font-semibold text-ink-900 hover:text-brand-600">
                    {item.name}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`移除 ${item.name}`}
                  className="shrink-0 rounded-full p-1.5 text-ink-300 hover:bg-ink-50 hover:text-brand-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-ink-400">
                {formatCurrency(item.price)} / {item.unit}
              </p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <QuantityStepper value={item.quantity} onChange={(next) => updateQuantity(item.productId, next)} />
                <span className="font-display text-base font-semibold text-brand-700">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col items-end gap-3 rounded-2xl border border-ink-100 bg-white p-5">
        <div className="flex w-full items-center justify-between text-base">
          <span className="text-ink-500">小计</span>
          <span className="font-display text-xl font-bold text-brand-700">{formatCurrency(subtotal)}</span>
        </div>
        {belowMinimum && (
          <p className="text-sm text-brand-600">
            未达最低订购金额 {formatCurrency(siteConfig.minOrderAmount)}，请继续添加商品。
          </p>
        )}
        <div className="flex w-full gap-3 sm:w-auto">
          <LinkButton href="/products" variant="outline" className="flex-1 sm:flex-none">
            继续选购
          </LinkButton>
          {belowMinimum ? (
            <button
              type="button"
              disabled
              className="flex-1 cursor-not-allowed rounded-full bg-ink-100 px-5 py-2.5 text-sm font-medium text-ink-400 sm:flex-none"
            >
              去结算
            </button>
          ) : (
            <LinkButton href="/checkout" className="flex-1 sm:flex-none">
              去结算
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
