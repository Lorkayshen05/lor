"use client";

import Link from "next/link";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { QuantityStepper } from "./QuantityStepper";
import { ProductImage } from "@/components/product/ProductImage";
import { Button, LinkButton } from "@/components/ui/Button";
import { cn, formatCurrency } from "@/lib/utils";

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink-900/40 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col bg-cream-50 shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="购物车"
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">我的购物车</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭购物车"
            className="rounded-full p-2 text-ink-500 hover:bg-ink-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-ink-300" />
            <p className="text-ink-500">购物车是空的</p>
            <Button variant="outline" onClick={onClose}>
              继续购物
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="h-full w-full"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-ink-900">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`移除 ${item.name}`}
                        className="shrink-0 text-ink-300 hover:text-brand-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-ink-400">
                      {formatCurrency(item.price)} / {item.unit}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        onChange={(next) => updateQuantity(item.productId, next)}
                      />
                      <span className="font-display text-sm font-semibold text-brand-700">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-500">小计</span>
                <span className="font-display text-lg font-bold text-brand-700">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LinkButton href="/cart" variant="outline" onClick={onClose}>
                  查看购物车
                </LinkButton>
                <LinkButton href="/checkout" onClick={onClose}>
                  去结算
                </LinkButton>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
