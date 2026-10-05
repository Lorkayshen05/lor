import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Order } from '../types';
import { useApp } from '../state/AppContext';

/** ORDER AGAIN (one-tap reorder) + TRY SOMETHING NEW (menu filtered to things not yet ordered). */
export function OrderActions({ order }: { order: Order }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reorder, announce } = useApp();
  return (
    <div className="panel__actions">
      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={() => {
          const { skippedNames } = reorder(order);
          announce(
            skippedNames.length
              ? t('welcomeBack.skipped', { names: skippedNames.join(', ') })
              : t('welcomeBack.reordered'),
          );
          navigate('/cart');
        }}
      >
        {t('orders.orderAgain')}
      </button>
      <Link to="/menu?filter=try-new" className="btn btn--ghost btn--block">
        {t('orders.tryNew')}
      </Link>
    </div>
  );
}
