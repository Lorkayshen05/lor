import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '../types';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { getQuantity } from '../services/cart';
import { getUnitPrice } from '../services/pricing';
import { DishImage } from './DishImage';
import { ItemTag } from './ItemTag';
import { formatMoney } from '../utils/money';
import { Price } from './Price';
import { QuantityStepper } from './QuantityStepper';

export function ProductCard({ item }: { item: MenuItem }) {
  const { t } = useTranslation();
  const { orderType, cart, cartActions, announce } = useApp();
  const { nameOf, secondaryNameOf, descriptionOf } = useMenuText();
  const quantity = getQuantity(cart, item.id);
  const name = nameOf(item);

  return (
    <article className={`card ${item.available ? '' : 'is-unavailable'}`}>
      <Link to={`/menu/${item.id}`} className="card__media" tabIndex={-1} aria-hidden="true">
        <DishImage src={item.image} alt="" />
      </Link>
      <div className="card__body">
        <div className="card__meta">
          <span className="card__code">{item.productCode}</span>
          <ItemTag item={item} />
        </div>
        <h3 className="card__title">
          <Link to={`/menu/${item.id}`}>{name}</Link>
        </h3>
        <p className="card__zh" lang={secondaryNameOf(item) === item.chineseName ? 'zh' : undefined}>
          {secondaryNameOf(item)}
        </p>
        <p className="card__desc" dir="auto">{descriptionOf(item)}</p>
        <dl className="card__prices">
          {(['dine-in', 'takeaway'] as const).map((type) => (
            <div key={type} className={type === orderType ? 'is-active' : ''} aria-current={type === orderType || undefined}>
              <dt>{t(type === 'dine-in' ? 'common.dineInPrice' : 'common.takeawayPrice')}</dt>
              <dd>
                <Price value={type === 'dine-in' ? item.dineInPrice : item.takeawayPrice} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="card__action">
          {!item.available ? (
            <span className="card__soldout">{t('common.unavailable')}</span>
          ) : quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              name={name}
              onIncrement={() => cartActions.increment(item.id)}
              onDecrement={() => cartActions.decrement(item.id)}
            />
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                cartActions.add(item.id);
                announce(`${t('common.added')}: ${name}`);
              }}
              aria-label={`${t('common.add')}: ${name}, ${formatMoney(getUnitPrice(item, orderType))}`}
            >
              {t('common.add')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
