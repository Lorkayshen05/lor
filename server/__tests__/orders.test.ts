// @vitest-environment node
import { MENU } from '../../src/data/menu';
import { all, one, run } from '../db';
import { listRuns } from '../modules/automation';
import { setAvailability } from '../modules/menu';
import { OrderError, createOrder, decideApproval, getOrderForCustomer, listOrders, purgeExpiredContacts, requestCancellation, transitionOrder } from '../modules/orders';
import { fakeChannel, makeDeps, manager, newKey, orderBody, staff } from './helpers';

const fails = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(OrderError);
    expect((e as OrderError).code).toBe(code);
    return e as OrderError;
  }
  throw new Error(`expected OrderError ${code}`);
};

describe('createOrder: server-side validation and pricing', () => {
  it('prices from the server menu, saves everything, and returns an order + tracking token', () => {
    const { deps } = makeDeps();
    const r = createOrder(deps, orderBody({ items: [{ itemId: 'black-sesame-paste', quantity: 2 }, { itemId: 'chinese-tea', quantity: 1 }] }), newKey());
    expect(r.created).toBe(true);
    expect(r.order.orderId).toBe('RDH-250610-001');
    expect(r.order.status).toBe('new');
    expect(r.order.total).toBe(750 * 2 + 250);
    expect(r.order.items.map((i) => [i.name, i.quantity, i.unitPrice, i.lineTotal])).toEqual([['Black Sesame Paste', 2, 750, 1500], ['Chinese Tea', 1, 250, 250]]);
    expect(r.order.tableNumber).toBe('A12');
    expect(r.trackingToken).toMatch(/^[0-9a-f]{32}$/);
    const row = one<{ total: number; created_at: string }>(deps.db, 'SELECT total, created_at FROM orders');
    expect(row?.total).toBe(1750);
    expect(row?.created_at).toBe('2025-06-10T04:00:00.000Z');
  });

  it('uses takeaway prices for takeaway orders', () => {
    const { deps } = makeDeps();
    const r = createOrder(deps, orderBody({ orderType: 'takeaway', tableNumber: undefined, contact: { name: 'Mei', phone: '012 345 6789' }, pickupInMinutes: 15 }), newKey());
    expect(r.order.total).toBe(800 * 2);
    expect(r.order.pickupInMinutes).toBe(15);
    expect(r.order.tableNumber).toBeUndefined();
  });

  it('IGNORES client-supplied prices: unknown fields are rejected, and a wrong expectedTotal is reported not obeyed', () => {
    const { deps } = makeDeps();
    fails(() => createOrder(deps, { ...orderBody(), items: [{ itemId: 'black-sesame-paste', quantity: 1, unitPrice: 1 }] }, newKey()), 'INVALID_REQUEST');
    fails(() => createOrder(deps, { ...orderBody(), total: 1 }, newKey()), 'INVALID_REQUEST');
    const e = fails(() => createOrder(deps, orderBody({ expectedTotal: 100 }), newKey()), 'PRICE_CHANGED');
    expect(e.httpStatus).toBe(409);
    expect(e.details).toMatchObject({ expectedTotal: 100, currentTotal: 1500 });
    expect(one(deps.db, 'SELECT 1 AS x FROM orders')).toBeUndefined();
    // The matching total is accepted.
    expect(createOrder(deps, orderBody({ expectedTotal: 1500 }), newKey()).order.total).toBe(1500);
  });

  it('rejects unknown, unavailable and duplicate items; bad quantities; empty orders', () => {
    const { deps } = makeDeps();
    fails(() => createOrder(deps, orderBody({ items: [{ itemId: 'made-up-dish', quantity: 1 }] }), newKey()), 'ITEM_UNAVAILABLE');
    setAvailability(deps, 'peanut-paste', false, 'boss');
    const e = fails(() => createOrder(deps, orderBody({ items: [{ itemId: 'peanut-paste', quantity: 1 }] }), newKey()), 'ITEM_UNAVAILABLE');
    expect(e.details).toEqual({ itemIds: ['peanut-paste'] });
    fails(() => createOrder(deps, orderBody({ items: [{ itemId: 'soy-milk', quantity: 1 }, { itemId: 'soy-milk', quantity: 1 }] }), newKey()), 'DUPLICATE_ITEMS');
    for (const quantity of [0, -1, 21, 1.5]) fails(() => createOrder(deps, orderBody({ items: [{ itemId: 'soy-milk', quantity }] }), newKey()), 'INVALID_REQUEST');
    fails(() => createOrder(deps, orderBody({ items: [] }), newKey()), 'INVALID_REQUEST');
    expect(one(deps.db, 'SELECT 1 AS x FROM orders')).toBeUndefined();
  });

  it('applies the same checkout rules as the client (table for dine-in; name+phone for takeaway)', () => {
    const { deps } = makeDeps();
    expect(fails(() => createOrder(deps, orderBody({ tableNumber: '' }), newKey()), 'VALIDATION_FAILED').details).toEqual({ tableNumber: 'errors.tableRequired' });
    expect(fails(() => createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: '', phone: '' } }), newKey()), 'VALIDATION_FAILED').details).toMatchObject({ name: 'errors.nameRequired', phone: 'errors.phoneRequired' });
    fails(() => createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: 'Mei', phone: 'abc' }, pickupInMinutes: 15 }), newKey()), 'VALIDATION_FAILED');
    fails(() => createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: 'Mei', phone: '0123456789' }, pickupInMinutes: 7 }), newKey()), 'INVALID_REQUEST');
  });

  it('requires a well-formed Idempotency-Key', () => {
    const { deps } = makeDeps();
    for (const k of ['', 'short', 'has spaces in it!!', 'x'.repeat(81)]) fails(() => createOrder(deps, orderBody(), k), 'IDEMPOTENCY_KEY_REQUIRED');
  });

  it('refuses to take orders in production on the sample menu unless explicitly allowed', () => {
    const prod = makeDeps({ env: { NODE_ENV: 'production' } });
    expect(MENU.some((m) => m.placeholder)).toBe(true);
    fails(() => createOrder(prod.deps, orderBody(), newKey()), 'MENU_NOT_CONFIGURED');
    const allowed = makeDeps({ env: { NODE_ENV: 'production', ALLOW_SAMPLE_MENU: 'true' } });
    expect(createOrder(allowed.deps, orderBody(), newKey()).created).toBe(true);
    // …and those orders are flagged so reports can exclude them as test data.
    expect(one<{ menu_is_sample: number }>(allowed.deps.db, 'SELECT menu_is_sample FROM orders')?.menu_is_sample).toBe(1);
  });
});

