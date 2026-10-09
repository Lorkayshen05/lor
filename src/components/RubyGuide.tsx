import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BUSINESS } from '../data/business';
import { LANGUAGES } from '../i18n/languages';
import { answerIntent, detectIntent } from '../services/guide/engine';
import type { GuideAnswer, GuideContext, GuideIntent, GuideItem } from '../services/guide/types';
import { getUnitPrice } from '../services/pricing';
import { getQuantity } from '../services/cart';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { useReasonText } from '../hooks/useReasonText';
import { AddAllButton } from './AddAllButton';
import { DishImage } from './DishImage';
import { Icon } from './Icon';
import { Price } from './Price';
import { SecondaryName } from './SecondaryName';

interface Chip {
  id: string;
  intent: GuideIntent;
}

const PRIMARY_CHIPS: Chip[] = [
  { id: 'first', intent: { type: 'first_visit' } },
  { id: 'second', intent: { type: 'second_visit' } },
  { id: 'next', intent: { type: 'try_next' } },
  { id: 'rm10', intent: { type: 'budget', amount: 1000 } },
  { id: 'rm20', intent: { type: 'budget', amount: 2000 } },
  { id: 'rm30', intent: { type: 'budget', amount: 3000 } },
];
const MORE_CHIPS: Chip[] = [
  { id: 'sesame', intent: { type: 'ingredient', ingredient: 'sesame' } },
  { id: 'peanut', intent: { type: 'ingredient', ingredient: 'peanut' } },
  { id: 'almond', intent: { type: 'ingredient', ingredient: 'almond' } },
  { id: 'walnut', intent: { type: 'ingredient', ingredient: 'walnut' } },
  { id: 'drinks', intent: { type: 'drinks' } },
  { id: 'compare', intent: { type: 'compare' } },
  { id: 'allergy', intent: { type: 'allergy' } },
];

interface Turn {
  id: number;
  question: string;
  answer?: GuideAnswer;
}

const MAX_TURNS = 4;

