"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

export default function CheckoutPage() {
  const { items, isHydrated } = useCart();

  if (!isHydrated) {
    return <div className="mx-auto max-w-5xl px-4 py-16" />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title="购物车是空的，无法结算"
          description="请先选购商品再进行结算。"
          action={<LinkButton href="/products">开始选购</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 font-display text-2xl font-bold text-ink-900">结算</h1>
      <CheckoutForm />
    </div>
  );
}
