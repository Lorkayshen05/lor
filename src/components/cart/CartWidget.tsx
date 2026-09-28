"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "./CartDrawer";

export function CartWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="打开购物车"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition hover:bg-cream-200"
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>
      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