describe('duplicate-submission protection', () => {
  it('a retry with the same key and the same order returns the SAME order and creates nothing new', () => {
    const { deps } = makeDeps({ channels: [fakeChannel('email')] });
    const key = newKey();
    const a = createOrder(deps, orderBody(), key);
    const b = createOrder(deps, orderBody(), key);
    const c = createOrder(deps, orderBody({ expectedTotal: 1500 }), key); // expectedTotal isn't part of the identity
    expect([a.created, b.created, c.created]).toEqual([true, false, false]);
    expect(b.order.orderId).toBe(a.order.orderId);
    expect(b.trackingToken).toBe(a.trackingToken);
    expect(one<{ n: number }>(deps.db, 'SELECT COUNT(*) AS n FROM orders')?.n).toBe(1);
    expect(one<{ n: number }>(deps.db, 'SELECT COUNT(*) AS n FROM notifications')?.n).toBe(1); // not 3
  });

  it('reusing a key for a DIFFERENT order is rejected, never silently merged', () => {
    const { deps } = makeDeps();
    const key = newKey();
    createOrder(deps, orderBody(), key);
    fails(() => createOrder(deps, orderBody({ items: [{ itemId: 'soy-milk', quantity: 1 }] }), key), 'IDEMPOTENCY_KEY_REUSED');
    fails(() => createOrder(deps, orderBody({ tableNumber: 'B2' }), key), 'IDEMPOTENCY_KEY_REUSED');
  });

  it('different keys make different orders with consecutive numbers', () => {
    const { deps } = makeDeps();
    const ids = [1, 2, 3].map(() => createOrder(deps, orderBody(), newKey()).order.orderId);
    expect(ids).toEqual(['RDH-250610-001', 'RDH-250610-002', 'RDH-250610-003']);
  });

  it('order numbers restart each business day, using the business time zone (not UTC)', () => {
    const { deps, clock } = makeDeps({ now: '2025-06-10T15:30:00Z' }); // 23:30 in KL, same day
    expect(createOrder(deps, orderBody(), newKey()).order.orderId).toBe('RDH-250610-001');
    clock.t = new Date('2025-06-10T16:30:00Z'); // 00:30 next day in KL, still 10 June in UTC
    expect(createOrder(deps, orderBody(), newKey()).order.orderId).toBe('RDH-250611-001');
  });
});

