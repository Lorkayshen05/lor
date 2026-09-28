"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { isPurchasable } from "@/config/stock-status";
import type { Product } from "@/lib/types/database";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const purchasable = isPurchasable(product.stock_status);

  function handleAdd() {
    if (!purchasable) return;
    addItem(product, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  if (!purchasable) {
    return (
      <Button variant="outline" disabled className="w-full sm:w-auto">
        暂时缺货
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper value={quantity} onChange={setQuantity} />
      <Button onClick={handleAdd} className="min-w-36">
        {justAdded ? (
          <>
            <Check className="h-4 w-4" /> 已加入购物车
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" /> 加入购物车
          </>
        )}
      </Button>
    </div>
  );
}
