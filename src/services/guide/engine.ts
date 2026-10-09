import { planOrder } from '../budgetPlanner';
import { getFirstVisitCombo, getRecommendations } from '../recommendations';
import { rm, formatMoney } from '../../utils/money';
import type { MenuItem } from '../../types';
import type { FaqTopic, GuideAnswer, GuideContext, GuideIntent, GuideItem, Ingredient, AllergenView } from './types';

/* ------------------------------------------------------------------ intent detection */

const INGREDIENT_WORDS: Record<Ingredient, RegExp> = {
  sesame: /sesame|芝麻|\bbijan\b|wijen/i,
  peanut: /peanut|groundnut|花生|kacang\s*tanah|\bkacang\b/i,
  almond: /almond|杏仁|badam/i,
  walnut: /walnut|核桃/i,
};

const ALLERGY = /allerg|alergi|过敏|過敏|alahan|intoleran|gluten|lactose|dairy[- ]?free|nut[- ]?free|halal|haram|清真|vegan|vegetarian|\bsuci\b|kosher|素食/i;

const FAQ_PATTERNS: [FaqTopic, RegExp][] = [
  ['reservation', /reserv|book(ing)? a table|tempah|订位|訂位|预订|預訂/i],
  ['prep_time', /how long|waiting time|wait time|prepar(e|ation)|ready in|多久|berapa lama|要等/i],
  ['discounts', /discount|promo|voucher|coupon|\boffers?\b|\bdeals?\b|优惠|優惠|折扣|diskaun|promosi/i],
  ['hours', /opening hours|opening times?|business hours|open(s)? (at|until|till|on)|what time .*(open|close)|when .*(open|close)|营业|營業|几点开|幾點|waktu buka|jam buka/i],
  ['location', /where (are|is) (you|the (restaurant|shop|outlet|store))|location|address|directions?|how to get|\bmap\b|在哪|地址|alamat|lokasi/i],
  ['contact', /contact|phone number|call you|whatsapp|e-?mail|联系|聯絡|电话|電話|hubungi|nombor telefon/i],
  ['languages', /languages?|translation|bahasa|语言|語言/i],
  ['ordering', /how (do|to|can) (i|we)?\s*(place an? )?order|ordering|place an order|cara (pesan|order)|怎么点|怎麼點|如何点|如何點/i],
  ['dinein_takeaway', /take ?-?away|take ?-?out|dine ?-?in|bungkus|makan sini|堂食|外带|外帶/i],
];

