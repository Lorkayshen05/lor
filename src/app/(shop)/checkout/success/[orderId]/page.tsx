import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { getOrderConfirmation } from "@/lib/data/orders";
import { buildOrderWhatsAppMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { LinkButton } from "@/components/ui/Button";
import { getOrderStatusLabel } from "@/config/order-status";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "订单已提交",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface SuccessPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CheckoutSuccessPage({ params }: SuccessPageProps) {
  const { orderId } = await params;
  const order = await getOrderConfirmation(orderId).catch(() => null);

  if (!order) {
    notFound();
  }

  const whatsappMessage = buildOrderWhatsAppMessage(order, order.order_items);
  const whatsappLink = buildWhatsAppLink(whatsappMessage);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <h1 className="font-display text-2xl font-bold text-ink-900">订单已提交！</h1>
        <p className="text-ink-500">
          订单编号 #{order.id.slice(0, 8).toUpperCase()} · {getOrderStatusLabel(order.status)}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
        <p className="text-sm text-brand-800">
          请点击下方按钮，通过WhatsApp将订单信息发送给我们，以便我们尽快为您确认及处理订单。
        </p>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
        >
          <MessageCircle className="h-5 w-5" />
          通过WhatsApp发送订单
        </a>
      </div>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">订单详情</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-ink-400">姓名</dt>
          <dd className="text-right text-ink-800">{order.customer_name}</dd>
          <dt className="text-ink-400">电话</dt>
          <dd className="text-right text-ink-800">{order.phone}</dd>
          <dt className="text-ink-400">地址</dt>
          <dd className="text-right text-ink-800">{order.address}</dd>
          <dt className="text-ink-400">下单时间</dt>
          <dd className="text-right text-ink-800">{formatDateTime(order.created_at)}</dd>
          {order.notes && (
            <>
              <dt className="text-ink-400">备注</dt>
              <dd className="text-right text-ink-800">{order.notes}</dd>
            </>
          )}
        </dl>

        <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100 pt-4">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-700">
                {item.product_name} x{item.quantity}
                {item.unit}
              </span>
              <span className="font-medium text-ink-900">{formatCurrency(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="font-semibold text-ink-800">总计</span>
          <span className="font-display text-xl font-bold text-brand-700">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <LinkButton href="/products" variant="outline">
          继续购物
        </LinkButton>
        <Link href="/" className="ml-4 text-sm text-ink-400 hover:text-brand-600">
          返回首页
        </Link>
      </div>
    </div>
  );
}
