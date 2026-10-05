import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { useRecommendations } from '../hooks/useRecommendations';
import { DishImage } from '../components/DishImage';
import { Icon } from '../components/Icon';
import { OrderTypeToggle } from '../components/OrderTypeToggle';
import { Price } from '../components/Price';
import { QuantityStepper } from '../components/QuantityStepper';
import { RecommendationCard } from '../components/RecommendationCard';
import { SecondaryName } from '../components/SecondaryName';

export function CartPage() {
  const { t } = useTranslation();
  const { cart, totals, cartActions, menuById } = useApp();
  const { nameOf } = useMenuText();
  const suggestions = useRecommendations({ limit: 2 });

  if (cart.length === 0) {
    return (
      <div className="container page">
        <h1 className="page__title">{t('cart.title')}</h1>
        <div className="empty">
          <Icon name="cart" size={40} />
          <p className="empty__title">{t('cart.empty')}</p>
          <p className="muted">{t('cart.emptyHint')}</p>
          <Link to="/menu" className="btn btn--primary">
            {t('cart.browse')}
          </Link>
        </div>
      </div>
    );
  }

  const unavailableNames = totals.unavailable.map((u) => {
    const item = menuById.get(u.itemId);
    return item ? nameOf(item) : u.itemId;
  });

  return (
    <div className="container page cart">
      <h1 className="page__title">{t('cart.title')}</h1>
      <OrderTypeToggle />

      {totals.unavailable.length > 0 && (
        <div className="notice notice--warn" role="alert">
          <strong>{t('cart.unavailableTitle')}</strong>
          <p>{t('cart.unavailableBody', { names: unavailableNames.join(', ') })}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => totals.unavailable.forEach((u) => cartActions.remove(u.itemId))}
          >
            {t('cart.removeUnavailable')}
          </button>
        </div>
      )}

      <ul className="cart-lines">
        {totals.lines.map(({ item, quantity, unitPrice, lineTotal }) => {
          const name = nameOf(item);
          return (
            <li key={item.id} className="cart-line">
              <DishImage src={item.image} alt="" className="cart-line__img" />
              <div className="cart-line__info">
                <Link to={`/menu/${item.id}`} className="cart-line__name">
                  {name}
                </Link>
                <SecondaryName item={item} as="span" className="cart-line__zh" />
                <Price value={unitPrice} className="muted" />
              </div>
              <div className="cart-line__side">
                <Price value={lineTotal} className="cart-line__total" />
                <QuantityStepper
                  quantity={quantity}
                  name={name}
                  onIncrement={() => cartActions.increment(item.id)}
                  onDecrement={() => cartActions.decrement(item.id)}
                />
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => cartActions.remove(item.id)} aria-label={t('cart.removeItem', { name })}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="totals">
        <div>
          <dt>{t('common.subtotal')}</dt>
          <dd>
            <Price value={totals.subtotal} />
          </dd>
        </div>
        <div className="totals__grand">
          <dt>{t('common.total')}</dt>
          <dd>
            <Price value={totals.total} />
          </dd>
        </div>
      </dl>

      {suggestions.length > 0 && (
        <section aria-labelledby="cart-suggest" className="cart__suggest">
          <h2 id="cart-suggest" className="menu-group__title">
            {t('cart.suggestions')}
          </h2>
          <ul className="rec-list">
            {suggestions.map((r) => (
              <RecommendationCard key={r.item.id} rec={r} />
            ))}
          </ul>
        </section>
      )}

      <div className="cart__actions">
        {totals.lines.length === 0 || totals.unavailable.length > 0 ? (
          <button type="button" className="btn btn--primary btn--lg btn--block" disabled>
            {t('cart.checkout')}
          </button>
        ) : (
          <Link to="/checkout" className="btn btn--primary btn--lg btn--block">
            {t('cart.checkout')} · <Price value={totals.total} />
          </Link>
        )}
        <button type="button" className="btn btn--link" onClick={cartActions.clear}>
          {t('cart.clear')}
        </button>
      </div>
    </div>
  );
}
