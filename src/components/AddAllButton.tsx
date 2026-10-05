import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '../types';
import { useApp } from '../state/AppContext';
import { cartCovers } from '../services/cart';
import { Icon } from './Icon';

/**
 * "Add all to cart" that can't silently double-add: once the cart already holds everything,
 * it turns into a link to the cart instead.
 */
export function AddAllButton({ items, label }: { items: CartItem[]; label: string }) {
  const { t } = useTranslation();
  const { cart, cartActions, announce } = useApp();

  if (cartCovers(cart, items)) {
    return (
      <Link to="/cart" className="btn btn--ghost btn--block">
        <Icon name="check" size={16} />
        {t('common.added')} · {t('common.viewCart')}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="btn btn--primary btn--block"
      onClick={() => {
        cartActions.addMany(items);
        announce(t('common.added'));
      }}
    >
      {label}
    </button>
  );
}
