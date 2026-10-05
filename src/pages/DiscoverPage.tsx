import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { BudgetPlanner } from '../components/BudgetPlanner';
import { Wizard } from '../components/Wizard';
import { FirstTimeSection } from '../components/home/FirstTimeSection';
import { WelcomeBackSection } from '../components/home/WelcomeBackSection';
import { OrderTypeToggle } from '../components/OrderTypeToggle';

type Mode = 'wizard' | 'plan';

export function DiscoverPage() {
  const { t } = useTranslation();
  const { orders } = useApp();
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'plan' ? 'plan' : 'wizard';

  const setMode = (m: Mode) => setParams(m === 'plan' ? { mode: 'plan' } : {}, { replace: true });

  return (
    <>
      <div className="container page page--tight">
        <h1 className="page__title">{t('discover.title')}</h1>
        <p className="muted">{t('discover.subtitle')}</p>
        <OrderTypeToggle />
      </div>

      {orders.length > 0 ? <WelcomeBackSection /> : <FirstTimeSection />}

      <div className="container page page--tight">
        <div className="tabs" role="tablist" aria-label={t('discover.title')}>
          {(['wizard', 'plan'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              id={`tab-${m}`}
              aria-selected={mode === m}
              aria-controls={`panel-${m}`}
              className={`tabs__btn ${mode === m ? 'is-selected' : ''}`}
              onClick={() => setMode(m)}
            >
              {t(m === 'wizard' ? 'wizard.title' : 'planner.title')}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
          {mode === 'wizard' ? <Wizard /> : <BudgetPlanner />}
        </div>
      </div>
    </>
  );
}
