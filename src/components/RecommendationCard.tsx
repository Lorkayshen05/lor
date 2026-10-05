import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Recommendation } from '../types';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { useReasonText } from '../hooks/useReasonText';
import { getQuantity } from '../services/cart';
import { SecondaryName } from './SecondaryName';
import { getUnitPrice } from '../services/pricing';
import { DishImage } from './DishImage';
import { Icon } from './Icon';
import { Price } from './Price';

/** Compact row used wherever we explain *why* a real menu item is suggested. */
export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const { t } = useTranslation();
  const { orderType, cart, cartActions, announce } = useApp();
  const { nameOf } = useMenuText();
  const reasonText = useReasonText();
  const { item } = rec;
  const quantity = getQuantity(cart, item.id);
  const inCart = quantity > 0;
  const name = nameOf(item);

  return (
    <li className="rec">
      <Link to={`/menu/${item.id}`} className="rec__media" tabIndex={-1} aria-hidden="true">
        <DishImage src={item.image} alt="" />
      </Link>
      <div className="rec__body">
        <h3 className="rec__title">
          <Link to={`/menu/${item.id}`}>{name}</Link>
        </h3>
        <SecondaryName item={item} className="rec__zh" />
        <p className="rec__reason">{reasonText(rec.reason)}</p>
      </div>
      <div className="rec__side">
        <Price value={getUnitPrice(item, orderType)} className="rec__price" />
        <button
          type="button"
          className={`btn btn--sm ${inCart ? 'btn--ghost' : 'btn--primary'}`}
          onClick={() => {
            cartActions.add(item.id);
            announce(`${t('common.added')}: ${name}`);
          }}
          aria-label={`${t('common.add')}: ${name}${inCart ? ` (${quantity})` : ''}`}
        >
          {inCart && <Icon name="check" size={16} />}
          {inCart ? `${t('common.added')} · ${quantity}` : t('common.add')}
        </button>
      </div>
    </li>
  );
}
