import Link from "next/link";
import type { Metadata } from "next";
import { Package, ClipboardList, AlertTriangle, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrderStatusLabel } from "@/config/order-status";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "管理后台总览", robots: { index: false } };
export const dynamic = "force-dynamic";

async function getDashboardData() {
  const supabase = await createClient();

  const [productsCount, lowStockCount, outOfStockCount, newOrdersCount, recentOrders] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("stock_status", "low_stock"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("stock_status", "out_of_stock"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(6),
  ]);

  return {
    totalProducts: productsCount.count ?? 0,
    lowStock: lowStockCount.count ?? 0,
    outOfStock: outOfStockCount.count ?? 0,
    newOrders: newOrdersCount.count ?? 0,
    recentOrders: recentOrders.data ?? [],
    error: productsCount.error || newOrdersCount.error || recentOrders.error ? true : false,
  };
}

export default async function AdminDashboardPage() {
  const { totalProducts, lowStock, outOfStock, newOrders, recentOrders, error } = await getDashboardData();

  if (error) {
    return <p className="rounded-xl bg-white p-6 text-sm text-ink-500">仪表板数据加载失败，请检查Supabase连接设置。</p>;
  }

  const stats = [
    { label: "新订单", value: newOrders, icon: ClipboardList, href: "/admin/orders?status=new", accent: "bg-amber-100 text-amber-700" },
    { label: "商品总数", value: totalProducts, icon: Package, href: "/admin/products", accent: "bg-brand-100 text-brand-700" },
    { label: "库存有限", value: lowStock, icon: AlertTriangle, href: "/admin/products?stock=low_stock", accent: "bg-gold-100 text-gold-700" },
    { label: "缺货商品", value: outOfStock, icon: TrendingUp, href: "/admin/products?stock=out_of_stock", accent: "bg-zinc-200 text-zinc-700" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink-900">总览</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 transition hover:shadow-md"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.accent}`}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold text-ink-900">{stat.value}</p>
              <p className="text-sm text-ink-500">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">最新订单</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            查看全部
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">暂无订单</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-ink-400">
                  <th className="pb-2 font-medium">客户</th>
                  <th className="pb-2 font-medium">金额</th>
                  <th className="pb-2 font-medium">状态</th>
                  <th className="pb-2 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                        {order.customer_name}
                      </Link>
                    </td>
                    <td className="py-3 text-ink-700">{formatCurrency(order.total_amount)}</td>
                    <td className="py-3 text-ink-700">{getOrderStatusLabel(order.status)}</td>
                    <td className="py-3 text-ink-400">{formatDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
