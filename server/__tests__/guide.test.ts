// @vitest-environment node
import { BUSINESS, type BusinessFacts } from '../../src/data/business';
import { MENU } from '../../src/data/menu';
import { answerIntent, answerText, detectIntent } from '../../src/services/guide/engine';
import type { GuideContext } from '../../src/services/guide/types';
import { getUnitPrice } from '../../src/services/pricing';
import { aiGuideAnswer, validateAiAnswer } from '../modules/ai/guide';
import { listRuns } from '../modules/automation';
import { fakeLlm, makeDeps } from './helpers';

const ctx = (over: Partial<GuideContext> = {}): GuideContext => ({ menu: MENU, orderType: 'dine-in', orderedItemIds: [], cartItemIds: [], business: BUSINESS, languageCount: 50, ...over });
const ids = (a: { items: { itemId: string }[] }) => a.items.map((i) => i.itemId);

describe('intent detection (English, Chinese, Malay keywords)', () => {
  const cases: [string, string][] = [
    ['What should I try on my first visit?', 'first_visit'],
    ['第一次来吃什么好', 'first_visit'],
    ['Saya pertama kali di sini', 'first_visit'],
    ['What should I order on my second visit?', 'second_visit'],
    ['Which combination should I try next?', 'try_next'],
    ['Which dessert contains sesame?', 'ingredient'],
    ['哪个有花生', 'ingredient'],
    ['mana yang ada badam', 'ingredient'],
    ['anything with walnut?', 'ingredient'],
    ['What can I order within RM10?', 'budget'],
    ['I have 30 ringgit for 2 people', 'budget'],
    ['预算30', 'budget'],
    ['What drinks are available?', 'drinks'],
    ['What is the difference between the menu items?', 'compare'],
    ['Am I allergic to peanuts if I eat this?', 'allergy'],
    ['Is it halal?', 'allergy'],
    ['Is there gluten in it', 'allergy'],
    ['What are your opening hours?', 'faq'],
    ['Where are you located?', 'faq'],
    ['Can I book a table?', 'faq'],
    ['how do I order', 'faq'],
    ['blah blah', 'unknown'],
    ['', 'unknown'],
  ];
  it.each(cases)('%s → %s', (text, type) => expect(detectIntent(text, MENU).type).toBe(type));

  it('allergy beats ingredient: "peanut allergy" is never answered as a menu lookup', () => {
    expect(detectIntent('I have a peanut allergy, what can I eat', MENU)).toEqual({ type: 'allergy', ingredient: 'peanut' });
  });
  it('extracts budget and group size', () => {
    expect(detectIntent('RM 20 for 2 people', MENU)).toEqual({ type: 'budget', amount: 2000, people: 2 });
    expect(detectIntent('budget 15.50', MENU)).toEqual({ type: 'budget', amount: 1550, people: undefined });
  });
  it('finds two named items to compare', () => {
    const i = detectIntent('difference between Peanut Paste and Almond Paste', MENU);
    expect(i).toEqual({ type: 'compare', itemIds: ['peanut-paste', 'almond-paste'] });
  });
});

