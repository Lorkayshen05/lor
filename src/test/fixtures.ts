import type { MenuItem, Order } from '../types';
import { MENU } from '../data/menu';

export const byId = (id: string): MenuItem => {
  const item = MENU.find((m) => m.id === id);
  if (!item) throw new Error(`fixture: unknown menu id ${id}`);
  return item;
};

export function makeOrder(itemIds: string[], overrides: Partial<Order> = {}): Order {
  const items = itemIds.map((id) => {
    const m = byId(id);
    return { itemId: id, name: m.name, chineseName: m.chineseName, quantity: 1, unitPrice: m.dineInPrice };
  });
  return {
    orderId: `RDH-T-${Math.random().toString(36).slice(2, 6)}`,
    customerId: 'c1',
    items,
    total: items.reduce((s, i) => s + i.unitPrice, 0),
    orderType: 'dine-in',
    tableNumber: 'A1',
    timestamp: '2025-01-01T10:00:00.000Z',
    status: 'received',
    ...overrides,
  };
}
