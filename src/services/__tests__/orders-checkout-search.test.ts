import { MENU, MENU_BY_ID } from '../../data/menu';
import { buildOrder, localOrderRepository, makeOrderId } from '../orderHistory';
import { createLocalGateway } from '../orderGateway';
import { validateCheckout, normalizePhone } from '../checkout';
import { normalizeText, searchMenu } from '../search';
import { makeOrder } from '../../test/fixtures';

describe('order history', () => {
  it('builds an immutable snapshot with the right prices and no personal data', () => {
    const order = buildOrder(
      { cart: [{ itemId: 'black-sesame-paste', quantity: 2 }], orderType: 'takeaway', pickupInMinutes: 15, tableNumber: 'a1' },
      MENU_BY_ID,
      'cust-1',
      new Date('2025-03-04T05:06:07Z'),
    );
    expect(order.items[0]).toMatchObject({ itemId: 'black-sesame-paste', quantity: 2, unitPrice: MENU_BY_ID.get('black-sesame-paste')!.takeawayPrice });
    expect(order.total).toBe(order.items[0]!.unitPrice * 2);
    expect(order.tableNumber).toBeUndefined(); // takeaway has no table
    expect(order.pickupInMinutes).toBe(15);
    expect(order.status).toBe('new');
    expect(order.orderId).toMatch(/^RDH-\d{6}-[0-9A-Z]{4}$/);
    expect(Object.keys(order)).not.toContain('name');
    expect(Object.keys(order)).not.toContain('phone');
  });
  it('normalises table numbers for dine-in', () => {
    const order = buildOrder({ cart: [{ itemId: 'soy-milk', quantity: 1 }], orderType: 'dine-in', tableNumber: ' b7 ' }, MENU_BY_ID, 'c');
    expect(order.tableNumber).toBe('B7');
  });
  it('persists, lists newest first, finds by id and survives corrupt storage', () => {
    const older = makeOrder(['soy-milk'], { orderId: 'O1', timestamp: '2025-01-01T00:00:00Z' });
    const newer = makeOrder(['peanut-paste'], { orderId: 'O2', timestamp: '2025-02-01T00:00:00Z' });
    localOrderRepository.add(older);
    localOrderRepository.add(newer);
    expect(localOrderRepository.list().map((o) => o.orderId)).toEqual(['O2', 'O1']);
    expect(localOrderRepository.get('O1')?.orderId).toBe('O1');
    window.localStorage.setItem('rdh.orders.v1', '{not json');
    expect(localOrderRepository.list()).toEqual([]);
    window.localStorage.setItem('rdh.orders.v1', JSON.stringify([{ nope: true }, older]));
    expect(localOrderRepository.list()).toHaveLength(1);
  });
  it('gives a stable anonymous customer id', () => {
    const a = localOrderRepository.getCustomerId();
    expect(a).toBeTruthy();
    expect(localOrderRepository.getCustomerId()).toBe(a);
  });
  it('local gateway builds the order on-device; ids are well formed', async () => {
    const order = await createLocalGateway(MENU_BY_ID).submit({ items: [{ itemId: 'soy-milk', quantity: 2 }], orderType: 'takeaway', pickupInMinutes: 15, contact: { name: 'x', phone: '' }, expectedTotal: 800, customerId: 'c1', language: 'en', idempotencyKey: 'ik_test' });
    expect(order).toMatchObject({ total: 800, status: 'new', orderType: 'takeaway', customerId: 'c1' });
    expect(makeOrderId(new Date('2025-12-31T00:00:00'))).toMatch(/^RDH-251231-/);
  });
});

describe('checkout validation', () => {
  const ok = { name: 'Mei', phone: '012 345 6789', tableNumber: 'A12' };
  it('accepts valid dine-in and takeaway orders', () => {
    expect(validateCheckout({ ...ok, name: '', phone: '' }, 'dine-in', 1)).toEqual({});
    expect(validateCheckout({ ...ok, tableNumber: '' }, 'takeaway', 1)).toEqual({});
  });
  it('requires a table number for dine-in with a useful message key', () => {
    expect(validateCheckout({ ...ok, tableNumber: '  ' }, 'dine-in', 1).tableNumber).toBe('errors.tableRequired');
    expect(validateCheckout({ ...ok, tableNumber: 'A 1!' }, 'dine-in', 1).tableNumber).toBe('errors.tableInvalid');
    expect(validateCheckout({ ...ok, tableNumber: 'ABCDEFG' }, 'dine-in', 1).tableNumber).toBe('errors.tableInvalid');
  });
  it('requires name and phone for takeaway and validates the phone', () => {
    expect(validateCheckout({ ...ok, name: ' ' }, 'takeaway', 1).name).toBe('errors.nameRequired');
    expect(validateCheckout({ ...ok, phone: '' }, 'takeaway', 1).phone).toBe('errors.phoneRequired');
    expect(validateCheckout({ ...ok, phone: '12ab' }, 'takeaway', 1).phone).toBe('errors.phoneInvalid');
    expect(validateCheckout({ ...ok, phone: '+60 12-345 6789' }, 'takeaway', 1).phone).toBeUndefined();
    expect(normalizePhone('+60 (12) 345-6789')).toBe('+60123456789');
  });
  it('blocks an empty cart or unavailable items', () => {
    expect(validateCheckout(ok, 'dine-in', 0).cart).toBe('errors.cartEmpty');
    expect(validateCheckout(ok, 'dine-in', 1, true).cart).toBe('errors.unavailableItems');
  });
  it('does not require takeaway fields for dine-in nor a table for takeaway', () => {
    const e = validateCheckout({ name: '', phone: '', tableNumber: 'A1' }, 'dine-in', 1);
    expect(e.phone).toBeUndefined();
  });
});

describe('search', () => {
  const fields = (m: (typeof MENU)[number]) => [m.name, m.chineseName, m.productCode, m.category];
  const find = (q: string, f = fields) => searchMenu(MENU, q, f).map((m) => m.id);

  it('matches English name, Chinese name, product code and category', () => {
    expect(find('sesame')).toContain('black-sesame-paste');
    expect(find('芝麻')).toEqual(expect.arrayContaining(['black-sesame-paste', 'sesame-peanut-mixed']));
    expect(find('a01')).toEqual(['black-sesame-paste']);
    expect(find('custard')).toEqual(expect.arrayContaining(['steamed-egg-custard']));
    expect(find('sweet-soup')).toEqual(['red-bean-soup', 'green-bean-soup']);
  });
  it('requires every word to match and is case/diacritic insensitive', () => {
    expect(find('BLACK  paste')).toEqual(['black-sesame-paste']);
    expect(find('peanut zzz')).toEqual([]);
    expect(normalizeText('Crème  Brûlée')).toBe('creme  brulee');
  });
  it('searches localized names where translations exist', () => {
    const localized = (m: (typeof MENU)[number]) => [...fields(m), m.id === 'grass-jelly' ? 'Cincau' : ''];
    expect(find('cincau', localized)).toEqual(['grass-jelly']);
  });
  it('returns everything for an empty query and nothing for gibberish', () => {
    expect(find('')).toHaveLength(MENU.length);
    expect(find('qqqq')).toEqual([]);
  });
});