describe('answers come only from the real menu', () => {
  it('first visit: signature + mixed + custard + traditional drink, all real and available', () => {
    const a = answerIntent({ type: 'first_visit' }, ctx());
    expect(a.items).toHaveLength(4);
    expect(a.items.every((i) => MENU.some((m) => m.id === i.itemId && m.available))).toBe(true);
    expect(a.items.map((i) => i.reason?.key)).toEqual(['firstTime.role.signature', 'firstTime.role.mixed', 'firstTime.role.custard', 'firstTime.role.drink']);
  });

  it('second visit WITHOUT history says so and does not invent one', () => {
    const a = answerIntent({ type: 'second_visit' }, ctx());
    expect(a.messageKey).toBe('guide.msg.secondNoHistory');
    expect(a.items.length).toBeGreaterThan(0);
  });

  it('second visit WITH legitimate history recommends different products and flavours, and explains why', () => {
    const a = answerIntent({ type: 'second_visit' }, ctx({ orderedItemIds: ['black-sesame-paste', 'peanut-paste'] }));
    expect(a.messageKey).toBe('guide.msg.second');
    expect(ids(a)).not.toContain('black-sesame-paste');
    expect(ids(a)).not.toContain('peanut-paste');
    expect(a.items.every((i) => i.reason)).toBe(true);
    expect(a.items.some((i) => i.reason?.key === 'reasons.differentFrom')).toBe(true);
  });

  it('"try next" avoids what is in the cart and what was ordered', () => {
    const a = answerIntent({ type: 'try_next' }, ctx({ orderedItemIds: ['walnut-paste'], cartItemIds: ['soy-milk'] }));
    expect(ids(a)).not.toEqual(expect.arrayContaining(['walnut-paste']));
    expect(ids(a)).not.toContain('soy-milk');
  });

  it.each([1000, 2000, 3000])('budget RM%i: the plan never exceeds it, for 1–4 people and both order types', (amount) => {
    for (const orderType of ['dine-in', 'takeaway'] as const) {
      for (const people of [1, 2, 3, 4]) {
        const a = answerIntent({ type: 'budget', amount, people }, ctx({ orderType }));
        if (a.messageKey === 'guide.msg.budgetTooLow') continue;
        const total = a.items.reduce((s, i) => s + getUnitPrice(MENU.find((m) => m.id === i.itemId)!, orderType) * (i.quantity ?? 1), 0);
        expect(total).toBeLessThanOrEqual(amount);
        expect(a.plan?.total).toBe(total);
        expect(a.plan?.remaining).toBe(amount - total);
      }
    }
  });
  it('budget too low for anything → says so, suggests nothing', () => {
    const a = answerIntent({ type: 'budget', amount: 100 }, ctx());
    expect(a).toMatchObject({ messageKey: 'guide.msg.budgetTooLow', items: [] });
  });

  it('ingredient lookups list items by DECLARED headline ingredient and flag allergen info as unverified', () => {
    const sesame = answerIntent({ type: 'ingredient', ingredient: 'sesame' }, ctx());
    expect(ids(sesame).sort()).toEqual(['black-sesame-paste', 'sesame-almond-mixed', 'sesame-peanut-mixed']);
    expect(sesame.items.every((i) => i.allergen?.status === 'unknown')).toBe(true);
    expect(sesame.notes).toEqual(['guide.note.headline', 'guide.note.askStaff']);
    expect(ids(answerIntent({ type: 'ingredient', ingredient: 'walnut' }, ctx()))).toEqual(['walnut-paste']);
    expect(ids(answerIntent({ type: 'ingredient', ingredient: 'peanut' }, ctx())).sort()).toEqual(['peanut-paste', 'sesame-peanut-mixed']);
  });

  it('an unavailable item is never recommended', () => {
    const menu = MENU.map((m) => (m.id === 'walnut-paste' ? { ...m, available: false } : m));
    expect(ids(answerIntent({ type: 'ingredient', ingredient: 'walnut' }, ctx({ menu })))).toEqual([]);
    expect(answerIntent({ type: 'ingredient', ingredient: 'walnut' }, ctx({ menu })).messageKey).toBe('guide.msg.ingredientNone');
  });

  it('ALLERGY: never guesses. Always refers to staff; shows verified data only when it exists', () => {
    const a = answerText('I am allergic to peanut', ctx()).answer;
    expect(a.messageKey).toBe('guide.msg.allergy');
    expect(a.notes).toContain('guide.note.askStaff');
    expect(a.items.every((i) => i.allergen?.status === 'unknown')).toBe(true);

    const verified = MENU.map((m) => (m.id === 'peanut-paste' ? { ...m, allergenInfo: { contains: ['peanut'], verifiedBy: 'Chef Lim', verifiedAt: '2025-06-01' } } : m));
    const b = answerIntent({ type: 'allergy', ingredient: 'peanut' }, ctx({ menu: verified }));
    expect(b.items.find((i) => i.itemId === 'peanut-paste')?.allergen).toEqual({ status: 'verified', contains: ['peanut'], mayContain: [], verifiedBy: 'Chef Lim', verifiedAt: '2025-06-01' });
    expect(b.items.find((i) => i.itemId === 'sesame-peanut-mixed')?.allergen).toEqual({ status: 'unknown' }); // not verified → still unknown
    expect(b.notes).toContain('guide.note.askStaff'); // staff referral is never dropped
  });

  it('drinks lists only drinks', () => {
    const a = answerIntent({ type: 'drinks' }, ctx());
    expect(a.items.every((i) => MENU.find((m) => m.id === i.itemId)!.category === 'drink')).toBe(true);
    expect(a.items).toHaveLength(MENU.filter((m) => m.category === 'drink').length);
  });
});

