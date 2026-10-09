// @vitest-environment node
import { all, run } from '../db';
import { createOrder, transitionOrder } from '../modules/orders';
import { allowedNumbers, computeReport, generateReport, rangeFor, summarize, validateNarrative } from '../modules/reports';
import { fakeLlm, makeDeps, manager, newKey, orderBody, staff } from './helpers';

type H = ReturnType<typeof makeDeps>;
function place(h: H, at: string, body = orderBody(), ref?: string) {
  h.clock.t = new Date(at);
  return createOrder(h.deps, { ...body, customerRef: ref }, newKey()).order.orderId;
}

/** A small, hand-checkable dataset around 10–12 June 2025 (KL time). */
function seed(h: H = makeDeps()) {
  const amy = staff(h.deps);
  const boss = manager(h.deps);
  // Tue 10 June
  place(h, '2025-06-10T04:00:00Z', orderBody({ items: [{ itemId: 'black-sesame-paste', quantity: 2 }] }), 'dev-A'); //  dine-in 1500
  place(h, '2025-06-10T05:00:00Z', orderBody({ items: [{ itemId: 'peanut-paste', quantity: 1 }, { itemId: 'chinese-tea', quantity: 1 }], orderType: 'takeaway', tableNumber: undefined, contact: { name: 'Mei', phone: '0123456789' }, pickupInMinutes: 0 }), 'dev-B'); // takeaway 750+300=1050
  const cancelled = place(h, '2025-06-10T06:00:00Z', orderBody({ items: [{ itemId: 'walnut-paste', quantity: 1 }] }), 'dev-C'); // 850, to be cancelled
  transitionOrder(h.deps, cancelled, 'cancelled', amy, 'Customer left');
  // Wed 11 June
  place(h, '2025-06-11T04:00:00Z', orderBody({ items: [{ itemId: 'black-sesame-paste', quantity: 1 }] }), 'dev-A'); // repeat device, 750
  // Next week, Mon 16 June
  place(h, '2025-06-16T04:00:00Z', orderBody({ items: [{ itemId: 'soy-milk', quantity: 1 }] })); // no device id, 350
  h.clock.t = new Date('2025-06-17T04:00:00Z');
  return { ...h, amy, boss };
}

describe('report ranges (business calendar)', () => {
  it('day / week (Mon–Sun) / month', () => {
    expect(rangeFor('day', '2025-06-10')).toEqual({ start: '2025-06-10', end: '2025-06-10' });
    expect(rangeFor('week', '2025-06-10')).toEqual({ start: '2025-06-09', end: '2025-06-15' }); // Tue → Mon..Sun
    expect(rangeFor('week', '2025-06-15')).toEqual({ start: '2025-06-09', end: '2025-06-15' }); // Sunday belongs to the week it ends
    expect(rangeFor('week', '2025-06-09')).toEqual({ start: '2025-06-09', end: '2025-06-15' });
    expect(rangeFor('month', '2025-06-10')).toEqual({ start: '2025-06-01', end: '2025-06-30' });
    expect(rangeFor('month', '2024-02-10')).toEqual({ start: '2024-02-01', end: '2024-02-29' }); // leap year
    expect(rangeFor('month', '2025-12-31')).toEqual({ start: '2025-12-01', end: '2025-12-31' });
  });
});

