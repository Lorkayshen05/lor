import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { buildOrderWhatsAppMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { OrderWithItems } from "@/lib/types/database";

export const metadata: Metadata = { title: "订单详情", robots: { index: false } };
export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="rounded-xl bg-white p-6 text-sm text-ink-500">订单加载失败：{error.message}</p>;
  }

  if (!order) {
    notFound();
  }

  const typedOrder = order as OrderWithItems;
  const whatsappLink = buildWhatsAppLink(
    buildOrderWhatsAppMessage(typedOrder, typedOrder.order_items),
    typedOrder.phone
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/orders" className="flex w-fit items-center gap-1 text-sm text-ink-500 hover:text-brand-600">
        <ChevronLeft className="h-4 w-4" /> 返回订单列表
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            订单 #{typedOrder.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-ink-400">{formatDateTime(typedOrder.created_at)}</p>
        </div>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <MessageCircle className="h-4 w-4" /> 联系客户
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">订单商品</h2>
          <ul className="divide-y divide-ink-100">
            {typedOrder.order_items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{item.product_name}</p>
                  <p className="text-ink-400">
                    {formatCurrency(item.price)} x {item.quantity}
                    {item.unit}
                  </p>
                </div>
                <span className="font-medium text-ink-800">{formatCurrency(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
            <span className="font-semibold text-ink-800">总计</span>
            <span className="font-display text-xl font-bold text-brand-700">
              {formatCurrency(typedOrder.total_amount)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">客户资料</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-400">姓名</dt>
                <dd className="text-right text-ink-800">{typedOrder.customer_name}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-400">电话</dt>
                <dd className="text-right text-ink-800">{typedOrder.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="shrink-0 text-ink-400">地址</dt>
                <dd className="text-right text-ink-800">{typedOrder.address}</dd>
              </div>
              {typedOrder.notes && (
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-ink-400">备注</dt>
                  <dd className="text-right text-ink-800">{typedOrder.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">订单状态</h2>
            <OrderStatusForm orderId={typedOrder.id} currentStatus={typedOrder.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
