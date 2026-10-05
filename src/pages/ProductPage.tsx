import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { getQuantity } from '../services/cart';
import { getUnitPrice } from '../services/pricing';
import { DishImage } from '../components/DishImage';
import { ItemTag } from '../components/ItemTag';
import { OrderTypeToggle } from '../components/OrderTypeToggle';
import { Price } from '../components/Price';
import { PriceRows } from '../components/PriceRows';
import { SecondaryName } from '../components/SecondaryName';
import { QuantityStepper } from '../components/QuantityStepper';
import { Icon } from '../components/Icon';

export function ProductPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { menuById, orderType, cart, cartActions, announce } = useApp();
  const { nameOf, descriptionOf, categoryOf } = useMenuText();
  const item = menuById.get(id);

  if (!item) {
    return (
      <div className="container page">
        <div className="empty">
          <h1 className="empty__title">{t('product.notFound')}</h1>
          <p className="muted">{t('product.notFoundHint')}</p>
          <Link to="/menu" className="btn btn--primary">
            {t('product.backToMenu')}
          </Link>
        </div>
      </div>
    );
  }

  const name = nameOf(item);
  const quantity = getQuantity(cart, item.id);

  return (
    <div className="container page product">
      <Link to="/menu" className="back-link">
        <Icon name="chevron" size={18} directional className="icon-flip" />
        {t('product.backToMenu')}
      </Link>
      <div className="product__grid">
        <DishImage src={item.image} alt={`${name} — ${item.chineseName}`} eager className="product__img" />
        <div className="product__info">
          <div className="card__meta">
            <span className="card__code">{item.productCode}</span>
            <ItemTag item={item} />
          </div>
          <h1 className="product__title">{name}</h1>
          <SecondaryName item={item} className="product__zh" />
          <p className="muted">{categoryOf(item.category)}</p>
          <p className="product__desc" dir="auto">{descriptionOf(item)}</p>

          <OrderTypeToggle />
          <PriceRows item={item} className="price-table" />

          {!item.available ? (
            <p className="notice">{t('common.unavailable')}</p>
          ) : quantity > 0 ? (
            <div className="product__cta">
              <QuantityStepper
                quantity={quantity}
                name={name}
                onIncrement={() => cartActions.increment(item.id)}
                onDecrement={() => cartActions.decrement(item.id)}
              />
              <Link to="/cart" className="btn btn--primary">
                {t('common.viewCart')}
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => {
                cartActions.add(item.id);
                announce(`${t('common.added')}: ${name}`);
              }}
            >
              {t('product.addToCart')} · <Price value={getUnitPrice(item, orderType)} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
