import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCategoryLabel } from "@/config/categories";
import { StockBadge } from "@/components/product/StockBadge";
import { ProductImage } from "@/components/product/ProductImage";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "商品管理", robots: { index: false } };
export const dynamic = "force-dynamic";

interface AdminProductsPageProps {
  searchParams: Promise<{ stock?: string }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const { stock } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (stock) query = query.eq("stock_status", stock);

  const { data: products, error } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">商品管理</h1>
        <LinkButton href="/admin/products/new">
          <Plus className="h-4 w-4" /> 新增商品
        </LinkButton>
      </div>

      {error ? (
        <p className="rounded-xl bg-white p-6 text-sm text-ink-500">商品加载失败：{error.message}</p>
      ) : !products || products.length === 0 ? (
        <EmptyState title="暂无商品" description="点击右上角新增第一件商品。" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-cream-50 text-left text-ink-400">
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">价格</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">精选</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                        <ProductImage src={product.image_url} alt={product.name} category={product.category} className="h-full w-full" sizes="40px" />
                      </div>
                      <span className="font-medium text-ink-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{getCategoryLabel(product.category)}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {formatCurrency(product.price)} / {product.unit}
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge status={product.stock_status} />
                  </td>
                  <td className="px-4 py-3 text-ink-500">{product.featured ? "是" : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        aria-label={`编辑 ${product.name}`}
                        className="rounded-full p-2 text-ink-400 hover:bg-cream-200 hover:text-ink-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteProductButton id={product.id} name={product.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
