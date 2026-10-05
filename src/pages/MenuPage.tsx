import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DiscoveryFilter, MenuCategory } from '../types';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { searchMenu } from '../services/search';
import { DISCOVERY_FILTERS, filterMenu } from '../services/discovery';
import { ProductCard } from '../components/ProductCard';
import { OrderTypeToggle } from '../components/OrderTypeToggle';
import { Icon } from '../components/Icon';

const FILTER_KEY: Record<DiscoveryFilter, string> = {
  signature: 'filters.signature',
  'first-time': 'filters.firstTime',
  mixed: 'filters.mixed',
  'rich-nutty': 'filters.richNutty',
  'warm-silky': 'filters.warmSilky',
  'light-refreshing': 'filters.lightRefreshing',
  drinks: 'filters.drinks',
  'try-new': 'filters.tryNew',
};

const CATEGORY_ORDER: MenuCategory[] = ['paste', 'mixed', 'custard', 'sweet-soup', 'cold', 'drink'];

export function MenuPage() {
  const { t } = useTranslation();
  const { menu, seenIds, cart } = useApp();
  const { searchFields, categoryOf } = useMenuText();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const rawFilter = params.get('filter');
  const filter = DISCOVERY_FILTERS.includes(rawFilter as DiscoveryFilter) ? (rawFilter as DiscoveryFilter) : null;

  const setFilter = (next: DiscoveryFilter | null) => {
    const p = new URLSearchParams(params);
    if (next) p.set('filter', next);
    else p.delete('filter');
    setParams(p, { replace: true });
  };

  // "Try something new" excludes real history, or — with none — whatever is in the cart this session.
  const seen = useMemo(() => {
    if (seenIds.size > 0) return seenIds;
    return new Set(cart.map((c) => c.itemId));
  }, [seenIds, cart]);

  const filtered = useMemo(() => filterMenu(menu, filter, { seenIds: seen }), [menu, filter, seen]);
  const results = useMemo(() => searchMenu(filtered, query, searchFields), [filtered, query, searchFields]);

  const isFiltering = !!filter || query.trim() !== '';
  const clearAll = () => {
    setQuery('');
    setFilter(null);
  };

  return (
    <div className="container page">
      <h1 className="page__title">{t('menu.title')}</h1>

      <div className="menu-tools">
        <OrderTypeToggle />
        <div className="searchbox">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('menu.searchPlaceholder')}
            aria-label={t('menu.searchLabel')}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => setQuery('')} aria-label={t('common.clear')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <div className="chips" role="group" aria-label={t('menu.filtersLabel')}>
          <button type="button" className={`chip ${!filter ? 'is-selected' : ''}`} aria-pressed={!filter} onClick={() => setFilter(null)}>
            {!filter && <Icon name="check" size={14} />}
            {t('menu.all')}
          </button>
          {DISCOVERY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip ${filter === f ? 'is-selected' : ''}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(filter === f ? null : f)}
            >
              {filter === f && <Icon name="check" size={14} />}
              {t(FILTER_KEY[f])}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {t('menu.resultCount', { count: results.length })}
      </p>

      {results.length === 0 ? (
        <div className="empty">
          <p className="empty__title">
            {query.trim() ? t('menu.noResults', { query: query.trim() }) : t('menu.noResultsFilter')}
          </p>
          <p className="muted">{t('menu.noResultsHint')}</p>
          {isFiltering && (
            <button type="button" className="btn btn--ghost" onClick={clearAll}>
              {t('menu.clearAll')}
            </button>
          )}
        </div>
      ) : isFiltering ? (
        <div className="card-grid">
          {results.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const items = results.filter((i) => i.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`} className="menu-group">
              <h2 id={`cat-${cat}`} className="menu-group__title">
                {categoryOf(cat)}
              </h2>
              <div className="card-grid">
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
