/**
 * Order lifecycle statuses. Keys are stored in the database; labels/colors
 * are display-only and safe to edit.
 */
export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "completed"
  | "cancelled";

export interface OrderStatusDef {
  value: OrderStatus;
  label: string;
  badgeClass: string;
}

export const orderStatuses: OrderStatusDef[] = [
  {
    value: "new",
    label: "新订单",
    badgeClass: "bg-amber-100 text-amber-800 ring-amber-600/20",
  },
  {
    value: "confirmed",
    label: "已确认",
    badgeClass: "bg-blue-100 text-blue-800 ring-blue-600/20",
  },
  {
    value: "preparing",
    label: "准备中",
    badgeClass: "bg-purple-100 text-purple-800 ring-purple-600/20",
  },
  {
    value: "completed",
    label: "已完成",
    badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  },
  {
    value: "cancelled",
    label: "已取消",
    badgeClass: "bg-zinc-200 text-zinc-600 ring-zinc-500/20",
  },
];

export const orderStatusMap: Record<OrderStatus, OrderStatusDef> = Object.fromEntries(
  orderStatuses.map((s) => [s.value, s])
) as Record<OrderStatus, OrderStatusDef>;

export function getOrderStatusLabel(value: string): string {
  return orderStatusMap[value as OrderStatus]?.label ?? value;
}

export const ORDER_STATUS_VALUES = orderStatuses.map((s) => s.value) as [
  OrderStatus,
  ...OrderStatus[],
];
