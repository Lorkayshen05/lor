import type { FlavourTag, MenuItem, Money, OrderType } from '../types';
import { getUnitPrice } from './pricing';

export interface PlanLine {
  item: MenuItem;
  quantity: number;
}

export interface BudgetPlan {
  lines: PlanLine[];
  total: Money;
  remaining: Money;
  budget: Money;
  people: number;
  /** One main bowl per person was achieved. */
  coversEveryone: boolean;
  /** Nothing on the menu fits inside this budget. */
  tooLow: boolean;
}

export interface BudgetPlanInput {
  menu: readonly MenuItem[];
  people: number;
  budget: Money;
  orderType: OrderType;
  preference?: readonly FlavourTag[];
}

/**
 * Builds a combination from real menu items. Invariant: total <= budget, always —
 * every addition is checked against the remaining budget before it is made.
 *
 * Order of building: (1) one main bowl each, varied; (2) a shared custard per two
 * people; (3) a traditional drink each; (4) spend any leftover on extra drinks only
 * up to the headcount. The remainder is reported, never padded.
 */
export function planOrder(input: BudgetPlanInput): BudgetPlan {
  const { menu, orderType, budget, preference = [] } = input;
  const people = Math.max(1, Math.floor(input.people));
  const price = (m: MenuItem) => getUnitPrice(m, orderType);
  const avail = menu.filter((m) => m.available);

  const rank = (m: MenuItem) =>
    preference.filter((p) => m.flavours.includes(p)).length * 3 +
    (m.curation.signature ? 2 : 0) +
    (m.curation.firstTimerPick ? 1 : 0);
  const sortBest = (a: MenuItem, b: MenuItem) => rank(b) - rank(a) || a.productCode.localeCompare(b.productCode);

  const mains = avail.filter((m) => m.category === 'paste' || m.category === 'mixed').sort(sortBest);
  const custards = avail.filter((m) => m.category === 'custard').sort(sortBest);
  const drinks = avail
    .filter((m) => m.curation.traditionalDrink || m.category === 'drink')
    .sort((a, b) => Number(!!b.curation.traditionalDrink) - Number(!!a.curation.traditionalDrink) || sortBest(a, b));

  const picked = new Map<string, PlanLine>();
  let spent = 0;
  const tryAdd = (item: MenuItem | undefined): boolean => {
    if (!item || spent + price(item) > budget) return false;
    spent += price(item);
    const line = picked.get(item.id);
    if (line) line.quantity += 1;
    else picked.set(item.id, { item, quantity: 1 });
    return true;
  };

  // 1. Mains — cycle through ranked distinct items; fall back to the cheapest that still fits.
  const cheapestMain = [...mains].sort((a, b) => price(a) - price(b))[0];
  let mainsAdded = 0;
  for (let i = 0; i < people; i++) {
    const preferred = mains.find((m) => !picked.has(m.id) && spent + price(m) <= budget);
    if (tryAdd(preferred) || tryAdd(cheapestMain)) mainsAdded++;
    else break;
  }

  // 2. Shared custards.
  const wantedCustards = Math.ceil(people / 2);
  for (let i = 0; i < wantedCustards; i++) {
    const c = custards.find((x) => (picked.get(x.id)?.quantity ?? 0) === 0 && spent + price(x) <= budget)
      ?? [...custards].sort((a, b) => price(a) - price(b)).find((x) => spent + price(x) <= budget);
    if (!tryAdd(c)) break;
  }

  // 3. Drinks, one per person at most.
  for (let i = 0; i < people; i++) {
    const d = drinks.find((x) => spent + price(x) <= budget);
    if (!tryAdd(d)) break;
  }

  const lines = [...picked.values()];
  return {
    lines,
    total: spent,
    remaining: budget - spent,
    budget,
    people,
    coversEveryone: mainsAdded >= people,
    tooLow: lines.length === 0,
  };
}
