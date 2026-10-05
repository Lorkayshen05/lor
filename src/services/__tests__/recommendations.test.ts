import { MENU, MENU_BY_ID } from '../../data/menu';
import { getRecommendations, getFirstVisitCombo } from '../recommendations';
import { planOrder } from '../budgetPlanner';
import { computeBestSellers } from '../bestSellers';
import { getUnitPrice } from '../pricing';
import { discoveryFilterIds } from './helpers';
import { filterMenu } from '../discovery';
import { getVisitType, orderedItemIds } from '../visit';
import { makeOrder } from '../../test/fixtures';
import { rm } from '../../utils/money';
import type { OrderType } from '../../types';

const ids = (recs: { item: { id: string } }[]) => recs.map((r) => r.item.id);

describe('getRecommendations', () => {
  it('returns only real, available menu products', () => {
    const menu = MENU.map((m) => (m.id === 'walnut-paste' ? { ...m, available: false } : m));
    const recs = getRecommendations({ menu, visitType: 'first', orderType: 'dine-in', limit: 20 });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(MENU_BY_ID.has(r.item.id)).toBe(true);
      expect(r.item.available).toBe(true);
    }
    expect(ids(recs)).not.toContain('walnut-paste');
  });

  it('prefers curated first-timer picks for a first visit', () => {
    const recs = getRecommendations({ menu: MENU, visitType: 'first', orderType: 'dine-in', limit: 3 });
    expect(recs.every((r) => r.item.curation.firstTimerPick || r.item.curation.signature)).toBe(true);
  });

  it('honours flavour preference and explains why', () => {
    const recs = getRecommendations({ menu: MENU, visitType: 'first', orderType: 'dine-in', preference: ['refreshing'], limit: 3 });
    expect(recs[0]!.item.flavours).toContain('refreshing');
    expect(recs[0]!.reason).toEqual({ key: 'reasons.preference', flavour: 'refreshing' });
  });

  it('avoids products already ordered for returning customers ("try something new")', () => {
    const history = [makeOrder(['black-sesame-paste', 'peanut-paste'])];
    const recs = getRecommendations({ menu: MENU, customerHistory: history, visitType: 'returning', orderType: 'dine-in', limit: 6 });
    expect(ids(recs)).not.toContain('black-sesame-paste');
    expect(ids(recs)).not.toContain('peanut-paste');
  });

  it('recommends different flavours from what was ordered before', () => {
    const history = [makeOrder(['black-sesame-paste'])];
    const recs = getRecommendations({ menu: MENU, customerHistory: history, visitType: 'second', orderType: 'dine-in', limit: 1 });
    const top = recs[0]!;
    expect(top.item.flavours.some((f) => !['sesame', 'nutty', 'traditional'].includes(f))).toBe(true);
    expect(top.reason.key).toBe('reasons.differentFrom');
    expect(top.reason.relatedItemId).toBe('black-sesame-paste');
  });

  it('backfills with seen items only when the menu is too small', () => {
    const small = MENU.slice(0, 3);
    const history = [makeOrder([small[0]!.id])];
    const recs = getRecommendations({ menu: small, customerHistory: history, visitType: 'returning', orderType: 'dine-in', limit: 3 });
    expect(recs).toHaveLength(3);
    expect(recs[2]!.item.id).toBe(small[0]!.id);
  });

  it('excludes what is already in the cart (session fallback) and suggests completing the order', () => {
    const recs = getRecommendations({
      menu: MENU,
      currentCart: [{ itemId: 'black-sesame-paste', quantity: 1 }],
      visitType: 'first',
      orderType: 'dine-in',
      limit: 3,
    });
    expect(ids(recs)).not.toContain('black-sesame-paste');
    expect(recs.some((r) => r.reason.key === 'reasons.completesOrder')).toBe(true);
  });

  it.each<OrderType>(['dine-in', 'takeaway'])('never exceeds the total budget (%s)', (orderType) => {
    for (const budget of [rm(3), rm(10), rm(20), rm(30), rm(50)]) {
      const recs = getRecommendations({ menu: MENU, visitType: 'first', orderType, budget, limit: 6 });
      const total = recs.reduce((s, r) => s + getUnitPrice(r.item, orderType), 0);
      expect(total).toBeLessThanOrEqual(budget);
    }
  });

  it('is deterministic', () => {
    const a = getRecommendations({ menu: MENU, visitType: 'first', orderType: 'dine-in' });
    const b = getRecommendations({ menu: MENU, visitType: 'first', orderType: 'dine-in' });
    expect(ids(a)).toEqual(ids(b));
  });
});

describe('getFirstVisitCombo', () => {
  it.each<OrderType>(['dine-in', 'takeaway'])('builds signature + mixed + custard + traditional drink priced from the menu (%s)', (orderType) => {
    const combo = getFirstVisitCombo(MENU, orderType);
    expect(combo.lines.map((l) => l.role)).toEqual(['signature', 'mixed', 'custard', 'drink']);
    expect(new Set(combo.items.map((i) => i.id)).size).toBe(4);
    expect(combo.total).toBe(combo.items.reduce((s, i) => s + getUnitPrice(i, orderType), 0));
    expect(combo.lines[3]!.item.curation.traditionalDrink).toBe(true);
  });
  it('omits roles it cannot fill instead of inventing products', () => {
    const noCustard = MENU.filter((m) => m.category !== 'custard');
    expect(getFirstVisitCombo(noCustard, 'dine-in').lines.map((l) => l.role)).not.toContain('custard');
  });
});

