import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlavourTag, Money, VisitType } from '../types';
import { useApp, type WizardState } from '../state/AppContext';
import { useRecommendations } from '../hooks/useRecommendations';
import { rm } from '../utils/money';
import { formatMoney } from '../utils/money';
import { AddAllButton } from './AddAllButton';
import { Icon } from './Icon';
import { Price } from './Price';
import { RecommendationCard } from './RecommendationCard';
import { getUnitPrice } from '../services/pricing';

const VISITS: VisitType[] = ['first', 'second', 'returning'];
const CRAVINGS: FlavourTag[] = ['sesame', 'nutty', 'creamy', 'light', 'refreshing', 'mixed', 'traditional'];
const BUDGETS: { amount: number; open?: boolean }[] = [{ amount: 10 }, { amount: 20 }, { amount: 30 }, { amount: 50, open: true }];

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`option ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {selected && <Icon name="check" size={16} />}
      <span>{children}</span>
    </button>
  );
}

/** "WHAT SHOULD I EAT?" — three questions → rule-based picks from the real menu. Progress survives language changes. */
export function Wizard() {
  const { t } = useTranslation();
  const { wizard, setWizard, visitType, orders, orderType } = useApp();
  const { step } = wizard;

  // Defend against stale/corrupt saved progress.
  useEffect(() => {
    if (step === 3 && (!wizard.craving || wizard.budget === undefined || !wizard.visit)) setWizard({ step: 0 });
  }, [step, wizard, setWizard]);

  const update = (patch: Partial<WizardState>) => setWizard({ ...wizard, ...patch });
  const visit = wizard.visit ?? (orders.length > 0 ? visitType : undefined);

  const recs = useRecommendations({
    visitType: wizard.visit ?? visitType,
    preference: wizard.craving ? [wizard.craving] : [],
    budget: wizard.budget,
    limit: 4,
  });
  const resultTotal = recs.reduce((sum, r) => sum + getUnitPrice(r.item, orderType), 0);

  const progress = Math.min(step + 1, 3);

  return (
    <div className="tool" aria-labelledby="wizard-title">
      <h2 id="wizard-title" className="tool__title">
        {t('wizard.title')}
      </h2>
      <p className="muted">{t('wizard.subtitle')}</p>

      {step < 3 && (
        <>
          <p className="tool__step">{t('wizard.step', { current: progress, total: 3 })}</p>
          <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={progress}>
            <span style={{ width: `${(progress / 3) * 100}%` }} />
          </div>
        </>
      )}

      {step === 0 && (
        <fieldset className="tool__fieldset">
          <legend>{t('wizard.visitQuestion')}</legend>
          <div className="option-grid option-grid--3">
            {VISITS.map((v) => (
              <Option key={v} selected={visit === v} onClick={() => update({ visit: v, step: 1 })}>
                {t(`wizard.visit.${v}`)}
              </Option>
            ))}
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="tool__fieldset">
          <legend>{t('wizard.cravingQuestion')}</legend>
          <div className="option-grid">
            {CRAVINGS.map((c) => (
              <Option key={c} selected={wizard.craving === c} onClick={() => update({ craving: c, step: 2 })}>
                {t(`flavour.${c}`)}
              </Option>
            ))}
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="tool__fieldset">
          <legend>{t('wizard.budgetQuestion')}</legend>
          <div className="option-grid">
            {BUDGETS.map(({ amount, open }) => {
              const value: Money = rm(amount);
              return (
                <Option key={amount} selected={wizard.budget === value} onClick={() => update({ budget: value, step: 3 })}>
                  <bdi dir="ltr">{t(open ? 'wizard.budgetOpen' : 'wizard.budgetValue', { amount })}</bdi>
                </Option>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === 3 && wizard.budget !== undefined && (
        <section aria-live="polite">
          <h3 className="menu-group__title">{t('wizard.resultsTitle')}</h3>
          {recs.length === 0 ? (
            <p className="notice">{t('wizard.none')}</p>
          ) : (
            <>
              <p className="muted">{t('wizard.resultsHint', { budget: formatMoney(wizard.budget) })}</p>
              <ul className="rec-list">
                {recs.map((r) => (
                  <RecommendationCard key={r.item.id} rec={r} />
                ))}
              </ul>
              <div className="totals__grand totals__row">
                <span>{t('common.total')}</span>
                <Price value={resultTotal} />
              </div>
              <AddAllButton items={recs.map((r) => ({ itemId: r.item.id, quantity: 1 }))} label={t('wizard.addAll')} />
            </>
          )}
        </section>
      )}

      <div className="tool__nav">
        {step > 0 && (
          <button type="button" className="btn btn--link" onClick={() => update({ step: (step - 1) as WizardState['step'] })}>
            {t('common.back')}
          </button>
        )}
        {step === 3 && (
          <button type="button" className="btn btn--ghost" onClick={() => setWizard({ step: 0 })}>
            {t('wizard.startOver')}
          </button>
        )}
      </div>
    </div>
  );
}
