import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderWithItems } from "@/lib/types/database";

/**
 * Fetches an order for the public confirmation page using the service-role
 * client. The order id is a random UUID generated server-side at creation
 * time, so it functions as an unguessable access token — no customer
 * account/session is required to view their own confirmation.
 */
export async function getOrderConfirmation(orderId: string): Promise<OrderWithItems | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`无法读取订单：${error.message}`);
  }

  return data as OrderWithItems | null;
}
