import type { Order, VisitType } from '../types';

/** Derived purely from real order history: 0 orders = first, 1 = second, 2+ = returning. */
export function getVisitType(orders: readonly Order[]): VisitType {
  const placed = orders.filter((o) => o.status !== 'cancelled').length;
  if (placed === 0) return 'first';
  if (placed === 1) return 'second';
  return 'returning';
}

export function orderedItemIds(orders: readonly Order[]): Set<string> {
  return new Set(orders.filter((o) => o.status !== 'cancelled').flatMap((o) => o.items.map((i) => i.itemId)));
}

export function latestOrder(orders: readonly Order[]): Order | undefined {
  return [...orders]
    .filter((o) => o.status !== 'cancelled')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}
