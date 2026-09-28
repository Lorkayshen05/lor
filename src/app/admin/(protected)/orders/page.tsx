import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { orderStatuses, getOrderStatusLabel, orderStatusMap, type OrderStatus } from "@/config/order-status";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "订单管理", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface AdminOrdersPageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) query = query.eq("status", status);

  const { data: orders, error, count } = await query;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink-900">订单管理</h1>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium",
            !status ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-cream-200"
          )}
        >
          全部
        </Link>
        {orderStatuses.map((s) => (
          <Link
            key={s.value}
            href={`/admin/orders?status=${s.value}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium",
              status === s.value ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-cream-200"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-white p-6 text-sm text-ink-500">订单加载失败：{error.message}</p>
      ) : !orders || orders.length === 0 ? (
        <EmptyState title="暂无订单" description="目前没有符合条件的订单。" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-cream-50 text-left text-ink-400">
                <th className="px-4 py-3 font-medium">客户</th>
                <th className="px-4 py-3 font-medium">电话</th>
                <th className="px-4 py-3 font-medium">金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">下单时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-ink-50 last:border-0 hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {order.customer_name}
                    </Link>
                    <span className="ml-2 text-xs text-ink-300">#{order.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{order.phone}</td>
                  <td className="px-4 py-3 text-ink-600">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge className={orderStatusMap[order.status as OrderStatus]?.badgeClass ?? "bg-ink-50 text-ink-600 ring-ink-100"}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-400">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && orders && orders.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/orders" searchParams={{ status }} />
      )}
    </div>
  );
}
