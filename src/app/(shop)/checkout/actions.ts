"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validation/order";
import { isPurchasable } from "@/config/stock-status";
import { siteConfig } from "@/config/site";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createOrder(input: CheckoutFormValues): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "请检查表单内容是否填写正确。",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { customerName, phone, address, notes, items } = parsed.data;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { ok: false, error: "服务器配置错误，暂时无法提交订单，请通过WhatsApp联系我们下单。" };
  }

  const productIds = items.map((item) => item.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, unit, stock_status")
    .in("id", productIds);

  if (productsError) {
    return { ok: false, error: "无法验证商品信息，请稍后再试。" };
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const unavailable: string[] = [];

  const orderItemsToInsert = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product || !isPurchasable(product.stock_status)) {
      unavailable.push(product?.name ?? "未知商品");
      return null;
    }
    return {
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      quantity: item.quantity,
      price: product.price,
    };
  });

  if (unavailable.length > 0) {
    return {
      ok: false,
      error: `以下商品目前无法购买，请从购物车移除后重试：${unavailable.join("、")}`,
    };
  }

  const validItems = orderItemsToInsert.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  const totalAmount = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (siteConfig.minOrderAmount > 0 && totalAmount < siteConfig.minOrderAmount) {
    return {
      ok: false,
      error: `订单未达最低金额 ${siteConfig.currencySymbol}${siteConfig.minOrderAmount.toFixed(2)}。`,
    };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: customerName,
      phone,
      address,
      notes: notes || null,
      total_amount: totalAmount,
      status: "new",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: `订单保存失败：${orderError?.message ?? "未知错误"}` };
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(validItems.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    // Roll back the order so we don't leave an order with no items behind.
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: `订单商品保存失败：${itemsError.message}` };
  }

  return { ok: true, orderId: order.id };
}
