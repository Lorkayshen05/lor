/**
 * Product stock status. Keys are stored in the database; labels/colors are
 * display-only and safe to edit.
 */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface StockStatusDef {
  value: StockStatus;
  label: string;
  badgeClass: string;
  purchasable: boolean;
}

export const stockStatuses: StockStatusDef[] = [
  {
    value: "in_stock",
    label: "现货",
    badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
    purchasable: true,
  },
  {
    value: "low_stock",
    label: "库存有限",
    badgeClass: "bg-amber-100 text-amber-800 ring-amber-600/20",
    purchasable: true,
  },
  {
    value: "out_of_stock",
    label: "暂时缺货",
    badgeClass: "bg-zinc-200 text-zinc-600 ring-zinc-500/20",
    purchasable: false,
  },
];

export const stockStatusMap: Record<StockStatus, StockStatusDef> = Object.fromEntries(
  stockStatuses.map((s) => [s.value, s])
) as Record<StockStatus, StockStatusDef>;

export function getStockStatusLabel(value: string): string {
  return stockStatusMap[value as StockStatus]?.label ?? value;
}

export function isPurchasable(value: string): boolean {
  return stockStatusMap[value as StockStatus]?.purchasable ?? false;
}

export const STOCK_STATUS_VALUES = stockStatuses.map((s) => s.value) as [
  StockStatus,
  ...StockStatus[],
];