function ContactLinks({ contact }: { contact: NonNullable<GuideAnswer['contact']> }) {
  const { t } = useTranslation();
  const links = [
    contact.phone && { href: `tel:${contact.phone.replace(/[^\d+]/g, '')}`, label: t('guide.contact.phone'), text: contact.phone },
    contact.whatsapp && { href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`, label: t('guide.contact.whatsapp'), text: contact.whatsapp },
    contact.email && { href: `mailto:${contact.email}`, label: t('guide.contact.email'), text: contact.email },
  ].filter((l): l is { href: string; label: string; text: string } => !!l);
  if (links.length === 0) return null;
  return (
    <div className="guide__contact">
      <p className="guide__contact-title">{t('guide.contact.heading')}</p>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="link-arrow" dir="ltr">
              {l.label}: {l.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideItemRow({ item }: { item: GuideItem }) {
  const { t } = useTranslation();
  const { menuById, orderType, cart, cartActions, announce } = useApp();
  const { nameOf } = useMenuText();
  const reasonText = useReasonText();
  const m = menuById.get(item.itemId);
  if (!m) return null;
  const qty = item.quantity ?? 1;
  const inCart = getQuantity(cart, m.id);
  const name = nameOf(m);
  return (
    <li className="guide-item">
      <DishImage src={m.image} alt="" className="guide-item__img" />
      <div className="guide-item__body">
        <p className="guide-item__name">
          {qty > 1 && <span dir="ltr">{qty} × </span>}
          {name}
        </p>
        <SecondaryName item={m} className="guide-item__zh" />
        {item.reason && <p className="guide-item__reason">{reasonText(item.reason)}</p>}
        {item.allergen && (
          <p className={`guide-item__allergen ${item.allergen.status === 'unknown' ? 'is-unknown' : ''}`}>
            {item.allergen.status === 'unknown'
              ? t('guide.allergen.unknown')
              : t('guide.allergen.verified', { list: item.allergen.contains.join(', ') || '—', date: item.allergen.verifiedAt, by: item.allergen.verifiedBy })}
          </p>
        )}
      </div>
      <div className="guide-item__side">
        <Price value={getUnitPrice(m, orderType) * qty} />
        <button
          type="button"
          className={`btn btn--sm ${inCart >= qty ? 'btn--ghost' : 'btn--primary'}`}
          aria-label={`${t('common.add')}: ${name}`}
          onClick={() => {
            cartActions.add(m.id, qty);
            announce(`${t('common.added')}: ${name}`);
          }}
        >
          {inCart >= qty && <Icon name="check" size={16} />}
          {inCart >= qty ? t('common.added') : t('common.add')}
        </button>
      </div>
    </li>
  );
}

function AnswerView({ answer }: { answer: GuideAnswer }) {
  const { t } = useTranslation();
  const { menuById, orderType } = useApp();
  const params: Record<string, string | number> = { ...answer.params };
  if (typeof params.ingredientKey === 'string') params.ingredient = t(`guide.ingredient.${params.ingredientKey}`);
  if (answer.value) params.value = answer.value;

  const addable = (answer.intent === 'first_visit' || answer.intent === 'budget') && answer.items.length > 0;
  const total = answer.items.reduce((sum, i) => {
    const m = menuById.get(i.itemId);
    return sum + (m ? getUnitPrice(m, orderType) * (i.quantity ?? 1) : 0);
  }, 0);
  const showContact = !!answer.contact && (answer.messageKey === 'guide.faq.contact' || answer.messageKey === 'guide.faq.unknown' || answer.notes.includes('guide.note.askStaff'));

  return (
    <div className="guide__answer">
      {answer.aiText ? (
        <>
          <p>{answer.aiText}</p>
          <p className="guide__ai">{t('guide.ai')}</p>
        </>
      ) : (
        <p>{t(answer.messageKey, params)}</p>
      )}
      {typeof params.mapUrl === 'string' && /^https?:\/\//i.test(params.mapUrl) && (
        <a href={params.mapUrl} target="_blank" rel="noreferrer" className="link-arrow">
          {t('location.directions')}
        </a>
      )}
      {answer.items.length > 0 && (
        <ul className="guide__items">
          {answer.items.map((i) => (
            <GuideItemRow key={i.itemId} item={i} />
          ))}
        </ul>
      )}
      {addable && (
        <div className="guide__add">
          {answer.plan && (
            <dl className="totals">
              <div className="totals__grand">
                <dt>{t('planner.total')}</dt>
                <dd>
                  <Price value={total} />
                </dd>
              </div>
              <div>
                <dt>{t('planner.remaining')}</dt>
                <dd>
                  <Price value={answer.plan.remaining} />
                </dd>
              </div>
            </dl>
          )}
          {!answer.plan && (
            <div className="totals__grand totals__row">
              <span>{t('common.total')}</span>
              <Price value={total} />
            </div>
          )}
          <AddAllButton items={answer.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity ?? 1 }))} label={t('wizard.addAll')} />
        </div>
      )}
      {answer.notes.length > 0 && (
        <ul className="guide__notes">
          {answer.notes.map((n) => (
            <li key={n}>{t(n)}</li>
          ))}
        </ul>
      )}
      {showContact && answer.contact && <ContactLinks contact={answer.contact} />}
    </div>
  );
}

/**
 * "Ruby Dessert Guide". Known questions are answered on the device by the same rules the server uses (fast, offline-safe,
 * deterministic). Only free text the rules can't classify goes to the server, which may consult an AI model — and
 * validates its answer against the menu before it comes back. Prices always come from the menu, never from the AI.
 */
export function RubyGuide() {
  const { t, i18n } = useTranslation();
  const { menu, orderType, seenIds, cart, api } = useApp();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const counter = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const ctx: GuideContext = {
    menu,
    orderType,
    orderedItemIds: [...seenIds],
    cartItemIds: cart.map((c) => c.itemId),
    business: BUSINESS,
    languageCount: LANGUAGES.length,
  };

  const ask = async (question: string, intent?: GuideIntent) => {
    const id = ++counter.current;
    setTurns((prev) => [...prev, { id, question }].slice(-MAX_TURNS));
    const resolved = intent ?? detectIntent(question, menu);
    let answer: GuideAnswer;
    if (resolved.type !== 'unknown' || !api || !question.trim()) {
      answer = answerIntent(resolved, ctx);
    } else {
      setBusy(true);
      try {
        answer = await api.guide({ message: question, language: i18n.language, context: { orderType, orderedItemIds: ctx.orderedItemIds, cartItemIds: ctx.cartItemIds } });
      } catch {
        answer = answerIntent(resolved, ctx); // offline or server error: the rules answer ("I'm not sure… ask staff") is still honest
      } finally {
        setBusy(false);
      }
    }
    setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, answer } : x)));
    setTimeout(() => endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 50);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setText('');
    void ask(q);
  };

  const chips = showMore ? [...PRIMARY_CHIPS, ...MORE_CHIPS] : PRIMARY_CHIPS;

  return (
    <div className="tool guide">
      <h2 id="guide-title" className="tool__title">
        {t('guide.title')}
      </h2>
      <p className="muted">{t('guide.subtitle')}</p>

      <div className="guide__turns" aria-live="polite" aria-relevant="additions">
        {turns.map((turn) => (
          <div key={turn.id} className="guide__turn">
            <p className="guide__q">
              <span className="sr-only">{t('guide.you')}: </span>
              {turn.question}
            </p>
            {turn.answer ? <AnswerView answer={turn.answer} /> : <p className="muted">{t('guide.thinking')}</p>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <section aria-label={t('guide.suggested')}>
        <p className="tool__step">{t('guide.suggested')}</p>
        <ul className="guide__chips">
          {chips.map((c) => (
            <li key={c.id}>
              <button type="button" className="guide__chip" disabled={busy} onClick={() => void ask(t(`guide.chip.${c.id}`), c.intent)}>
                {t(`guide.chip.${c.id}`)}
              </button>
            </li>
          ))}
        </ul>
        {!showMore && (
          <button type="button" className="btn btn--link" onClick={() => setShowMore(true)}>
            {t('common.seeAll')}
          </button>
        )}
      </section>

      <form className="guide__form" onSubmit={submit}>
        <label htmlFor="guide-input" className="sr-only">
          {t('guide.placeholder')}
        </label>
        <input id="guide-input" type="text" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={t('guide.placeholder')} autoComplete="off" enterKeyHint="send" />
        <button type="submit" className="btn btn--primary" disabled={busy || !text.trim()}>
          {t('guide.ask')}
        </button>
      </form>
      <p className="muted small">{t('guide.disclaimer')}</p>
    </div>
  );
}
