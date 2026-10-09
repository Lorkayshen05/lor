import type {
  CartItem,
  FlavourTag,
  MenuItem,
  Money,
  Order,
  OrderType,
  Recommendation,
  ReasonKey,
  VisitType,
} from '../types';
import { getUnitPrice } from './pricing';
import { orderedItemIds } from './visit';

/**
 * RULE-BASED recommender. No machine learning and no sales data are involved:
 * it scores real, available menu items using the customer's own history,
 * cart, stated flavour preference, budget and the restaurant's curation flags.
 */
export interface RecommendationInput {
  menu: readonly MenuItem[];
  customerHistory?: readonly Order[];
  /** Product ids the customer has ordered, when only ids are known (e.g. sent by the client, no full orders). */
  orderedItemIds?: readonly string[];
  currentCart?: readonly CartItem[];
  visitType: VisitType;
  orderType: OrderType;
  /** TOTAL budget for the returned set (sen). The set never exceeds it. */
  budget?: Money;
  preference?: readonly FlavourTag[];
  limit?: number;
  /** Override: only exclude previously ordered items when true. Defaults to visitType !== 'first'. */
  excludeOrdered?: boolean;
}

/** A stated preference must outrank any curation boost (max boost for a first visit is 6). */
const PREFERENCE_WEIGHT = 8;

/** Finishing a cart (custard / drink) outranks novelty (max 3) but not a stated preference. */
const COMPLETE_ORDER_CUSTARD = 5;
const COMPLETE_ORDER_DRINK = 4;

const CATEGORY_ORDER = ['paste', 'mixed', 'custard', 'sweet-soup', 'cold', 'drink'];

function flavourSet(items: readonly MenuItem[]): Set<FlavourTag> {
  return new Set(items.flatMap((i) => i.flavours));
}

export function getRecommendations(input: RecommendationInput): Recommendation[] {
  const {
    menu,
    customerHistory = [],
    currentCart = [],
    visitType,
    orderType,
    budget,
    preference = [],
    limit = 4,
  } = input;
  const excludeOrdered = input.excludeOrdered ?? visitType !== 'first';

  const orderedIds = new Set([...orderedItemIds(customerHistory), ...(input.orderedItemIds ?? [])]);
  const cartIds = new Set(currentCart.map((c) => c.itemId));
  const orderedItems = menu.filter((m) => orderedIds.has(m.id));
  const orderedFlavours = flavourSet(orderedItems);
  const cartItems = menu.filter((m) => cartIds.has(m.id));
  const cartCategories = new Set(cartItems.map((c) => c.category));
  const cartHasMain = cartCategories.has('paste') || cartCategories.has('mixed');
  const lastFromHistory = [...customerHistory]
    .filter((o) => o.status !== 'cancelled')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.items[0];
  const lastId = input.orderedItemIds?.at(-1);
  const lastOrdered = lastFromHistory ?? (lastId ? { itemId: lastId } : undefined);

  const candidates = menu.filter((m) => m.available && !cartIds.has(m.id));

  const scored = candidates.map((item): Recommendation => {
    let score = 0;
    let reason: ReasonKey = { key: 'reasons.signature' };
    const matched = preference.filter((p) => item.flavours.includes(p));

    if (matched.length > 0) {
      score += matched.length * PREFERENCE_WEIGHT;
      reason = { key: 'reasons.preference', flavour: matched[0] };
    }
    if (visitType === 'first') {
      if (item.curation.firstTimerPick) {
        score += 4;
        if (matched.length === 0) reason = { key: 'reasons.firstTimer' };
      }
      if (item.curation.signature) {
        score += 2;
        if (matched.length === 0 && !item.curation.firstTimerPick) reason = { key: 'reasons.signature' };
      }
    } else {
      if (item.curation.signature) score += 1;
      const novel = item.flavours.filter((f) => !orderedFlavours.has(f)).length;
      const novelty = item.flavours.length ? novel / item.flavours.length : 0;
      score += novelty * 3;
      if (matched.length === 0 && orderedItems.length > 0 && novelty > 0) {
        reason = lastOrdered && menu.some((m) => m.id === lastOrdered.itemId)
          ? { key: 'reasons.differentFrom', relatedItemId: lastOrdered.itemId }
          : { key: 'reasons.somethingNew' };
      }
    }
    if (cartHasMain && !cartCategories.has('custard') && item.category === 'custard') {
      score += COMPLETE_ORDER_CUSTARD;
      if (matched.length === 0) reason = { key: 'reasons.completesOrder' };
    }
    if (cartHasMain && !cartCategories.has('drink') && item.curation.traditionalDrink) {
      score += COMPLETE_ORDER_DRINK;
      if (matched.length === 0) reason = { key: 'reasons.completesOrder' };
    }
    return { item, score, reason };
  });

  const byScore = (a: Recommendation, b: Recommendation) =>
    b.score - a.score ||
    CATEGORY_ORDER.indexOf(a.item.category) - CATEGORY_ORDER.indexOf(b.item.category) ||
    a.item.productCode.localeCompare(b.item.productCode);

  let ranked = scored.sort(byScore);
  if (excludeOrdered) {
    // "Where reasonable": prefer unseen products, but backfill with seen ones if the menu is small.
    const fresh = ranked.filter((r) => !orderedIds.has(r.item.id));
    const seen = ranked.filter((r) => orderedIds.has(r.item.id));
    ranked = fresh.length >= limit ? fresh : [...fresh, ...seen];
  }

  const out: Recommendation[] = [];
  let spent = 0;
  for (const rec of ranked) {
    if (out.length >= limit) break;
    const price = getUnitPrice(rec.item, orderType);
    if (budget !== undefined && spent + price > budget) continue;
    spent += price;
    out.push(rec);
  }
  return out;
}

export type ComboRole = 'signature' | 'mixed' | 'custard' | 'drink';

export interface FirstVisitCombo {
  lines: { role: ComboRole; item: MenuItem }[];
  items: MenuItem[];
  total: Money;
}

/**
 * Suggested first visit: a signature dessert + a mixed-flavour dessert + a steamed
 * custard + a traditional drink, taken from real, available menu entries and
 * priced through the central pricing function.
 */
export function getFirstVisitCombo(menu: readonly MenuItem[], orderType: OrderType): FirstVisitCombo {
  const avail = menu.filter((m) => m.available);
  const pick = (pred: (m: MenuItem) => boolean, prefer?: (m: MenuItem) => boolean) =>
    (prefer ? avail.find((m) => pred(m) && prefer(m)) : undefined) ?? avail.find(pred);

  const signature = pick(
    (m) => !!m.curation.signature && m.category === 'paste',
    (m) => !!m.curation.firstTimerPick,
  );
  const mixed = pick(
    (m) => m.category === 'mixed' && m.id !== signature?.id,
    (m) => !!m.curation.firstTimerPick,
  );
  const custard = pick(
    (m) => m.category === 'custard',
    (m) => !!m.curation.firstTimerPick,
  );
  const drink = avail
    .filter((m) => !!m.curation.traditionalDrink)
    .sort((a, b) => getUnitPrice(a, orderType) - getUnitPrice(b, orderType))[0];

  const lines = (
    [
      ['signature', signature],
      ['mixed', mixed],
      ['custard', custard],
      ['drink', drink],
    ] as const
  ).flatMap(([role, item]) => (item ? [{ role, item }] : []));
  const items = lines.map((l) => l.item);
  const total = items.reduce((s, m) => s + getUnitPrice(m, orderType), 0);
  return { lines, items, total };
}
