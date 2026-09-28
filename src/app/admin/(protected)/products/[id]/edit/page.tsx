import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/data/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "../../actions";

export const metadata: Metadata = { title: "编辑商品", robots: { index: false } };
export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink-900">编辑商品</h1>
      <ProductForm product={product} action={updateProduct.bind(null, id)} />
    </div>
  );
}