describe('report numbers match the saved orders exactly', () => {
  it('day: counts, sales, dine-in vs takeaway, average, cancelled', () => {
    const { deps } = seed();
    const d = computeReport(deps, 'day', '2025-06-10');
    expect(d.totals).toEqual({ orders: 2, grossSales: 2550, completedOrders: 0, completedSales: 0, cancelledOrders: 1, cancelledValue: 850, averageOrderValue: 1275 });
    expect(d.byType).toEqual({ dineIn: { orders: 1, sales: 1500 }, takeaway: { orders: 1, sales: 1050 } });
    expect(d.source.ordersInRange).toBe(3);
    expect(d.source.sampleMenuOrders).toBe(3);
    expect(d.rangeStart).toBe('2025-06-10');
    expect(d.timezone).toBe('Asia/Kuala_Lumpur');
  });

  it('top items rank by units sold, excluding cancelled orders', () => {
    const { deps } = seed();
    const d = computeReport(deps, 'week', '2025-06-10');
    expect(d.topItems[0]).toEqual({ itemId: 'black-sesame-paste', name: 'Black Sesame Paste', units: 3, orders: 2, revenue: 2250 });
    expect(d.topItems.map((i) => i.itemId)).not.toContain('walnut-paste'); // cancelled
    expect(d.totals.orders).toBe(3);
    expect(d.byDay).toEqual([{ date: '2025-06-10', orders: 2, sales: 2550 }, { date: '2025-06-11', orders: 1, sales: 750 }]);
  });

  it('completed vs placed sales are reported separately', () => {
    const h = seed();
    const id = all<{ id: string }>(h.deps.db, "SELECT id FROM orders WHERE status = 'new' ORDER BY created_at LIMIT 1")[0]!.id;
    for (const to of ['confirmed', 'preparing', 'ready', 'completed'] as const) transitionOrder(h.deps, id, to, h.amy);
    const d = computeReport(h.deps, 'day', '2025-06-10');
    expect(d.totals).toMatchObject({ completedOrders: 1, completedSales: 1500, grossSales: 2550 });
  });

  it('month and empty periods', () => {
    const { deps } = seed();
    expect(computeReport(deps, 'month', '2025-06-20').totals).toMatchObject({ orders: 4, grossSales: 1500 + 1050 + 750 + 350 });
    const empty = computeReport(deps, 'day', '2025-01-01');
    expect(empty.totals).toMatchObject({ orders: 0, grossSales: 0, averageOrderValue: null });
    expect(empty.topItems).toEqual([]);
  });

  it('repeat purchases only from the anonymous device id, with the limitation stated', () => {
    const { deps } = seed();
    const week = computeReport(deps, 'week', '2025-06-10');
    expect(week.repeat).toMatchObject({ identifiableOrders: 3, customersWithRepeatOrders: 1 }); // dev-A ordered twice
    const wed = computeReport(deps, 'day', '2025-06-11');
    expect(wed.repeat.ordersFromReturningCustomers).toBe(1); // dev-A had ordered the day before
    expect(week.repeat.note).toMatch(/undercounts/);
    expect(computeReport(deps, 'day', '2025-06-16').repeat.identifiableOrders).toBe(0); // no device id → not guessed
  });

  it('compares with the previous period only when that period had orders', () => {
    const { deps } = seed();
    expect(computeReport(deps, 'day', '2025-06-11').previous).toMatchObject({ rangeStart: '2025-06-10', orders: 2, grossSales: 2550 });
    expect(computeReport(deps, 'week', '2025-06-16').previous).toMatchObject({ rangeStart: '2025-06-09', orders: 3 });
    expect(computeReport(deps, 'day', '2025-06-10').previous).toBeNull();
    expect(computeReport(deps, 'month', '2025-06-10').previous).toBeNull(); // no May orders
  });
});

describe('plain-English summary only states what the data supports', () => {
  const text = (d: ReturnType<typeof computeReport>) => summarize(d).map((s) => s.text).join('\n');

  it('names the top item by units — and only that', () => {
    const { deps } = seed();
    const t = text(computeReport(deps, 'week', '2025-06-10'));
    expect(t).toContain('Black Sesame Paste had the highest number of units sold (3).');
    expect(t).toContain('Between 2025-06-09 to 2025-06-15 there were 3 orders worth RM 33.00'.replace('Between 2025-06-09 to', 'Between 2025-06-09 to'));
    expect(t).toContain('1 order was cancelled.');
    expect(t).toMatch(/placed on the sample menu \(test data\)/);
  });

  it('reports ties instead of crowning a winner', () => {
    const h = makeDeps();
    place(h, '2025-06-10T04:00:00Z', orderBody({ items: [{ itemId: 'peanut-paste', quantity: 2 }] }));
    place(h, '2025-06-10T05:00:00Z', orderBody({ items: [{ itemId: 'soy-milk', quantity: 2 }] }));
    const t = text(computeReport(h.deps, 'day', '2025-06-10'));
    expect(t).toMatch(/Peanut Paste and Soy Milk were tied for the most units sold \(2 each\)/);
    expect(t).not.toMatch(/highest number of units/);
  });

  it('says plainly when there is nothing to report, and invents no trend', () => {
    const { deps } = seed();
    expect(text(computeReport(deps, 'day', '2025-01-01'))).toBe('No orders were recorded between 2025-01-01.');
    const first = text(computeReport(deps, 'day', '2025-06-10'));
    expect(first).toMatch(/no earlier day with orders to compare against/i);
    expect(first).not.toMatch(/higher|lower/);
  });

  it('describes a period-over-period change with the actual figures and a not-a-forecast caveat', () => {
    const { deps } = seed();
    const t = text(computeReport(deps, 'week', '2025-06-16'));
    expect(t).toMatch(/Order count was 67% lower than the previous week \(1 vs 3\)\. This compares two periods; it is not a forecast\./);
  });
});

