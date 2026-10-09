import { useTranslation } from 'react-i18next';
import type { Order } from '../types';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { formatDate } from '../utils/format';
import { Price } from './Price';

/** Read-only order snapshot: items use the prices frozen at order time. */
export function OrderSummary({ order }: { order: Order }) {
  const { t, i18n } = useTranslation();
  const { menuById } = useApp();
  const { nameOf } = useMenuText();

  return (
    <div className="order-summary">
      <dl className="facts">
        <div>
          <dt>{t('confirmation.orderNumber')}</dt>
          <dd className="facts__big" dir="ltr">
            {order.orderId}
          </dd>
        </div>
        <div>
          <dt>{t('confirmation.type')}</dt>
          <dd>{t(order.orderType === 'dine-in' ? 'orderType.dineIn' : 'orderType.takeAway')}</dd>
        </div>
        {order.orderType === 'dine-in' && order.tableNumber && (
          <div>
            <dt>{t('confirmation.table')}</dt>
            <dd dir="ltr">{order.tableNumber}</dd>
          </div>
        )}
        {order.orderType === 'takeaway' && order.pickupInMinutes !== undefined && (
          <div>
            <dt>{t('confirmation.pickup')}</dt>
            <dd>
              {order.pickupInMinutes === 0
                ? t('checkout.pickupAsap')
                : t('checkout.pickupIn', { minutes: order.pickupInMinutes })}
            </dd>
          </div>
        )}
        <div>
          <dt>{t('confirmation.status')}</dt>
          <dd>
            <span className="status" role="status" aria-live="polite">
              {t(`status.${order.status}`)}
            </span>
          </dd>
        </div>
        <div>
          <dt>{formatDate(order.timestamp, i18n.language)}</dt>
          <dd />
        </div>
      </dl>
      <h3 className="menu-group__title">{t('confirmation.items')}</h3>
      <ul className="summary-lines">
        {order.items.map((i) => {
          const current = menuById.get(i.itemId);
          return (
            <li key={i.itemId}>
              <span>
                {current ? nameOf(current) : i.name} × {i.quantity}
              </span>
              <Price value={i.unitPrice * i.quantity} />
            </li>
          );
        })}
      </ul>
      <div className="totals__grand totals__row">
        <span>{t('common.total')}</span>
        <Price value={order.total} />
      </div>
    </div>
  );
}