/** "RM10", "rm 20", "30 ringgit", "budget 25", "预算30". Returns whole ringgit or null. */
function parseBudget(t: string): number | null {
  const m = t.match(/rm\s*(\d{1,4}(?:\.\d{1,2})?)/i) ?? t.match(/(\d{1,4}(?:\.\d{1,2})?)\s*(?:ringgit|myr|令吉|块|塊|元)/i) ?? t.match(/(?:budget|bajet|预算|預算)\D{0,6}(\d{1,4}(?:\.\d{1,2})?)/i);
  return m ? Number(m[1]) : null;
}
function parsePeople(t: string): number | undefined {
  const m = t.match(/(\d{1,2})\s*(?:people|persons?|pax|ppl|orang|人)/i) ?? t.match(/for\s+(\d{1,2})\b/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : undefined;
}

export function detectIntent(raw: string, menu: readonly MenuItem[] = []): GuideIntent {
  const t = raw.trim().slice(0, 300);
  if (!t) return { type: 'unknown' };
  const ingredient = (Object.keys(INGREDIENT_WORDS) as Ingredient[]).find((k) => INGREDIENT_WORDS[k].test(t));

  if (ALLERGY.test(t)) return { type: 'allergy', ingredient };
  for (const [topic, re] of FAQ_PATTERNS) if (re.test(t)) return { type: 'faq', topic };

  if (/differen(ce|t) between|compare|\bvs\.?\b|versus|区别|區別|差别|beza|bezanya/i.test(t)) {
    const lower = t.toLowerCase();
    const mentioned = menu.filter((m) => lower.includes(m.name.toLowerCase()) || t.includes(m.chineseName) || new RegExp(`\\b${m.productCode}\\b`, 'i').test(t)).map((m) => m.id);
    return { type: 'compare', itemIds: mentioned.length >= 2 ? mentioned.slice(0, 4) : undefined };
  }

  const budget = parseBudget(t);
  if (budget !== null && budget > 0) return { type: 'budget', amount: rm(budget), people: parsePeople(t) };
  if (ingredient) return { type: 'ingredient', ingredient };
  if (/drinks?|beverages?|\btea\b|饮料|飲料|饮品|飲品|minuman|\bteh\b/i.test(t)) return { type: 'drinks' };

  if (/first (visit|time)|new here|never (been|tried)|第一次|首次|pertama kali|kali pertama/i.test(t)) return { type: 'first_visit' };
  if (/second (visit|time)|返来|第二次|kali kedua|come back/i.test(t)) return { type: 'second_visit' };
  if (/something new|try next|next|different|another|new (flavour|flavor)|试试别的|試試別的|lain|baharu/i.test(t)) return { type: 'try_next' };
  return { type: 'unknown' };
}

/* ------------------------------------------------------------------ answers */

const byId = (menu: readonly MenuItem[]) => new Map(menu.map((m) => [m.id, m]));

function allergenOf(item: MenuItem): AllergenView {
  const a = item.allergenInfo;
  return a ? { status: 'verified', contains: a.contains, mayContain: a.mayContain ?? [], verifiedBy: a.verifiedBy, verifiedAt: a.verifiedAt } : { status: 'unknown' };
}

const base = (intent: GuideIntent['type'], messageKey: string, extra: Partial<GuideAnswer> = {}): GuideAnswer => ({
  intent,
  messageKey,
  items: [],
  notes: [],
  source: 'rules',
  ...extra,
});

export { ALLERGY as ALLERGY_WORDS };
export const GUIDE_ALLERGY_NOTES = ['guide.note.askStaff'];

export function answerIntent(intent: GuideIntent, ctx: GuideContext): GuideAnswer {
  const available = ctx.menu.filter((m) => m.available);
  const ordered = ctx.orderedItemIds;
  const recsFor = (visit: 'first' | 'returning', limit: number) =>
    getRecommendations({ menu: ctx.menu, orderedItemIds: ordered, currentCart: ctx.cartItemIds.map((itemId) => ({ itemId, quantity: 1 })), visitType: visit, orderType: ctx.orderType, limit });

  switch (intent.type) {
    case 'first_visit': {
      const combo = getFirstVisitCombo(ctx.menu, ctx.orderType);
      const items: GuideItem[] = combo.lines.map(({ role, item }) => ({ itemId: item.id, quantity: 1, reason: { key: `firstTime.role.${role}` } }));
      return base('first_visit', 'guide.msg.first', { items });
    }
    case 'second_visit':
    case 'try_next': {
      if (ordered.length === 0) {
        // Never invent a history: with none, say so and fall back to starting points.
        const items = recsFor('first', 4).map((r) => ({ itemId: r.item.id, reason: r.reason }));
        return base(intent.type, intent.type === 'second_visit' ? 'guide.msg.secondNoHistory' : 'guide.msg.nextNoHistory', { items });
      }
      const items = recsFor('returning', 4).map((r) => ({ itemId: r.item.id, reason: r.reason }));
      return base(intent.type, intent.type === 'second_visit' ? 'guide.msg.second' : 'guide.msg.next', { items });
    }
    case 'budget': {
      const people = intent.people ?? 1;
      const plan = planOrder({ menu: ctx.menu, people, budget: intent.amount, orderType: ctx.orderType });
      const params = { amount: formatMoney(intent.amount), people };
      if (plan.tooLow) return base('budget', 'guide.msg.budgetTooLow', { params });
      const mains = plan.lines.filter((l) => l.item.category === 'paste' || l.item.category === 'mixed').reduce((n, l) => n + l.quantity, 0);
      return base('budget', plan.coversEveryone ? 'guide.msg.budget' : 'guide.msg.budgetPartial', {
        params: { ...params, count: mains },
        items: plan.lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
        plan: { total: plan.total, remaining: plan.remaining, budget: plan.budget, people, coversEveryone: plan.coversEveryone },
      });
    }
    case 'ingredient': {
      const items = available.filter((m) => m.ingredients?.includes(intent.ingredient)).map((m) => ({ itemId: m.id, allergen: allergenOf(m) }));
      return base('ingredient', items.length ? 'guide.msg.ingredient' : 'guide.msg.ingredientNone', {
        params: { ingredientKey: intent.ingredient },
        items,
        notes: ['guide.note.headline', 'guide.note.askStaff'],
        contact: ctx.business.contact,
      });
    }
    case 'allergy': {
      const items = intent.ingredient ? available.filter((m) => m.ingredients?.includes(intent.ingredient!)).map((m) => ({ itemId: m.id, allergen: allergenOf(m) })) : [];
      return base('allergy', 'guide.msg.allergy', { items, notes: GUIDE_ALLERGY_NOTES, contact: ctx.business.contact, params: intent.ingredient ? { ingredientKey: intent.ingredient } : undefined });
    }
    case 'drinks': {
      return base('drinks', 'guide.msg.drinks', { items: available.filter((m) => m.category === 'drink').map((m) => ({ itemId: m.id })) });
    }
    case 'compare': {
      const map = byId(ctx.menu);
      const picked = (intent.itemIds ?? []).map((id) => map.get(id)).filter((m): m is MenuItem => !!m && m.available);
      if (picked.length >= 2) return base('compare', 'guide.msg.compare', { items: picked.map((m) => ({ itemId: m.id })) });
      return base('compare', 'guide.msg.compareOverview', { items: available.filter((m) => m.curation.signature).slice(0, 4).map((m) => ({ itemId: m.id })) });
    }
    case 'faq':
      return answerFaq(intent.topic, ctx);
    case 'unknown':
      return base('unknown', 'guide.msg.unknown', { contact: ctx.business.contact });
  }
}

function answerFaq(topic: FaqTopic, ctx: GuideContext): GuideAnswer {
  const b = ctx.business;
  const hasContact = !!(b.contact.phone || b.contact.whatsapp || b.contact.email);
  const unknown = (): GuideAnswer => base('faq', 'guide.faq.unknown', { contact: b.contact, params: { topic }, notes: hasContact ? [] : ['guide.note.askStaff'] });
  switch (topic) {
    case 'hours':
      return b.openingHours ? base('faq', 'guide.faq.hours', { value: b.openingHours }) : unknown();
    case 'location':
      return b.address ? base('faq', 'guide.faq.location', { value: b.address, params: b.mapUrl ? { mapUrl: b.mapUrl } : undefined }) : unknown();
    case 'contact':
      return hasContact ? base('faq', 'guide.faq.contact', { contact: b.contact }) : unknown();
    case 'ordering':
      return base('faq', 'guide.faq.ordering');
    case 'languages':
      return base('faq', 'guide.faq.languages', { params: { count: ctx.languageCount } });
    case 'dinein_takeaway':
      return base('faq', 'guide.faq.dineinTakeaway');
    // Not provided by the business: say so rather than guess (no reservation, wait-time or promotion claims).
    case 'reservation':
    case 'prep_time':
    case 'discounts':
      return unknown();
  }
}

/** One call for callers that have free text: detect, then answer from rules. */
export function answerText(text: string, ctx: GuideContext): { intent: GuideIntent; answer: GuideAnswer } {
  const intent = detectIntent(text, ctx.menu);
  return { intent, answer: answerIntent(intent, ctx) };
}
