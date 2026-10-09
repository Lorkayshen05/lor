import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { BudgetPlanner } from '../components/BudgetPlanner';
import { RubyGuide } from '../components/RubyGuide';
import { Wizard } from '../components/Wizard';
import { FirstTimeSection } from '../components/home/FirstTimeSection';
import { WelcomeBackSection } from '../components/home/WelcomeBackSection';
import { Icon } from '../components/Icon';
import { OrderTypeToggle } from '../components/OrderTypeToggle';

type Mode = 'guide' | 'wizard' | 'plan';
const TITLE_KEY: Record<Mode, string> = { guide: 'guide.title', wizard: 'wizard.title', plan: 'planner.title' };

export function DiscoverPage() {
  const { t } = useTranslation();
  const { orders } = useApp();
  const [params, setParams] = useSearchParams();
  const raw = params.get('mode');
  const mode: Mode = raw === 'plan' || raw === 'wizard' ? raw : 'guide';

  const setMode = (m: Mode) => setParams(m === 'guide' ? {} : { mode: m }, { replace: true });

  return (
    <>
      <div className="container page page--tight">
        <h1 className="page__title">{t('discover.title')}</h1>
        <p className="muted">{t('discover.subtitle')}</p>
        <OrderTypeToggle />
      </div>

      {orders.length > 0 ? <WelcomeBackSection /> : <FirstTimeSection />}

      <div className="container page page--tight">
        <div className="tabs" role="group" aria-label={t('discover.title')}>
          {(['guide', 'wizard', 'plan'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              className={`tabs__btn ${mode === m ? 'is-selected' : ''}`}
              onClick={() => setMode(m)}
            >
              {mode === m && <Icon name="check" size={14} />}
              {t(TITLE_KEY[m])}
            </button>
          ))}
        </div>
        <section aria-label={t(TITLE_KEY[mode])}>
          {mode === 'guide' ? <RubyGuide /> : mode === 'wizard' ? <Wizard /> : <BudgetPlanner />}
        </section>
      </div>
    </>
  );
}
