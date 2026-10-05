import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { planOrder } from '../services/budgetPlanner';
import { getUnitPrice } from '../services/pricing';
import { rm } from '../utils/money';
import { DishImage } from './DishImage';
import { Icon } from './Icon';
import { Price } from './Price';

const PEOPLE = [1, 2, 3, 4];
const BUDGETS = [10, 20, 30, 50, 80];

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`option ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {selected && <Icon name="check" size={16} />}
      <span>{children}</span>
    </button>
  );
}

/** "BUILD MY ORDER" — the plan can never exceed the chosen budget (enforced in planOrder). */
export function BudgetPlanner() {
  const { t } = useTranslation();
  const { menu, orderType, planner, setPlanner, cartActions, announce } = useApp();
  const { nameOf } = useMenuText();
  const { people, budget } = planner;

  const plan = useMemo(
    () => (people && budget !== undefined ? planOrder({ menu, people, budget, orderType }) : null),
    [menu, people, budget, orderType],
  );

  return (
    <div className="tool" aria-labelledby="planner-title">
      <h2 id="planner-title" className="tool__title">
        {t('planner.title')}
      </h2>
      <p className="muted">{t('planner.subtitle')}</p>

      <fieldset className="tool__fieldset">
        <legend>{t('planner.people')}</legend>
        <div className="option-grid option-grid--4">
          {PEOPLE.map((n) => (
            <Option key={n} selected={people === n} onClick={() => setPlanner({ ...planner, people: n })}>
              {t(n === 4 ? 'planner.peopleOpen' : 'planner.peopleOption', { count: n })}
            </Option>
          ))}
        </div>
      </fieldset>

      <fieldset className="tool__fieldset">
        <legend>{t('planner.budget')}</legend>
        <div className="option-grid option-grid--5">
          {BUDGETS.map((b) => (
            <Option key={b} selected={budget === rm(b)} onClick={() => setPlanner({ ...planner, budget: rm(b) })}>
              <bdi dir="ltr">{t(b === 80 ? 'wizard.budgetOpen' : 'wizard.budgetValue', { amount: b })}</bdi>
            </Option>
          ))}
        </div>
      </fieldset>

      {plan && (
        <section aria-live="polite" className="plan">
          <h3 className="menu-group__title">{t('planner.recommended')}</h3>
          {plan.tooLow ? (
            <p className="notice">{t('planner.tooLow')}</p>
          ) : (
            <>
              {!plan.coversEveryone && (
                <p className="notice notice--warn">
                  {t('planner.notEveryone', {
                    count: plan.lines.filter((l) => l.item.category === 'paste' || l.item.category === 'mixed').reduce((n, l) => n + l.quantity, 0),
                    people: plan.people,
                  })}
                </p>
              )}
              <ul className="summary-lines summary-lines--rich">
                {plan.lines.map(({ item, quantity }) => (
                  <li key={item.id}>
                    <DishImage src={item.image} alt="" className="summary-lines__img" />
                    <span>
                      {nameOf(item)} × {quantity}
                    </span>
                    <Price value={getUnitPrice(item, orderType) * quantity} />
                  </li>
                ))}
              </ul>
              <dl className="totals">
                <div className="totals__grand">
                  <dt>{t('planner.total')}</dt>
                  <dd>
                    <Price value={plan.total} />
                  </dd>
                </div>
                <div>
                  <dt>{t('planner.remaining')}</dt>
                  <dd>
                    <Price value={plan.remaining} />
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => {
                  cartActions.addMany(plan.lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })));
                  announce(t('common.added'));
                }}
              >
                {t('planner.addAll')}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
