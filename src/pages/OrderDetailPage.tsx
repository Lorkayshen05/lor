import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { OrderActions } from '../components/OrderActions';
import { OrderSummary } from '../components/OrderSummary';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { orders } = useApp();
  const order = orders.find((o) => o.orderId === id);

  if (!order) {
    return (
      <div className="container page">
        <div className="empty">
          <p className="empty__title">{t('confirmation.notFound')}</p>
          <Link to="/orders" className="btn btn--primary">
            {t('orders.title')}
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="container page">
      <Link to="/orders" className="back-link">
        {t('orders.title')}
      </Link>
      <h1 className="page__title">{t('orders.detailTitle', { id: order.orderId })}</h1>
      <OrderSummary order={order} />
      <OrderActions order={order} />
    </div>
  );
}
