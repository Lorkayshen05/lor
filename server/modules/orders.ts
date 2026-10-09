import { z } from 'zod';
import { CHECKOUT_CONFIG } from '../../src/data/restaurant';
import { normalizePhone, validateCheckout } from '../../src/services/checkout';
import { priceCart } from '../../src/services/pricing';
import type { OrderStatus, OrderType } from '../../src/types';
import { all, one, run, tx } from '../db';
import { SYSTEM_ACTOR, type Actor, type Deps } from '../deps';
import { hmacHex, orderToken, safeEqual, uid } from '../lib/security';
import { addDays, businessDate } from '../lib/time';
import { finishRun, startRun } from './automation';
import { getMenuMap, menuIsSample } from './menu';
import { enqueueOrderNotifications } from './notifications/dispatcher';

export const RUN_RETENTION_DAYS = 90;

export class OrderError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/* ---------------------------------------------------------------- request validation */

export const OrderRequestSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            itemId: z.string().min(1).max(64),
            quantity: z.number().int().min(1).max(CHECKOUT_CONFIG.maxQuantityPerItem),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    orderType: z.enum(['dine-in', 'takeaway']),
    tableNumber: z.string().max(10).optional(),
    pickupInMinutes: z
      .number()
      .int()
      .refine((n) => (CHECKOUT_CONFIG.pickupOptionsMinutes as readonly number[]).includes(n), 'Unsupported pickup time')
      .optional(),
    contact: z.object({ name: z.string().max(60).default(''), phone: z.string().max(30).default('') }).strict().default({ name: '', phone: '' }),
    /** What the customer saw. A mismatch with the server's price is reported, never silently overridden. */
    expectedTotal: z.number().int().min(0).optional(),
    /** Anonymous per-device id (not personal data); enables repeat-purchase reporting. */
    customerRef: z.string().max(64).optional(),
    language: z.string().max(12).optional(),
  })
  .strict();
export type OrderRequest = z.infer<typeof OrderRequestSchema>;

export const IdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,80}$/);

/* ---------------------------------------------------------------- views */