describe('optional AI wording is verified against the numbers', () => {
  it('accepts statements that only quote figures present in the report', () => {
    const { deps } = seed();
    const d = computeReport(deps, 'week', '2025-06-10');
    const ok = validateNarrative(['Black Sesame Paste sold 3 units across 3 orders worth RM 33.00 between 2025-06-09 and 2025-06-15.'], d, summarize(d));
    expect(ok).toEqual({ ok: true });
  });

  it.each([
    ['an invented number', 'Black Sesame Paste sold 47 units this week.'],
    ['an invented revenue', 'Sales reached RM 1,250.00 this week.'],
    ['a forecast', 'Orders will likely rise next week.'],
    ['customer feedback', 'Customers love the sesame paste.'],
    ['a popularity claim', 'The most popular item was black sesame.'],
  ])('rejects %s', (_label, sentence) => {
    const { deps } = seed();
    const d = computeReport(deps, 'week', '2025-06-10');
    expect(validateNarrative([sentence], d, summarize(d)).ok).toBe(false);
  });

  it('allowed numbers include money in ringgit and sen-derived figures but not arbitrary ones', () => {
    const { deps } = seed();
    const d = computeReport(deps, 'day', '2025-06-10');
    const nums = allowedNumbers(d, summarize(d));
    expect([25.5, 2, 1, 8.5, 12.75].every((n) => nums.has(n))).toBe(true); // ringgit + counts
    expect(nums.has(99)).toBe(false);
    expect(nums.has(2550) && nums.has(850)).toBe(false); // raw sen are not quotable as counts
  });

  it('generateReport: uses a verified AI summary, labelled as AI; the data statements always remain', async () => {
    const h = seed(makeDeps({ llm: fakeLlm({ statements: ['Black Sesame Paste sold 3 units between 2025-06-09 and 2025-06-15.'] }) }));
    const r = await generateReport(h.deps, { period: 'week', date: '2025-06-10', by: 'boss', withAi: true });
    expect(r.summary.aiStatus).toBe('used');
    expect(r.summary.statements.filter((s) => s.source === 'ai')).toHaveLength(1);
    expect(r.summary.statements.some((s) => s.source === 'data')).toBe(true);
  });

  it('generateReport: an AI summary with an invented number is discarded and the reason is shown', async () => {
    const h = seed(makeDeps({ llm: fakeLlm({ statements: ['Black Sesame Paste sold 300 units.'] }) }));
    const r = await generateReport(h.deps, { period: 'week', date: '2025-06-10', by: 'boss', withAi: true });
    expect(r.summary.aiStatus).toBe('rejected');
    expect(r.summary.aiNote).toMatch(/number 300 is not in the report data/);
    expect(r.summary.statements.every((s) => s.source === 'data')).toBe(true);
  });

  it('generateReport: no AI configured / AI error → data summary and an explicit note, never a fabricated one', async () => {
    const none = await generateReport(seed().deps, { period: 'day', date: '2025-06-10', by: 'boss', withAi: true });
    expect(none.summary).toMatchObject({ aiStatus: 'unavailable' });
    const llm = fakeLlm();
    llm.failWith = 'The AI service is busy.';
    const broken = await generateReport(seed(makeDeps({ llm })).deps, { period: 'day', date: '2025-06-10', by: 'boss', withAi: true });
    expect(broken.summary.aiStatus).toBe('unavailable');
    expect(broken.summary.aiNote).toMatch(/busy/);
  });

  it('every stored report carries its date range and data source', async () => {
    const { deps } = seed();
    const r = await generateReport(deps, { period: 'day', date: '2025-06-10', by: 'amy' });
    expect(r.data).toMatchObject({ rangeStart: '2025-06-10', rangeEnd: '2025-06-10', timezone: 'Asia/Kuala_Lumpur' });
    expect(r.data.source.description).toMatch(/order database/);
    expect(all(deps.db, 'SELECT id FROM reports')).toHaveLength(1);
    run(deps.db, 'DELETE FROM reports');
  });
});