describe('FAQ: verified facts only', () => {
  const none: BusinessFacts = { openingHours: null, address: null, mapUrl: null, contact: { phone: null, whatsapp: null, email: null } };
  const full: BusinessFacts = { openingHours: 'Daily 10am–10pm', address: '1 Jalan Ruby', mapUrl: 'https://maps.example/ruby', contact: { phone: '+60 3 1234 5678', whatsapp: null, email: 'hi@ruby.example' } };

  it('with no verified information it says so and never invents hours, address, reservations, waiting times or discounts', () => {
    for (const q of ['What are your opening hours?', 'Where are you?', 'Can I reserve a table?', 'How long is the wait?', 'Do you have any discounts?', 'what is your phone number']) {
      const a = answerText(q, ctx({ business: none })).answer;
      expect(a.messageKey, q).toBe('guide.faq.unknown');
      expect(a.value, q).toBeUndefined();
      expect(a.notes, q).toContain('guide.note.askStaff'); // no contact on file → points to staff
    }
  });

  it('answers hours/location/contact from the verified facts, verbatim', () => {
    expect(answerText('opening hours?', ctx({ business: full })).answer).toMatchObject({ messageKey: 'guide.faq.hours', value: 'Daily 10am–10pm' });
    expect(answerText('where are you', ctx({ business: full })).answer).toMatchObject({ messageKey: 'guide.faq.location', value: '1 Jalan Ruby' });
    expect(answerText('contact', ctx({ business: full })).answer).toMatchObject({ messageKey: 'guide.faq.contact', contact: full.contact });
  });

  it('reservation, waiting time and discounts stay "unknown" even when other facts exist', () => {
    for (const q of ['Can I book a table?', 'how long does it take', 'any promo?']) {
      const a = answerText(q, ctx({ business: full })).answer;
      expect(a.messageKey).toBe('guide.faq.unknown');
      expect(a.contact).toEqual(full.contact); // gives a way to ask
    }
  });

  it('ordering, dine-in/takeaway and languages are answered from the app itself', () => {
    expect(answerText('how do I order', ctx()).answer.messageKey).toBe('guide.faq.ordering');
    expect(answerText('what is takeaway', ctx()).answer.messageKey).toBe('guide.faq.dineinTakeaway');
    expect(answerText('which languages', ctx()).answer).toMatchObject({ messageKey: 'guide.faq.languages', params: { count: 50 } });
  });

  it('the shipped business file contains no invented facts', () => {
    expect(BUSINESS).toEqual(none);
  });
});

