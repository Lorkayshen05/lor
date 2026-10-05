import type { CartItem, MenuItem, Money, OrderType } from '../types';

/** The ONE place that decides which price applies. Components must not read dineInPrice/takeawayPrice directly. */
export function getUnitPrice(item: MenuItem, orderType: OrderType): Money {
  return orderType === 'dine-in' ? item.dineInPrice : item.takeawayPrice;
}

export function getLineTotal(item: MenuItem, quantity: number, orderType: OrderType): Money {
  return getUnitPrice(item, orderType) * quantity;
}

export interface PricedLine {
  item: MenuItem;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface CartTotals {
  lines: PricedLine[];
  /** Cart entries whose product no longer exists or is unavailable. */
  unavailable: CartItem[];
  count: number;
  subtotal: Money;
  total: Money;
}

export function priceCart(
  cart: CartItem[],
  menu: ReadonlyMap<string, MenuItem>,
  orderType: OrderType,
): CartTotals {
  const lines: PricedLine[] = [];
  const unavailable: CartItem[] = [];
  for (const entry of cart) {
    const item = menu.get(entry.itemId);
    if (!item || !item.available) {
      unavailable.push(entry);
      continue;
    }
    const unitPrice = getUnitPrice(item, orderType);
    lines.push({ item, quantity: entry.quantity, unitPrice, lineTotal: unitPrice * entry.quantity });
  }
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  // No service charge / tax is configured: total === subtotal. Add fees here if the restaurant needs them.
  return { lines, unavailable, count, subtotal, total: subtotal };
}