describe('customer status lookup', () => {
  it('needs the tracking token; wrong token and unknown order look identical', () => {
    const { deps } = makeDeps();
    const r = createOrder(deps, orderBody(), newKey());
    expect(getOrderForCustomer(deps, r.order.orderId, r.trackingToken)?.orderId).toBe(r.order.orderId);
    expect(getOrderForCustomer(deps, r.order.orderId, 'wrong')).toBeNull();
    expect(getOrderForCustomer(deps, r.order.orderId, '')).toBeNull();
    expect(getOrderForCustomer(deps, 'RDH-250610-999', r.trackingToken)).toBeNull();
  });
});

describe('status machine', () => {
  const setup = () => {
    const h = makeDeps();
    const created = createOrder(h.deps, orderBody(), newKey());
    return { ...h, id: created.order.orderId, amy: staff(h.deps), boss: manager(h.deps) };
  };

  it('moves new → confirmed → preparing → ready → completed, one step at a time, with an audit trail', () => {
    const { deps, id, amy } = setup();
    for (const to of ['confirmed', 'preparing', 'ready', 'completed'] as const) expect(transitionOrder(deps, id, to, amy).status).toBe(to);
    const detail = listOrders(deps)[0]!;
    expect(detail.status).toBe('completed');
    expect(all<{ type: string; actor: string }>(deps.db, 'SELECT type, actor FROM order_events ORDER BY id').map((e) => `${e.type}:${e.actor}`)).toEqual(['created:system', 'status_change:amy', 'status_change:amy', 'status_change:amy', 'status_change:amy']);
  });

  it('rejects skipping steps and leaving terminal states', () => {
    const { deps, id, amy } = setup();
    expect(fails(() => transitionOrder(deps, id, 'ready', amy), 'INVALID_TRANSITION').httpStatus).toBe(409);
    fails(() => transitionOrder(deps, id, 'completed', amy), 'INVALID_TRANSITION');
    fails(() => transitionOrder(deps, id, 'new', amy), 'INVALID_TRANSITION');
    for (const to of ['confirmed', 'preparing', 'ready', 'completed'] as const) transitionOrder(deps, id, to, amy);
    fails(() => transitionOrder(deps, id, 'cancelled', amy, 'oops'), 'INVALID_TRANSITION');
    fails(() => transitionOrder(deps, id, 'preparing', amy), 'INVALID_TRANSITION');
  });

  it('status only changes through staff actions: nothing in the AI/guide modules can reach the orders module', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const files = [...readdirSync('server/modules/ai').map((f) => `server/modules/ai/${f}`), 'src/services/guide/engine.ts', 'src/services/guide/types.ts'];
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/modules\/orders|from ['"]\.\.\/orders|transitionOrder|createOrder/);
  });

  it('staff may cancel an order nobody has accepted yet, but only with a reason', () => {
    const { deps, id, amy } = setup();
    fails(() => transitionOrder(deps, id, 'cancelled', amy), 'REASON_REQUIRED');
    expect(transitionOrder(deps, id, 'cancelled', amy, 'Customer left').status).toBe('cancelled');
  });

  it('LEVEL C: cancelling an accepted order needs a manager — staff can only request it', () => {
    const { deps, id, amy, boss } = setup();
    transitionOrder(deps, id, 'confirmed', amy);
    const denied = fails(() => transitionOrder(deps, id, 'cancelled', amy, 'Customer changed mind'), 'APPROVAL_REQUIRED');
    expect(denied.httpStatus).toBe(403);
    expect(listOrders(deps)[0]!.status).toBe('confirmed');

    const { approvalId } = requestCancellation(deps, id, amy, 'Customer changed mind');
    fails(() => requestCancellation(deps, id, amy, 'again'), 'ALREADY_PENDING');
    expect(listOrders(deps)[0]!.pendingApproval?.reason).toBe('Customer changed mind');
    expect(fails(() => decideApproval(deps, approvalId, amy, true), 'FORBIDDEN').httpStatus).toBe(403);
    expect(listOrders(deps)[0]!.status).toBe('confirmed');

    expect(decideApproval(deps, approvalId, boss, true, 'ok').status).toBe('cancelled');
    fails(() => decideApproval(deps, approvalId, boss, true), 'ALREADY_DECIDED');
    expect(listRuns(deps).some((r) => r.automation === 'order_cancel_after_acceptance' && r.level === 'C')).toBe(true);
  });

  it('a rejected cancellation request leaves the order untouched', () => {
    const { deps, id, amy, boss } = setup();
    transitionOrder(deps, id, 'confirmed', amy);
    const { approvalId } = requestCancellation(deps, id, amy, 'Wrong table');
    expect(decideApproval(deps, approvalId, boss, false, 'Keep it').status).toBe('confirmed');
    expect(one<{ status: string }>(deps.db, 'SELECT status FROM approval_requests')?.status).toBe('rejected');
  });

  it('a manager can cancel an accepted order directly (the manager decision IS the approval)', () => {
    const { deps, id, amy, boss } = setup();
    transitionOrder(deps, id, 'confirmed', amy);
    expect(transitionOrder(deps, id, 'cancelled', boss, 'Kitchen out of stock').status).toBe('cancelled');
  });

  it('detects concurrent updates instead of overwriting them', () => {
    const { deps, id, amy } = setup();
    // Simulate another staff member moving the order between our read and our write.
    const original = deps.db.prepare.bind(deps.db);
    let injected = false;
    (deps.db as { prepare: typeof deps.db.prepare }).prepare = ((sql: string) => {
      if (!injected && sql.startsWith('UPDATE orders SET status')) {
        injected = true;
        run(deps.db, "UPDATE orders SET status = 'preparing' WHERE id = ?", id);
      }
      return original(sql);
    }) as typeof deps.db.prepare;
    expect(fails(() => transitionOrder(deps, id, 'confirmed', amy), 'CONFLICT').httpStatus).toBe(409);
    (deps.db as { prepare: typeof deps.db.prepare }).prepare = original;
    // The stale write did not land (the whole transaction rolled back, including the simulated rival write).
    expect(listOrders(deps)[0]!.status).not.toBe('confirmed');
  });
});

