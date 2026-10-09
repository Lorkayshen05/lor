import { API_BASE } from '../services/api';

export class AdminApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type Role = 'staff' | 'manager';
export interface AdminUser {
  id: string;
  username: string;
  role: Role;
}

export interface AdminOrder {
  orderId: string;
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  pickupInMinutes?: number;
  items: { itemId: string; name: string; chineseName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  total: number;
  createdAt: string;
  updatedAt: string;
  menuIsSample: boolean;
  contact: { name: string | null; phone: string | null; purged: boolean } | null;
  notifications: { id: string; channel: string; status: 'pending' | 'sent' | 'failed'; attempts: number; lastError: string | null; sentAt: string | null }[];
  pendingApproval: { id: string; reason: string; requestedBy: string; createdAt: string } | null;
  events?: { at: string; actor: string; type: string; from: string | null; to: string | null; note: string | null }[];
}

export interface Summary {
  newOrders: number;
  activeOrders: number;
  failedNotifications: number;
  pendingNotifications: number;
  pendingApprovals: number;
  failedRuns: number;
  serverTime: string;
}

export interface Approval {
  id: string;
  orderId: string;
  requestedBy: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  label: string;
  state: 'not_configured' | 'configured_untested' | 'connected' | 'failing' | 'always_on';
  configured: boolean;
  lastTestAt: string | null;
  lastError: string | null;
  setup: string;
}

export interface RunRow {
  id: string;
  automation: string;
  level: 'A' | 'B' | 'C';
  trigger: string;
  started_at: string;
  finished_at: string | null;
  outcome: 'running' | 'ok' | 'failed' | 'skipped';
  error: string | null;
  order_id: string | null;
}
export interface AutomationDef {
  id: string;
  level: 'A' | 'B' | 'C';
  description: string;
  requires?: string;
}
export interface NotificationRow {
  id: string;
  orderId: string | null;
  channel: string;
  kind: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface ReportData {
  period: 'day' | 'week' | 'month';
  rangeStart: string;
  rangeEnd: string;
  timezone: string;
  source: { description: string; ordersInRange: number; sampleMenuOrders: number; generatedAt: string };
  totals: { orders: number; grossSales: number; completedOrders: number; completedSales: number; cancelledOrders: number; cancelledValue: number; averageOrderValue: number | null };
  byType: { dineIn: { orders: number; sales: number }; takeaway: { orders: number; sales: number } };
  topItems: { itemId: string; name: string; units: number; orders: number; revenue: number }[];
  byDay: { date: string; orders: number; sales: number }[];
  repeat: { identifiableOrders: number; customersWithRepeatOrders: number; ordersFromReturningCustomers: number; note: string };
  previous: { rangeStart: string; rangeEnd: string; orders: number; grossSales: number } | null;
}
export interface StoredReport {
  id: string;
  generatedAt: string;
  generatedBy: string;
  data: ReportData;
  summary: { statements: { text: string; source: 'data' | 'ai' }[]; aiStatus: string; aiNote?: string };
}

export async function adm<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/admin${path}`, {
      method,
      headers: { 'x-requested-with': 'ruby-admin', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new AdminApiError('NETWORK', 'Could not reach the server. Check the connection and try again.', 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON */
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new AdminApiError(err?.code ?? `HTTP_${res.status}`, err?.message ?? `The server answered ${res.status}.`, res.status);
  }
  return data as T;
}

export const rm = (sen: number): string => `RM ${(sen / 100).toFixed(2)}`;
export const when = (iso: string | null): string => (iso ? new Date(iso).toLocaleString() : '—');
export const NEXT_ACTION: Record<string, { to: AdminOrder['status']; label: string } | undefined> = {
  new: { to: 'confirmed', label: 'Confirm' },
  confirmed: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'completed', label: 'Complete' },
};
