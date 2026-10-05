import { MENU, MENU_BY_ID } from '../../data/menu';
import { getUnitPrice, priceCart } from '../pricing';
import { cartCovers, cartReducer, clampQuantity, orderToCart, sanitizeCart } from '../cart';
import { formatMoney, rm } from '../../utils/money';
import { byId, makeOrder } from '../../test/fixtures';

describe('menu data', () => {
  it('loads a non-empty menu with unique ids and product codes', () => {
    expect(MENU.length).toBeGreaterThan(0);
    expect(new Set(MENU.map((m) => m.id)).size).toBe(MENU.length);
    expect(new Set(MENU.map((m) => m.productCode)).size).toBe(MENU.length);
  });
  it('stores prices as positive integer sen', () => {
    for (const m of MENU) {
      expect(Number.isInteger(m.dineInPrice) && m.dineInPrice > 0).toBe(true);
      expect(Number.isInteger(m.takeawayPrice) && m.takeawayPrice > 0).toBe(true);
    }
  });
  it('flags every sample item as placeholder so nothing passes as confirmed data', () => {
    expect(MENU.every((m) => m.placeholder)).toBe(true);
  });
});

describe('pricing', () => {
  it('rm() avoids float drift', () => {
    expect(rm(8.8)).toBe(880);
    expect(rm(0.1 + 0.2)).toBe(30);
  });
  it('picks the price by order type in one place', () => {
    const item = byId('black-sesame-paste');
    expect(getUnitPrice(item, 'dine-in')).toBe(item.dineInPrice);
    expect(getUnitPrice(item, 'takeaway')).toBe(item.takeawayPrice);
  });
  it('totals the cart and re-prices when order type changes', () => {
    const cart = [
      { itemId: 'black-sesame-paste', quantity: 2 },
      { itemId: 'chinese-tea', quantity: 1 },
    ];
    const dine = priceCart(cart, MENU_BY_ID, 'dine-in');
    const take = priceCart(cart, MENU_BY_ID, 'takeaway');
    expect(dine.total).toBe(byId('black-sesame-paste').dineInPrice * 2 + byId('chinese-tea').dineInPrice);
    expect(take.total).toBe(byId('black-sesame-paste').takeawayPrice * 2 + byId('chinese-tea').takeawayPrice);
    expect(dine.count).toBe(3);
    expect(dine.subtotal).toBe(dine.total);
  });
  it('reports unavailable / unknown items instead of pricing them', () => {
    const menu = new Map(MENU_BY_ID);
    menu.set('peanut-paste', { ...byId('peanut-paste'), available: false });
    const t = priceCart([{ itemId: 'peanut-paste', quantity: 1 }, { itemId: 'ghost', quantity: 1 }], menu, 'dine-in');
    expect(t.lines).toHaveLength(0);
    expect(t.unavailable).toHaveLength(2);
    expect(t.total).toBe(0);
  });
  it('formats money', () => {
    expect(formatMoney(750)).toBe('RM 7.50');
  });
});

describe('cart reducer', () => {
  it('adds, merges and increments', () => {
    let c = cartReducer([], { type: 'add', itemId: 'a' });
    c = cartReducer(c, { type: 'add', itemId: 'a', quantity: 2 });
    c = cartReducer(c, { type: 'increment', itemId: 'a' });
    expect(c).toEqual([{ itemId: 'a', quantity: 4 }]);
  });
  it('removes a line when decremented to zero and never goes negative', () => {
    let c = cartReducer([{ itemId: 'a', quantity: 1 }], { type: 'decrement', itemId: 'a' });
    expect(c).toEqual([]);
    c = cartReducer(c, { type: 'decrement', itemId: 'a' });
    expect(c).toEqual([]);
  });
  it('rejects invalid quantities', () => {
    expect(clampQuantity(NaN)).toBe(0);
    expect(clampQuantity(-3)).toBe(0);
    expect(clampQuantity(2.9)).toBe(2);
    expect(clampQuantity(999)).toBe(20);
    expect(cartReducer([], { type: 'setQuantity', itemId: 'a', quantity: Infinity })).toEqual([]);
    expect(cartReducer([], { type: 'add', itemId: 'a', quantity: 0 })).toEqual([]);
    expect(cartReducer([{ itemId: 'a', quantity: 19 }], { type: 'add', itemId: 'a', quantity: 5 })).toEqual([{ itemId: 'a', quantity: 20 }]);
  });
  it('removes, clears, replaces and bulk-adds', () => {
    const base = [{ itemId: 'a', quantity: 1 }, { itemId: 'b', quantity: 2 }];
    expect(cartReducer(base, { type: 'remove', itemId: 'a' })).toEqual([{ itemId: 'b', quantity: 2 }]);
    expect(cartReducer(base, { type: 'clear' })).toEqual([]);
    expect(cartReducer(base, { type: 'replace', items: [{ itemId: 'c', quantity: 3 }] })).toEqual([{ itemId: 'c', quantity: 3 }]);
    expect(cartReducer(base, { type: 'addMany', items: [{ itemId: 'a', quantity: 1 }, { itemId: 'z', quantity: 1 }] })).toEqual([
      { itemId: 'a', quantity: 2 },
      { itemId: 'b', quantity: 2 },
      { itemId: 'z', quantity: 1 },
    ]);
  });
  it('sanitizes malformed persisted data', () => {
    expect(sanitizeCart('nope')).toEqual([]);
    expect(sanitizeCart([{ itemId: 'a', quantity: 2 }, { itemId: 5 }, null, { itemId: 'b', quantity: -1 }])).toEqual([{ itemId: 'a', quantity: 2 }]);
  });
});

describe('reorder', () => {
  it('rebuilds a cart from an order and reports items no longer available', () => {
    const order = makeOrder(['black-sesame-paste', 'peanut-paste']);
    const menu = new Map(MENU_BY_ID);
    menu.set('peanut-paste', { ...byId('peanut-paste'), available: false });
    const { items, skippedNames } = orderToCart(order, menu);
    expect(items).toEqual([{ itemId: 'black-sesame-paste', quantity: 1 }]);
    expect(skippedNames).toEqual(['Peanut Paste']);
  });
});

describe('cartCovers', () => {
  it('is true only when every wanted quantity is already in the cart', () => {
    const cart = [{ itemId: 'a', quantity: 2 }, { itemId: 'b', quantity: 1 }];
    expect(cartCovers(cart, [{ itemId: 'a', quantity: 2 }, { itemId: 'b', quantity: 1 }])).toBe(true);
    expect(cartCovers(cart, [{ itemId: 'a', quantity: 3 }])).toBe(false);
    expect(cartCovers(cart, [{ itemId: 'c', quantity: 1 }])).toBe(false);
    expect(cartCovers(cart, [])).toBe(false);
  });
});

describe('formatMoney', () => {
  it('is stable and exact for every sen value that can occur', () => {
    expect(formatMoney(0)).toBe('RM 0.00');
    expect(formatMoney(5)).toBe('RM 0.05');
    expect(formatMoney(100000)).toBe('RM 1,000.00');
    for (const m of MENU) {
      expect(formatMoney(m.dineInPrice)).toMatch(/^RM \d+\.\d{2}$/);
    }
  });
});