describe('customer data retention', () => {
  it('keeps the automation log for 90 days, then drops it', () => {
    const { deps, advance } = makeDeps();
    createOrder(deps, orderBody(), newKey());
    expect(listRuns(deps)).toHaveLength(1);
    advance(89 * 86_400_000);
    purgeExpiredContacts(deps);
    expect(listRuns(deps)).toHaveLength(1);
    advance(2 * 86_400_000);
    purgeExpiredContacts(deps);
    expect(listRuns(deps)).toHaveLength(0);
  });

  it('stores contact separately and erases name/phone after the retention period, keeping the sales data', () => {
    const { deps, advance } = makeDeps({ env: { CONTACT_RETENTION_DAYS: '30' } });
    const r = createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: 'Mei', phone: '012-345 6789' }, pickupInMinutes: 0 }), newKey());
    expect(one(deps.db, 'SELECT name, phone FROM order_contacts')).toMatchObject({ name: 'Mei', phone: '0123456789' });
    advance(29 * 86_400_000);
    expect(purgeExpiredContacts(deps)).toBe(0);
    advance(2 * 86_400_000);
    expect(purgeExpiredContacts(deps)).toBe(1);
    expect(one(deps.db, 'SELECT name, phone, purged_at FROM order_contacts')).toMatchObject({ name: null, phone: null });
    expect(listOrders(deps)[0]!.contact).toEqual({ name: null, phone: null, purged: true });
    expect(listOrders(deps)[0]!.total).toBe(r.order.total);
  });

  it('does not store contact details that were not provided (dine-in with no name)', () => {
    const { deps } = makeDeps();
    createOrder(deps, orderBody(), newKey());
    expect(one(deps.db, 'SELECT 1 AS x FROM order_contacts')).toBeUndefined();
  });

  it('logs the intake automation without any customer details', () => {
    const { deps } = makeDeps();
    createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: 'Secret Name', phone: '0123456789' }, pickupInMinutes: 0 }), newKey());
    const runs = listRuns(deps);
    expect(runs[0]).toMatchObject({ automation: 'order_intake', level: 'A', outcome: 'ok', trigger: 'customer_checkout' });
    expect(JSON.stringify(runs)).not.toMatch(/Secret Name|0123456789/);
  });
});
