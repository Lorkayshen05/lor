import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../data/restaurant';
import { MENU_IS_SAMPLE } from '../data/menu';
import { useApp } from '../state/AppContext';
import { Icon, type IconName } from './Icon';
import { LanguageSelector } from './LanguageSelector';
import { Price } from './Price';

const NAV: { to: string; key: string; icon: IconName; end?: boolean }[] = [
  { to: '/', key: 'nav.home', icon: 'home', end: true },
  { to: '/menu', key: 'nav.menu', icon: 'menu' },
  { to: '/discover', key: 'nav.discover', icon: 'discover' },
  { to: '/cart', key: 'nav.cart', icon: 'cart' },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

function CartBar() {
  const { t } = useTranslation();
  const { itemCount, totals } = useApp();
  const { pathname } = useLocation();
  const hidden = ['/cart', '/checkout'].includes(pathname) || pathname.startsWith('/confirmation');
  if (itemCount === 0 || hidden) return null;
  return (
    <Link to="/cart" className="cartbar">
      <span className="cartbar__count">{itemCount}</span>
      <span className="cartbar__label">{t('common.viewCart')}</span>
      <Price value={totals.total} />
      <Icon name="chevron" size={18} directional />
    </Link>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const { itemCount, announcement, orders } = useApp();

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {t('app.skipLink')}
      </a>
      <header className="site-header">
        <div className="site-header__bar container">
          <Link to="/" className="wordmark" aria-label={`${BRAND.line2} ${BRAND.chinese}`}>
            <span className="wordmark__en">Ruby Dessert House</span>
            <span className="wordmark__zh" lang="zh">{BRAND.chinese}</span>
          </Link>
          <div className="site-header__tools">
            {orders.length > 0 && (
              <Link to="/orders" className="icon-btn" aria-label={t('nav.orders')}>
                <Icon name="orders" />
              </Link>
            )}
            <LanguageSelector />
          </div>
        </div>
        <nav className="mainnav" aria-label={t('nav.label')}>
          <ul className="mainnav__list">
            {NAV.map(({ to, key, icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `mainnav__link ${isActive ? 'is-active' : ''}`}
                  aria-label={to === '/cart' && itemCount > 0 ? `${t(key)}: ${itemCount}` : undefined}
                >
                  <span className="mainnav__icon">
                    <Icon name={icon} />
                    {to === '/cart' && itemCount > 0 && <span className="badge-count" aria-hidden="true">{itemCount}</span>}
                  </span>
                  <span className="mainnav__text">{t(key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {MENU_IS_SAMPLE && (
        <p className="sample-banner" role="note">
          {t('app.sampleBanner')}
        </p>
      )}

      <main id="main" tabIndex={-1} className="main">
        <ScrollToTop />
        <Outlet />
      </main>

      <CartBar />
      <div className="toast" role="status" aria-live="polite">
        {announcement && <span>{announcement}</span>}
      </div>
    </div>
  );
}
