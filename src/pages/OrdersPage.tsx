import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { useMenuText } from '../hooks/useMenuText';
import { formatDate } from '../utils/format';
import { OrderActions } from '../components/OrderActions';
import { Price } from '../components/Price';

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { orders, menuById } = useApp();
  const { nameOf } = useMenuText();

  return (
    <div className="container page">
      <h1 className="page__title">{t('orders.title')}</h1>
      {orders.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t('orders.empty')}</p>
          <p className="muted">{t('orders.emptyHint')}</p>
          <Link to="/menu" className="btn btn--primary">
            {t('cart.browse')}
          </Link>
        </div>
      ) : (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.orderId} className="panel">
              <p className="panel__eyebrow">
                <span dir="ltr">{order.orderId}</span> · {formatDate(order.timestamp, i18n.language)}
              </p>
              <p className="panel__lines">
                {order.items
                  .map((i) => `${menuById.get(i.itemId) ? nameOf(menuById.get(i.itemId)!) : i.name} × ${i.quantity}`)
                  .join(' · ')}
              </p>
              <p className="order-list__meta">
                {t(order.orderType === 'dine-in' ? 'orderType.dineIn' : 'orderType.takeAway')} · <Price value={order.total} /> ·{' '}
                {t(`status.${order.status}`)}
              </p>
              <OrderActions order={order} />
              <Link to={`/orders/${encodeURIComponent(order.orderId)}`} className="link-arrow">
                {t('confirmation.viewOrder')}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">{t('orders.deviceNote')}</p>
    </div>
  );
}