export interface OrderLine {
  itemId: string;
  productCode: string;
  name: string;
  chineseName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerOrderView {
  orderId: string;
  status: OrderStatus;
  orderType: OrderType;
  tableNumber?: string;
  pickupInMinutes?: number;
  items: OrderLine[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderRow {
  id: string;
  business_date: string;
  seq: number;
  idempotency_key: string;
  request_hash: string;
  status: OrderStatus;
  order_type: OrderType;
  table_number: string | null;
  pickup_in_minutes: number | null;
  total: number;
  customer_ref: string | null;
  language: string | null;
  menu_is_sample: number;
  created_at: string;
  updated_at: string;
}

function loadLines(deps: Deps, orderId: string): OrderLine[] {
  return all<{
    item_id: string;
    product_code: string;
    name: string;
    chinese_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>(deps.db, 'SELECT * FROM order_items WHERE order_id = ? ORDER BY line_no', orderId).map((r) => ({
    itemId: r.item_id,
    productCode: r.product_code,
    name: r.name,
    chineseName: r.chinese_name,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    lineTotal: r.line_total,
  }));
}

function customerView(deps: Deps, row: OrderRow): CustomerOrderView {
  return {
    orderId: row.id,
    status: row.status,
    orderType: row.order_type,
    tableNumber: row.table_number ?? undefined,
    pickupInMinutes: row.pickup_in_minutes ?? undefined,
    items: loadLines(deps, row.id),
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ---------------------------------------------------------------- create */

function requestHash(deps: Deps, req: OrderRequest): string {
  const canonical = JSON.stringify({
    items: [...req.items].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    orderType: req.orderType,
    table: req.orderType === 'dine-in' ? (req.tableNumber ?? '').trim().toUpperCase() : '',
    pickup: req.orderType === 'takeaway' ? (req.pickupInMinutes ?? 0) : 0,
    name: req.contact.name.trim(),
    phone: normalizePhone(req.contact.phone),
  });
  // Keyed hash: phone numbers are low-entropy, so an unkeyed hash of them would be reversible by brute force.
  return hmacHex(deps.config.orderTokenSecret, canonical);
}

export interface CreateResult {
  order: CustomerOrderView;
  trackingToken: string;
  /** false when this was a retry of an order we already accepted. */
  created: boolean;
}

/**
 * Accept an order. Everything that matters is decided here, on the server:
 * item existence/availability, unit prices, totals, and the order number.
 * The client's `expectedTotal` is only compared against the server's figure.
 */
export function createOrder(deps: Deps, rawBody: unknown, idempotencyKey: string): CreateResult {
  const keyParse = IdempotencyKeySchema.safeParse(idempotencyKey);
  if (!keyParse.success) throw new OrderError('IDEMPOTENCY_KEY_REQUIRED', 400, 'A valid Idempotency-Key header is required (8–80 chars: letters, digits, _ or -).');

  const body = OrderRequestSchema.safeParse(rawBody);
  if (!body.success) {
    throw new OrderError('INVALID_REQUEST', 422, 'The order could not be read.', body.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const req = body.data;

  if (deps.config.isProd && menuIsSample() && !deps.config.allowSampleMenu) {
    throw new OrderError('MENU_NOT_CONFIGURED', 503, 'Ordering is not open yet: the real menu has not been loaded.');
  }

  const hash = requestHash(deps, req);

  // Fast path for retries (the common case when a response was lost): same key + same order → same result.
  const existing = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE idempotency_key = ?', idempotencyKey);
  if (existing) return replay(deps, existing, hash);

  const errors = validateCheckout(
    { name: req.contact.name, phone: req.contact.phone, tableNumber: req.tableNumber ?? '' },
    req.orderType,
    req.items.length,
  );
  delete errors.cart;
  if (Object.keys(errors).length) throw new OrderError('VALIDATION_FAILED', 422, 'Some details need fixing.', errors);

  const ids = req.items.map((i) => i.itemId);
  if (new Set(ids).size !== ids.length) throw new OrderError('DUPLICATE_ITEMS', 422, 'Each item may appear only once; change its quantity instead.');

  const menu = getMenuMap(deps);
  const unavailable = req.items.filter((i) => !menu.get(i.itemId)?.available).map((i) => i.itemId);
  if (unavailable.length) throw new OrderError('ITEM_UNAVAILABLE', 422, 'Some items are not available.', { itemIds: unavailable });

  const priced = priceCart(req.items, menu, req.orderType);
  if (req.expectedTotal !== undefined && req.expectedTotal !== priced.total) {
    throw new OrderError('PRICE_CHANGED', 409, 'Prices have changed since you built your cart.', {
      expectedTotal: req.expectedTotal,
      currentTotal: priced.total,
      lines: priced.lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity, unitPrice: l.unitPrice })),
    });
  }

  const now = deps.now();
  const nowIso = now.toISOString();
  const date = businessDate(now, deps.config.businessTz);
  const hasContact = req.contact.name.trim() !== '' || req.contact.phone.trim() !== '';
  const run0 = startRun(deps, { automation: 'order_intake', trigger: 'customer_checkout' });

  try {
    const orderId = tx(deps.db, () => {
      // Re-check inside the write lock: a concurrent request with the same key may have won the race.
      const raced = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE idempotency_key = ?', idempotencyKey);
      if (raced) return { id: raced.id, raced: true as const };

      const seq = (one<{ m: number | null }>(deps.db, 'SELECT MAX(seq) AS m FROM orders WHERE business_date = ?', date)?.m ?? 0) + 1;
      const id = `RDH-${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}-${String(seq).padStart(3, '0')}`;

      run(
        deps.db,
        `INSERT INTO orders (id, business_date, seq, idempotency_key, request_hash, status, order_type, table_number,
           pickup_in_minutes, total, customer_ref, language, menu_is_sample, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        date,
        seq,
        idempotencyKey,
        hash,
        req.orderType,
        req.orderType === 'dine-in' ? (req.tableNumber ?? '').trim().toUpperCase() : null,
        req.orderType === 'takeaway' ? (req.pickupInMinutes ?? 0) : null,
        priced.total,
        req.customerRef ?? null,
        req.language ?? null,
        menuIsSample() ? 1 : 0,
        nowIso,
        nowIso,
      );
      priced.lines.forEach((l, i) =>
        run(
          deps.db,
          `INSERT INTO order_items (order_id, line_no, item_id, product_code, name, chinese_name, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          i + 1,
          l.item.id,
          l.item.productCode,
          l.item.name,
          l.item.chineseName,
          l.quantity,
          l.unitPrice,
          l.lineTotal,
        ),
      );
      if (hasContact) {
        const purgeAfter = new Date(now.getTime() + deps.config.contactRetentionDays * 86_400_000).toISOString();
        run(
          deps.db,
          'INSERT INTO order_contacts (order_id, name, phone, purge_after) VALUES (?, ?, ?, ?)',
          id,
          req.contact.name.trim() || null,
          normalizePhone(req.contact.phone) || null,
          purgeAfter,
        );
      }
      run(deps.db, "INSERT INTO order_events (order_id, at, actor, type, to_status) VALUES (?, ?, ?, 'created', 'new')", id, nowIso, SYSTEM_ACTOR);
      // Outbox rows are written in the same transaction as the order: either both exist or neither does.
      enqueueOrderNotifications(deps, id, nowIso);
      return { id, raced: false as const };
    });

    const row = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE id = ?', orderId.id)!;
    finishRun(deps, run0, orderId.raced ? 'skipped' : 'ok');
    if (orderId.raced) return replay(deps, row, hash);
    return { order: customerView(deps, row), trackingToken: orderToken(deps.config.orderTokenSecret, row.id), created: true };
  } catch (e) {
    finishRun(deps, run0, 'failed', e);
    throw e;
  }
}

function replay(deps: Deps, row: OrderRow, hash: string): CreateResult {
  if (!safeEqual(row.request_hash, hash)) {
    throw new OrderError('IDEMPOTENCY_KEY_REUSED', 422, 'This Idempotency-Key was already used for a different order.');
  }
  return { order: customerView(deps, row), trackingToken: orderToken(deps.config.orderTokenSecret, row.id), created: false };
}

/* ---------------------------------------------------------------- customer lookup */

export function getOrderForCustomer(deps: Deps, orderId: string, token: string): CustomerOrderView | null {
  const row = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE id = ?', orderId);
  // Same answer for "no such order" and "wrong token", so order ids can't be probed.
  if (!row || !token || !safeEqual(orderToken(deps.config.orderTokenSecret, orderId), token)) return null;
  return customerView(deps, row);
}

/* ---------------------------------------------------------------- staff views */

export interface StaffOrderView extends CustomerOrderView {
  customerRef: string | null;
  language: string | null;
  menuIsSample: boolean;
  contact: { name: string | null; phone: string | null; purged: boolean } | null;
  notifications: { id: string; channel: string; status: string; attempts: number; lastError: string | null; sentAt: string | null }[];
  pendingApproval: { id: string; reason: string; requestedBy: string; createdAt: string } | null;
  events?: { at: string; actor: string; type: string; from: string | null; to: string | null; note: string | null }[];
}

function staffView(deps: Deps, row: OrderRow, detail = false): StaffOrderView {
  const contact = one<{ name: string | null; phone: string | null; purged_at: string | null }>(
    deps.db,
    'SELECT name, phone, purged_at FROM order_contacts WHERE order_id = ?',
    row.id,
  );
  const approval = one<{ id: string; reason: string; requested_by: string; created_at: string }>(
    deps.db,
    "SELECT id, reason, requested_by, created_at FROM approval_requests WHERE order_id = ? AND status = 'pending'",
    row.id,
  );
  const view: StaffOrderView = {
    ...customerView(deps, row),
    customerRef: row.customer_ref,
    language: row.language,
    menuIsSample: row.menu_is_sample === 1,
    contact: contact ? { name: contact.name, phone: contact.phone, purged: !!contact.purged_at } : null,
    notifications: all<{ id: string; channel: string; status: string; attempts: number; last_error: string | null; sent_at: string | null }>(
      deps.db,
      'SELECT id, channel, status, attempts, last_error, sent_at FROM notifications WHERE order_id = ? ORDER BY created_at',
      row.id,
    ).map((n) => ({ id: n.id, channel: n.channel, status: n.status, attempts: n.attempts, lastError: n.last_error, sentAt: n.sent_at })),
    pendingApproval: approval ? { id: approval.id, reason: approval.reason, requestedBy: approval.requested_by, createdAt: approval.created_at } : null,
  };
  if (detail) {
    view.events = all<{ at: string; actor: string; type: string; from_status: string | null; to_status: string | null; note: string | null }>(
      deps.db,
      'SELECT at, actor, type, from_status, to_status, note FROM order_events WHERE order_id = ? ORDER BY id',
      row.id,
    ).map((e) => ({ at: e.at, actor: e.actor, type: e.type, from: e.from_status, to: e.to_status, note: e.note }));
  }
  return view;
}

export function listOrders(deps: Deps, opts: { status?: string; date?: string; active?: boolean; limit?: number } = {}): StaffOrderView[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.status) {
    where.push('status = ?');
    params.push(opts.status);
  }
  if (opts.date) {
    where.push('business_date = ?');
    params.push(opts.date);
  }
  if (opts.active) where.push("status IN ('new','confirmed','preparing','ready')");
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 300);
  const rows = all<OrderRow>(
    deps.db,
    `SELECT * FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`,
    ...params,
    limit,
  );
  return rows.map((r) => staffView(deps, r));
}

export function getOrderDetail(deps: Deps, orderId: string): StaffOrderView | null {
  const row = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE id = ?', orderId);
  return row ? staffView(deps, row, true) : null;
}

/* ---------------------------------------------------------------- status machine */

/** The only forward path. Nothing skips a step, nothing leaves a terminal state. */
const NEXT: Record<OrderStatus, OrderStatus | null> = {
  new: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
  cancelled: null,
};
const TERMINAL: OrderStatus[] = ['completed', 'cancelled'];

function applyStatus(deps: Deps, row: OrderRow, to: OrderStatus, actor: string, type: string, note?: string): void {
  const nowIso = deps.now().toISOString();
  const r = run(deps.db, 'UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?', to, nowIso, row.id, row.status);
  // Optimistic concurrency: if someone else moved the order first, do nothing rather than overwrite.
  if (Number(r.changes) !== 1) throw new OrderError('CONFLICT', 409, 'This order was just updated by someone else. Refresh and try again.');
  run(
    deps.db,
    'INSERT INTO order_events (order_id, at, actor, type, from_status, to_status, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    row.id,
    nowIso,
    actor,
    type,
    row.status,
    to,
    note ?? null,
  );
}

export function transitionOrder(deps: Deps, orderId: string, to: OrderStatus, actor: Actor, note?: string): StaffOrderView {
  const out = tx(deps.db, () => {
    const row = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE id = ?', orderId);
    if (!row) throw new OrderError('NOT_FOUND', 404, 'No such order.');
    if (TERMINAL.includes(row.status)) throw new OrderError('INVALID_TRANSITION', 409, `This order is already ${row.status}.`);

    if (to === 'cancelled') {
      const reason = (note ?? '').trim();
      if (!reason) throw new OrderError('REASON_REQUIRED', 422, 'A reason is required to cancel an order.');
      if (row.status !== 'new' && actor.role !== 'manager') {
        // Level C: the order was already accepted, so a manager decision is required.
        throw new OrderError('APPROVAL_REQUIRED', 403, 'Cancelling an accepted order needs manager approval. Submit a cancellation request instead.');
      }
      applyStatus(deps, row, 'cancelled', actor.username, 'cancelled', reason);
      run(deps.db, "UPDATE approval_requests SET status = 'rejected', decided_by = ?, decided_at = ?, decision_note = 'Order cancelled directly' WHERE order_id = ? AND status = 'pending'", actor.username, deps.now().toISOString(), row.id);
    } else {
      if (NEXT[row.status] !== to) throw new OrderError('INVALID_TRANSITION', 409, `An order that is ${row.status} can only move to ${NEXT[row.status]}.`);
      applyStatus(deps, row, to, actor.username, 'status_change', note);
    }
    return row.id;
  });
  const h = startRun(deps, { automation: 'order_status_update', trigger: `staff:${actor.username}`, orderId: out });
  finishRun(deps, h, 'ok');
  return getOrderDetail(deps, out)!;
}

/* ---------------------------------------------------------------- Level C: approvals */

export function requestCancellation(deps: Deps, orderId: string, actor: Actor, reason: string): { approvalId: string } {
  const text = reason.trim();
  if (text.length < 3) throw new OrderError('REASON_REQUIRED', 422, 'Please give a reason (at least 3 characters).');
  if (text.length > 300) throw new OrderError('REASON_TOO_LONG', 422, 'Reason must be 300 characters or fewer.');
  return tx(deps.db, () => {
    const row = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE id = ?', orderId);
    if (!row) throw new OrderError('NOT_FOUND', 404, 'No such order.');
    if (TERMINAL.includes(row.status)) throw new OrderError('INVALID_TRANSITION', 409, `This order is already ${row.status}.`);
    if (one(deps.db, "SELECT 1 AS x FROM approval_requests WHERE order_id = ? AND status = 'pending'", orderId)) {
      throw new OrderError('ALREADY_PENDING', 409, 'A cancellation request is already waiting for a manager.');
    }
    const id = uid('apr');
    const nowIso = deps.now().toISOString();
    run(deps.db, "INSERT INTO approval_requests (id, type, order_id, requested_by, reason, status, created_at) VALUES (?, 'cancel_order', ?, ?, ?, 'pending', ?)", id, orderId, actor.username, text, nowIso);
    run(deps.db, "INSERT INTO order_events (order_id, at, actor, type, note) VALUES (?, ?, ?, 'cancel_requested', ?)", orderId, nowIso, actor.username, text);
    return { approvalId: id };
  });
}

export function listApprovals(deps: Deps, status = 'pending') {
  return all<{ id: string; order_id: string; requested_by: string; reason: string; status: string; created_at: string; decided_by: string | null; decided_at: string | null; decision_note: string | null }>(
    deps.db,
    'SELECT * FROM approval_requests WHERE status = ? ORDER BY created_at DESC LIMIT 100',
    status,
  ).map((a) => ({ id: a.id, orderId: a.order_id, requestedBy: a.requested_by, reason: a.reason, status: a.status, createdAt: a.created_at, decidedBy: a.decided_by, decidedAt: a.decided_at, decisionNote: a.decision_note }));
}

export function decideApproval(deps: Deps, approvalId: string, actor: Actor, approve: boolean, note?: string): StaffOrderView {
  if (actor.role !== 'manager') throw new OrderError('FORBIDDEN', 403, 'Only a manager can decide on approval requests.');
  const orderId = tx(deps.db, () => {
    const a = one<{ id: string; order_id: string; status: string; reason: string }>(deps.db, 'SELECT id, order_id, status, reason FROM approval_requests WHERE id = ?', approvalId);
    if (!a) throw new OrderError('NOT_FOUND', 404, 'No such approval request.');
    if (a.status !== 'pending') throw new OrderError('ALREADY_DECIDED', 409, 'This request was already decided.');
    const nowIso = deps.now().toISOString();
    run(deps.db, 'UPDATE approval_requests SET status = ?, decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?', approve ? 'approved' : 'rejected', actor.username, nowIso, note ?? null, approvalId);
    if (approve) {
      const row = one<OrderRow>(deps.db, 'SELECT * FROM orders WHERE id = ?', a.order_id)!;
      if (!TERMINAL.includes(row.status)) applyStatus(deps, row, 'cancelled', actor.username, 'cancel_approved', `Approved cancellation: ${a.reason}`);
    } else {
      run(deps.db, "INSERT INTO order_events (order_id, at, actor, type, note) VALUES (?, ?, ?, 'cancel_rejected', ?)", a.order_id, nowIso, actor.username, note ?? null);
    }
    return a.order_id;
  });
  const h = startRun(deps, { automation: 'order_cancel_after_acceptance', trigger: `manager:${actor.username}`, orderId });
  finishRun(deps, h, 'ok');
  return getOrderDetail(deps, orderId)!;
}

/* ---------------------------------------------------------------- retention */

/** Erase customer name/phone once the retention period has passed. Orders (items, totals) are kept for reporting. */
export function purgeExpiredContacts(deps: Deps): number {
  const nowIso = deps.now().toISOString();
  const r = run(deps.db, 'UPDATE order_contacts SET name = NULL, phone = NULL, purged_at = ? WHERE purge_after <= ? AND purged_at IS NULL', nowIso, nowIso);
  run(deps.db, 'DELETE FROM sessions WHERE expires_at <= ?', nowIso);
  // The execution log is operational, not a business record: keep 90 days so it cannot grow without bound.
  run(deps.db, 'DELETE FROM automation_runs WHERE started_at < ?', new Date(deps.now().getTime() - RUN_RETENTION_DAYS * 86_400_000).toISOString());
  return Number(r.changes);
}

export { addDays };
