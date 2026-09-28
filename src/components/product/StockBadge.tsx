import { Badge } from "@/components/ui/Badge";
import { getStockStatusLabel, stockStatusMap, type StockStatus } from "@/config/stock-status";

export function StockBadge({ status }: { status: string }) {
  const def = stockStatusMap[status as StockStatus];
  return <Badge className={def?.badgeClass ?? "bg-ink-50 text-ink-600 ring-ink-100"}>{getStockStatusLabel(status)}</Badge>;
}
