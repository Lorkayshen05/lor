import type { CartItem, MenuItem, Order, OrderType } from '../types';
import { safeStorage } from '../utils/storage';
import { priceCart } from './pricing';

/**
 * Storage contract for order history. The app only talks to this interface.
 *
 * Prototype: `localOrderRepository` (this device only, localStorage).
 * Production: implement the same interface against a secure backend (auth'd,
 * server-side customer ids, retention policy) and swap it in `src/state`.
 *
 * Privacy: orders contain an anonymous device id, items, totals and table number.
 * Names and phone numbers are NOT persisted in history.
 */
export interface OrderRepository {
  getCustomerId(): string;
  list(): Order[];
  add(order: Order): void;
  get(orderId: string): Order | undefined;
  clear(): void;
}

const ORDERS_KEY = 'rdh.orders.v1';
const CUSTOMER_KEY = 'rdh.customerId.v1';
const MAX_STORED = 100;

function randomId(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isOrder(value: unknown): value is Order {
  const o = value as Order;
  return (
    !!o &&
    typeof o.orderId === 'string' &&
    Array.isArray(o.items) &&
    typeof o.total === 'number' &&
    typeof o.timestamp === 'string' &&
    (o.orderType === 'dine-in' || o.orderType === 'takeaway')
  );
}

export const localOrderRepository: OrderRepository = {
  getCustomerId() {
    let id = safeStorage.get<string | null>(CUSTOMER_KEY, null);
    if (!id) {
      id = randomId();
      safeStorage.set(CUSTOMER_KEY, id);
    }
    return id;
  },
  list() {
    const raw = safeStorage.get<unknown>(ORDERS_KEY, []);
    return (Array.isArray(raw) ? raw.filter(isOrder) : [])
      .map((o) => ((o.status as string) === 'received' ? { ...o, status: 'new' as const } : o)) // legacy value
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  add(order) {
    safeStorage.set(ORDERS_KEY, [order, ...this.list()].slice(0, MAX_STORED));
  },
  get(orderId) {
    return this.list().find((o) => o.orderId === orderId);
  },
  clear() {
    safeStorage.remove(ORDERS_KEY);
  },
};

export interface OrderDraft {
  cart: CartItem[];
  orderType: OrderType;
  tableNumber?: string;
  pickupInMinutes?: number;
}

export function makeOrderId(now = new Date()): string {
  const ymd = `${now.getFullYear() % 100}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const suffix = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `RDH-${ymd}-${suffix}`;
}

/** Build an Order snapshot (prices and names frozen at order time) from a draft. */
export function buildOrder(
  draft: OrderDraft,
  menu: ReadonlyMap<string, MenuItem>,
  customerId: string,
  now = new Date(),
): Order {
  const priced = priceCart(draft.cart, menu, draft.orderType);
  return {
    orderId: makeOrderId(now),
    customerId,
    items: priced.lines.map((l) => ({
      itemId: l.item.id,
      name: l.item.name,
      chineseName: l.item.chineseName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
    total: priced.total,
    orderType: draft.orderType,
    tableNumber: draft.orderType === 'dine-in' ? draft.tableNumber?.trim().toUpperCase() : undefined,
    pickupInMinutes: draft.orderType === 'takeaway' ? draft.pickupInMinutes : undefined,
    timestamp: now.toISOString(),
    status: 'new',
  };
}

/**
 * Sends an order to the restaurant. Prototype: stores locally and resolves.
 * Production: POST to the ordering backend and reject with a readable Error on failure;
 * the checkout page already renders that failure state with a retry.
 */
