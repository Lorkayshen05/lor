import type { MenuItem, Money, Order, OrderStatus, OrderType } from '../types';
import type { GuideAnswer, GuideIntent } from './guide/types';

/** Base URL of the ordering server ("/api" when served from the same origin). Empty = no server: local prototype mode. */
export const API_BASE: string = (import.meta.env.VITE_ORDER_API as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
/** The request never got an answer (offline, DNS, timeout). The order may or may not have been saved — retry with the same key. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export interface ServerOrder {
  orderId: string;
  status: OrderStatus;
  orderType: OrderType;
  tableNumber?: string;
  pickupInMinutes?: number;
  items: { itemId: string; name: string; chineseName: string; quantity: number; unitPrice: Money; lineTotal: Money }[];
  total: Money;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPayload {
  items: { itemId: string; quantity: number }[];
  orderType: OrderType;
  tableNumber?: string;
  pickupInMinutes?: number;
  contact: { name: string; phone: string };
  expectedTotal: Money;
  customerRef: string;
  language: string;
}

export interface GuidePayload {
  message?: string;
  intent?: GuideIntent;
  language: string;
  context: { orderType: OrderType; orderedItemIds: readonly string[]; cartItemIds: readonly string[] };
}

export interface ApiClient {
  menu(): Promise<{ menu: MenuItem[]; isSample: boolean }>;
  submitOrder(body: OrderPayload, idempotencyKey: string): Promise<{ order: ServerOrder; trackingToken: string; created: boolean }>;
  orderStatus(orderId: string, token: string): Promise<ServerOrder | null>;
  guide(body: GuidePayload): Promise<GuideAnswer>;
}

export function createApiClient(base: string, doFetch: typeof fetch = (...a) => fetch(...a)): ApiClient {
  async function call<T>(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...opts.headers },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        credentials: 'same-origin',
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : undefined);
    }
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON body (e.g. a proxy error page) */
    }
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      throw new ApiError(err?.code ?? `HTTP_${res.status}`, err?.message ?? `The server answered ${res.status}.`, res.status, err?.details);
    }
    return data as T;
  }

  return {
    menu: () => call('GET', '/menu', { timeoutMs: 8000 }),
    submitOrder: (body, key) => call('POST', '/orders', { body, headers: { 'idempotency-key': key } }),
    async orderStatus(orderId, token) {
      try {
        return (await call<{ order: ServerOrder }>('GET', `/orders/${encodeURIComponent(orderId)}/status`, { headers: { 'x-order-token': token }, timeoutMs: 8000 })).order;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    guide: async (body) => (await call<{ answer: GuideAnswer }>('POST', '/guide', { body, timeoutMs: 25_000 })).answer,
  };
}

export const defaultApi: ApiClient | null = API_BASE ? createApiClient(API_BASE) : null;

export function toClientOrder(o: ServerOrder, token: string, customerId: string): Order {
  return {
    orderId: o.orderId,
    customerId,
    items: o.items.map((i) => ({ itemId: i.itemId, name: i.name, chineseName: i.chineseName, quantity: i.quantity, unitPrice: i.unitPrice })),
    total: o.total,
    orderType: o.orderType,
    tableNumber: o.tableNumber,
    pickupInMinutes: o.pickupInMinutes,
    timestamp: o.createdAt,
    status: o.status,
    trackingToken: token,
  };
}
