import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export const metadata: Metadata = { title: "新增商品", robots: { index: false } };

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink-900">新增商品</h1>
      <ProductForm action={createProduct} />
    </div>
  );
}
