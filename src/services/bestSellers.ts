import type { MenuItem, Order } from '../types';

/** Minimum number of real orders before we are willing to publish a ranking. */
export const BEST_SELLER_MIN_ORDERS = 50;
export const BEST_SELLER_TOP_N = 3;

export interface BestSeller {
  itemId: string;
  rank: number;
  quantitySold: number;
  orderCount: number;
}

/**
 * Real ranking from real order data. Returns null — never a made-up ranking —
 * when there isn't enough evidence yet, so the UI falls back to "Our Signatures".
 * Ranking: quantity sold, then order frequency, then product code (stable).
 */
export function computeBestSellers(
  orders: readonly Order[],
  menu: readonly MenuItem[],
  options: { minOrders?: number; top?: number } = {},
): BestSeller[] | null {
  const { minOrders = BEST_SELLER_MIN_ORDERS, top = BEST_SELLER_TOP_N } = options;
  const valid = orders.filter((o) => o.status !== 'cancelled');
  if (valid.length < minOrders) return null;

  const byId = new Map(menu.map((m) => [m.id, m]));
  const stats = new Map<string, { quantitySold: number; orderCount: number }>();
  for (const order of valid) {
    const seen = new Set<string>();
    for (const line of order.items) {
      if (!byId.get(line.itemId)?.available) continue;
      const s = stats.get(line.itemId) ?? { quantitySold: 0, orderCount: 0 };
      s.quantitySold += line.quantity;
      if (!seen.has(line.itemId)) s.orderCount += 1;
      seen.add(line.itemId);
      stats.set(line.itemId, s);
    }
  }
  const ranked = [...stats.entries()]
    .map(([itemId, s]) => ({ itemId, ...s }))
    .sort(
      (a, b) =>
        b.quantitySold - a.quantitySold ||
        b.orderCount - a.orderCount ||
        (byId.get(a.itemId)!.productCode).localeCompare(byId.get(b.itemId)!.productCode),
    )
    .slice(0, top)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return ranked.length ? ranked : null;
}

/**
 * Where aggregated sales come from. Prototype/local mode has no shared backend,
 * so this returns [] and the UI shows "Our Signatures". In production, implement
 * this against a secure backend endpoint and the UI flips to true Best Sellers
 * automatically once enough real orders exist.
 */
export interface SalesDataSource {
  getOrders(): Promise<Order[]>;
}

export const localSalesDataSource: SalesDataSource = {
  async getOrders() {
    return [];
  },
};
