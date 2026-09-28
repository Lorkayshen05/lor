import { siteConfig } from "@/config/site";
import { formatCurrency } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types/database";

export function buildOrderWhatsAppMessage(
  order: Pick<Order, "id" | "customer_name" | "phone" | "address" | "notes" | "total_amount">,
  items: Pick<OrderItem, "product_name" | "unit" | "quantity" | "price">[]
): string {
  const orderNumber = order.id.slice(0, 8).toUpperCase();

  const itemLines = items
    .map((item, index) => {
      const subtotal = item.price * item.quantity;
      const unit = item.unit ? item.unit : "";
      return `${index + 1}. ${item.product_name} x${item.quantity}${unit} — ${formatCurrency(
        item.price
      )} = ${formatCurrency(subtotal)}`;
    })
    .join("\n");

  const lines = [
    `【${siteConfig.name}】新订单通知`,
    `订单编号：#${orderNumber}`,
    "",
    "客户资料：",
    `姓名：${order.customer_name}`,
    `电话：${order.phone}`,
    `地址：${order.address}`,
    "",
    "订购商品：",
    itemLines,
    "",
    `总计：${formatCurrency(order.total_amount)}`,
  ];

  if (order.notes && order.notes.trim().length > 0) {
    lines.push("", `备注：${order.notes.trim()}`);
  }

  lines.push("", "谢谢惠顾！");

  return lines.join("\n");
}

export function buildWhatsAppLink(message: string, phoneNumber: string = siteConfig.whatsappNumber): string {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
