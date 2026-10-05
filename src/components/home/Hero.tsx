import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../../data/restaurant';
import { OrderTypeToggle } from '../OrderTypeToggle';
import { Icon } from '../Icon';

export function Hero() {
  const { t } = useTranslation();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <p className="hero__eyebrow">{BRAND.line1}</p>
        <h1 id="hero-title" className="hero__title">
          {BRAND.line2}
        </h1>
        <p className="hero__zh" lang="zh">
          {BRAND.chinese}
        </p>
        <p className="hero__since">
          <span aria-hidden="true" className="hero__rule" />
          <span>{t('hero.eyebrow')}</span>
          <span aria-hidden="true" className="hero__rule" />
        </p>
        <p className="hero__sub">{t('hero.subtitle')}</p>
        <div className="hero__actions">
          <Link to="/menu" className="btn btn--gold btn--lg">
            {t('hero.orderNow')}
            <Icon name="chevron" size={18} directional />
          </Link>
          <OrderTypeToggle variant="dark" />
        </div>
      </div>
    </section>
  );
}
