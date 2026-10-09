import type { CartItem, MenuItem, Money, Order, OrderType } from '../types';
import { ApiError, toClientOrder, type ApiClient } from './api';
import { buildOrder } from './orderHistory';

export interface OrderContact {
  name: string;
  phone: string;
}

export interface OrderSubmission {
  items: CartItem[];
  orderType: OrderType;
  tableNumber?: string;
  pickupInMinutes?: number;
  contact: OrderContact;
  /** The total the customer saw. The server compares it with its own price and never trusts it. */
  expectedTotal: Money;
  /** Anonymous per-device id. */
  customerId: string;
  language: string;
  idempotencyKey: string;
}

/**
 * Sends an order to the restaurant. Resolves with the saved order; throws:
 *  - PriceChangedError   the server's price differs from what the customer saw (nothing was saved)
 *  - OrderRejectedError  the server refused it (unavailable item, ordering closed, invalid details)
 *  - NetworkError / other  we don't know whether it was saved — the caller retries with the SAME key
 */
export interface OrderGateway {
  submit(submission: OrderSubmission): Promise<Order>;
}

export class PriceChangedError extends Error {
  constructor(public currentTotal: Money) {
    super('Prices changed');
    this.name = 'PriceChangedError';
  }
}
export class OrderRejectedError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'OrderRejectedError';
  }
}

export function createHttpGateway(api: ApiClient): OrderGateway {
  return {
    async submit(s) {
      try {
        const res = await api.submitOrder(
          {
            items: s.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
            orderType: s.orderType,
            tableNumber: s.orderType === 'dine-in' ? s.tableNumber : undefined,
            pickupInMinutes: s.orderType === 'takeaway' ? s.pickupInMinutes : undefined,
            contact: s.contact,
            expectedTotal: s.expectedTotal,
            customerRef: s.customerId,
            language: s.language,
          },
          s.idempotencyKey,
        );
        return toClientOrder(res.order, res.trackingToken, s.customerId);
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.code === 'PRICE_CHANGED') throw new PriceChangedError((e.details as { currentTotal: Money }).currentTotal);
          // 4xx = the server understood and said no. 5xx / 408 / 429 = not sure, so let the caller retry.
          if (e.code === 'MENU_NOT_CONFIGURED' || (e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429)) {
            throw new OrderRejectedError(e.code, e.message, e.details);
          }
        }
        throw e;
      }
    },
  };
}

/** Prototype mode (no server): builds and accepts the order on the device. Prices here are NOT authoritative. */
export function createLocalGateway(menuById: ReadonlyMap<string, MenuItem>): OrderGateway {
  return {
    async submit(s) {
      return buildOrder({ cart: s.items, orderType: s.orderType, tableNumber: s.tableNumber, pickupInMinutes: s.pickupInMinutes }, menuById, s.customerId);
    },
  };
}
