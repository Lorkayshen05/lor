"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { orderStatuses } from "@/config/order-status";
import { updateOrderStatus, type OrderStatusState } from "@/app/admin/(protected)/orders/actions";

export function OrderStatusForm({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const action = updateOrderStatus.bind(null, orderId);
  const [state, formAction, isPending] = useActionState<OrderStatusState, FormData>(action, {});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- transient success toast driven by server action result
      setJustSaved(true);
      const timer = window.setTimeout(() => setJustSaved(false), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Select label="订单状态" name="status" defaultValue={currentStatus} className="min-w-40">
        {orderStatuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={isPending} size="md">
        {justSaved ? (
          <>
            <Check className="h-4 w-4" /> 已更新
          </>
        ) : isPending ? (
          "更新中..."
        ) : (
          "更新状态"
        )}
      </Button>
      {state.error && <p className="text-sm text-brand-600">{state.error}</p>}
    </form>
  );
}
