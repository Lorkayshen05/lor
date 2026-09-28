"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { orderStatusUpdateSchema } from "@/lib/validation/order";

export interface OrderStatusState {
  error?: string;
  success?: boolean;
}

export async function updateOrderStatus(
  orderId: string,
  _prev: OrderStatusState,
  formData: FormData
): Promise<OrderStatusState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const parsed = orderStatusUpdateSchema.safeParse({
    orderId,
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "无效的订单状态" };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId);

  if (error) {
    return { error: `更新失败：${error.message}` };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { success: true };
}
