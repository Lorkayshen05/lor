import type { CartItem, Order } from '../types';
import type { MenuItem } from '../types';
import { CHECKOUT_CONFIG } from '../data/restaurant';

export type CartAction =
  | { type: 'add'; itemId: string; quantity?: number }
  | { type: 'remove'; itemId: string }
  | { type: 'setQuantity'; itemId: string; quantity: number }
  | { type: 'increment'; itemId: string }
  | { type: 'decrement'; itemId: string }
  | { type: 'addMany'; items: CartItem[] }
  | { type: 'replace'; items: CartItem[] }
  | { type: 'clear' };

const MAX = CHECKOUT_CONFIG.maxQuantityPerItem;

/** Clamp to a whole number in [0, MAX]; NaN/Infinity become 0. */
export function clampQuantity(q: number): number {
  if (!Number.isFinite(q)) return 0;
  return Math.min(MAX, Math.max(0, Math.floor(q)));
}

function upsert(cart: CartItem[], itemId: string, quantity: number): CartItem[] {
  const next = clampQuantity(quantity);
  const exists = cart.some((c) => c.itemId === itemId);
  if (next === 0) return cart.filter((c) => c.itemId !== itemId);
  if (!exists) return [...cart, { itemId, quantity: next }];
  return cart.map((c) => (c.itemId === itemId ? { ...c, quantity: next } : c));
}

export function cartReducer(cart: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const current = cart.find((c) => c.itemId === action.itemId)?.quantity ?? 0;
      const delta = Math.floor(action.quantity ?? 1);
      if (delta <= 0) return cart;
      return upsert(cart, action.itemId, current + delta);
    }
    case 'increment': {
      const current = cart.find((c) => c.itemId === action.itemId)?.quantity ?? 0;
      return upsert(cart, action.itemId, current + 1);
    }
    case 'decrement': {
      const current = cart.find((c) => c.itemId === action.itemId)?.quantity ?? 0;
      return upsert(cart, action.itemId, current - 1);
    }
    case 'setQuantity':
      return upsert(cart, action.itemId, action.quantity);
    case 'remove':
      return cart.filter((c) => c.itemId !== action.itemId);
    case 'addMany':
      return action.items.reduce<CartItem[]>(
        (acc, i) => upsert(acc, i.itemId, (acc.find((c) => c.itemId === i.itemId)?.quantity ?? 0) + Math.floor(i.quantity)),
        cart,
      );
    case 'replace':
      return action.items.reduce<CartItem[]>((acc, i) => upsert(acc, i.itemId, i.quantity), []);
    case 'clear':
      return [];
  }
}

export const getQuantity = (cart: CartItem[], itemId: string): number =>
  cart.find((c) => c.itemId === itemId)?.quantity ?? 0;

export const cartCount = (cart: CartItem[]): number => cart.reduce((n, c) => n + c.quantity, 0);

/** Drop stored entries that are malformed (e.g. from older localStorage data). */
export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<CartItem[]>((acc, v) => {
    if (v && typeof v === 'object' && typeof (v as CartItem).itemId === 'string') {
      return upsert(acc, (v as CartItem).itemId, Number((v as CartItem).quantity));
    }
    return acc;
  }, []);
}

/** Turn a past order into a cart. Items no longer on the menu are reported, not silently dropped. */
export function orderToCart(
  order: Order,
  menu: ReadonlyMap<string, MenuItem>,
): { items: CartItem[]; skippedNames: string[] } {
  const items: CartItem[] = [];
  const skippedNames: string[] = [];
  for (const line of order.items) {
    const item = menu.get(line.itemId);
    if (item?.available) items.push({ itemId: line.itemId, quantity: clampQuantity(line.quantity) });
    else skippedNames.push(line.name);
  }
  return { items, skippedNames };
}

/** True when the cart already holds at least every quantity in `wanted` (used to avoid silent double-adds). */
export function cartCovers(cart: CartItem[], wanted: CartItem[]): boolean {
  return wanted.length > 0 && wanted.every((w) => getQuantity(cart, w.itemId) >= w.quantity);
}