describe('planOrder (budget planner)', () => {
  const peopleOptions = [1, 2, 3, 4];
  const budgets = [rm(1), rm(2.5), rm(5), rm(7), rm(10), rm(20), rm(30), rm(50), rm(80)];

  it('NEVER exceeds the budget, for every group size, budget and order type', () => {
    for (const orderType of ['dine-in', 'takeaway'] as const) {
      for (const people of peopleOptions) {
        for (const budget of budgets) {
          const plan = planOrder({ menu: MENU, people, budget, orderType });
          expect(plan.total).toBeLessThanOrEqual(budget);
          expect(plan.remaining).toBe(budget - plan.total);
          const recomputed = plan.lines.reduce((s, l) => s + getUnitPrice(l.item, orderType) * l.quantity, 0);
          expect(recomputed).toBe(plan.total);
        }
      }
    }
  });
  it('uses only real available items', () => {
    const menu = MENU.map((m) => (m.category === 'custard' ? { ...m, available: false } : m));
    const plan = planOrder({ menu, people: 2, budget: rm(30), orderType: 'dine-in' });
    expect(plan.lines.every((l) => l.item.available && MENU_BY_ID.has(l.item.id))).toBe(true);
    expect(plan.lines.some((l) => l.item.category === 'custard')).toBe(false);
  });
  it('flags a budget that is too low and one that cannot cover everyone', () => {
    expect(planOrder({ menu: MENU, people: 1, budget: rm(1), orderType: 'dine-in' }).tooLow).toBe(true);
    const tight = planOrder({ menu: MENU, people: 4, budget: rm(10), orderType: 'dine-in' });
    expect(tight.tooLow).toBe(false);
    expect(tight.coversEveryone).toBe(false);
  });
  it('gives a bowl to everyone when the budget allows, with a shared custard', () => {
    const plan = planOrder({ menu: MENU, people: 2, budget: rm(30), orderType: 'dine-in' });
    expect(plan.coversEveryone).toBe(true);
    expect(plan.lines.some((l) => l.item.category === 'custard')).toBe(true);
  });
});

describe('best sellers', () => {
  const orders = (n: number) =>
    Array.from({ length: n }, (_, i) => makeOrder(i % 3 === 0 ? ['peanut-paste', 'chinese-tea'] : ['black-sesame-paste']));

  it('does NOT fabricate a ranking without enough real orders', () => {
    expect(computeBestSellers([], MENU)).toBeNull();
    expect(computeBestSellers(orders(10), MENU)).toBeNull();
  });
  it('ranks by quantity sold once enough real orders exist', () => {
    const r = computeBestSellers(orders(60), MENU)!;
    expect(r.map((x) => x.itemId)).toEqual(['black-sesame-paste', 'peanut-paste', 'chinese-tea']);
    expect(r[0]).toMatchObject({ rank: 1, quantitySold: 40, orderCount: 40 });
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
  });
  it('ignores cancelled orders when counting evidence', () => {
    const cancelled = orders(60).map((o) => ({ ...o, status: 'cancelled' as const }));
    expect(computeBestSellers(cancelled, MENU)).toBeNull();
  });
});

describe('visit type, history and discovery filters', () => {
  it('derives visit type only from real history', () => {
    expect(getVisitType([])).toBe('first');
    expect(getVisitType([makeOrder(['peanut-paste'])])).toBe('second');
    expect(getVisitType([makeOrder(['peanut-paste']), makeOrder(['soy-milk'])])).toBe('returning');
    expect(getVisitType([makeOrder(['peanut-paste'], { status: 'cancelled' })])).toBe('first');
  });
  it('collects ordered ids', () => {
    expect([...orderedItemIds([makeOrder(['peanut-paste', 'soy-milk'])])].sort()).toEqual(['peanut-paste', 'soy-milk']);
  });
  it('implements the discovery filters over real products', () => {
    const seen = new Set(['black-sesame-paste']);
    const f = (name: Parameters<typeof discoveryFilterIds>[1]) => discoveryFilterIds(MENU, name, seen);
    expect(f('signature')).toContain('black-sesame-paste');
    expect(f('drinks').every((id) => MENU_BY_ID.get(id)!.category === 'drink')).toBe(true);
    expect(f('try-new')).not.toContain('black-sesame-paste');
    expect(f('mixed')).toContain('sesame-peanut-mixed');
    expect(f('rich-nutty')).toContain('walnut-paste');
    expect(f('warm-silky')).toContain('steamed-egg-custard');
    expect(f('light-refreshing')).toContain('grass-jelly');
    expect(f('first-time').length).toBeGreaterThan(0);
    expect(filterMenu(MENU, null, { seenIds: seen })).toHaveLength(MENU.length);
  });
});
