"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { isPurchasable } from "@/config/stock-status";
import type { Product } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function QuickAddButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const purchasable = isPurchasable(product.stock_status);

  if (!purchasable) return null;

  return (
    <button
      type="button"
      aria-label={`加入购物车：${product.name}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        addItem(product, 1);
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 1200);
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors",
        justAdded ? "bg-emerald-600 text-white" : "bg-white text-brand-600 hover:bg-brand-600 hover:text-white"
      )}
    >
      {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