describe('AI answers are validated before a customer sees them', () => {
  const good = { answer: 'Black Sesame Paste is a classic, and Peanut Paste is a nutty alternative.', itemIds: ['black-sesame-paste', 'peanut-paste'], needsStaff: false };
  const run = async (reply: unknown, text = 'Which one is stronger in flavour?') => {
    const llm = fakeLlm(reply);
    const h = makeDeps({ llm });
    return { out: await aiGuideAnswer(h.deps, text, ctx(), 'en'), llm, deps: h.deps };
  };

  it('accepts a clean answer; items and prices come from the menu, not the AI', async () => {
    const { out } = await run(good);
    expect(out).toMatchObject({ source: 'ai', aiText: good.answer, items: [{ itemId: 'black-sesame-paste' }, { itemId: 'peanut-paste' }], messageKey: 'guide.msg.ai' });
  });

  it('sends only the menu and the question to the provider — no personal data, no order ids', async () => {
    const { llm } = await run(good, 'Which is better? My number is 0123456789');
    const sent = JSON.stringify(llm.calls);
    expect(sent).toContain('Black Sesame Paste'); // menu is there
    expect(sent).toContain('MENU (JSON)');
    expect(sent).not.toMatch(/RDH-|customerRef|tracking|phone|password/i);
    expect(llm.calls[0]!.user.length).toBeLessThan(400); // question truncated to 300 chars + header
  });

  it.each([
    ['an invented item id', { ...good, itemIds: ['made-up-dish'] }],
    ['an invented price', { ...good, answer: 'Peanut Paste costs RM 3.20 today.' }],
    ['a best-seller claim', { ...good, answer: 'Our best seller is the Black Sesame Paste.' }],
    ['a popularity claim', { ...good, answer: 'The most popular choice is Peanut Paste.' }],
    ['an allergen claim', { ...good, answer: 'Peanut Paste is gluten free.' }],
    ['a halal claim', { ...good, answer: 'Everything is halal.' }],
    ['a promotion', { ...good, answer: 'Get 10% off today with this voucher.' }],
    ['a waiting time', { ...good, answer: 'It is ready in 5 minutes.' }],
    ['opening hours', { ...good, answer: 'We are open until 10pm.' }],
    ['a reservation claim', { ...good, answer: 'You can reserve a table for tonight.' }],
    ['the wrong shape', { text: 'hello' }],
  ])('rejects %s and falls back to rules', async (_n, reply) => {
    const { out, deps } = await run(reply);
    expect(out).toBeNull();
    expect(listRuns(deps)[0]).toMatchObject({ automation: 'guide_answer_ai', outcome: 'failed' });
  });

  it('rejects an item that exists but is currently unavailable', async () => {
    const llm = fakeLlm({ ...good, itemIds: ['walnut-paste'] });
    const h = makeDeps({ llm });
    const menu = MENU.map((m) => (m.id === 'walnut-paste' ? { ...m, available: false } : m));
    expect(await aiGuideAnswer(h.deps, 'something nutty?', ctx({ menu }), 'en')).toBeNull();
  });

  it('allows a price only when it is a real menu price (or a sum of the items mentioned)', () => {
    const picked = MENU.filter((m) => ['black-sesame-paste', 'chinese-tea'].includes(m.id));
    expect(validateAiAnswer('Black Sesame Paste is RM 7.50.', picked, MENU).ok).toBe(true);
    expect(validateAiAnswer('Together they are RM 10.00.', picked, MENU).ok).toBe(true); // 7.50 + 2.50
    expect(validateAiAnswer('That is RM 9.99.', picked, MENU).ok).toBe(false);
  });

  it('a provider failure or refusal yields null, so the rules answer is used; the failure is logged without details', async () => {
    const llm = fakeLlm(good);
    llm.failWith = 'The AI service is busy. Try again shortly.';
    const h = makeDeps({ llm });
    expect(await aiGuideAnswer(h.deps, 'anything', ctx(), 'en')).toBeNull();
    expect(listRuns(h.deps)[0]).toMatchObject({ outcome: 'failed', error: 'The AI service is busy. Try again shortly.' });
  });

  it('without a provider configured, AI is simply skipped', async () => {
    const h = makeDeps();
    expect(await aiGuideAnswer(h.deps, 'anything', ctx(), 'en')).toBeNull();
    expect(listRuns(h.deps)).toEqual([]);
  });

  it('needsStaff adds the staff-referral note', async () => {
    const { out } = await run({ answer: 'I am not sure about that.', itemIds: [], needsStaff: true });
    expect(out?.notes).toContain('guide.note.askStaff');
  });
});
