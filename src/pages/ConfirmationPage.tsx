import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { Icon } from '../components/Icon';
import { OrderSummary } from '../components/OrderSummary';
import { useOrderStatusSync } from '../hooks/useOrderStatusSync';

export function ConfirmationPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { orders } = useApp();
  const order = orders.find((o) => o.orderId === id);
  useOrderStatusSync(order);

  if (!order) {
    return (
      <div className="container page">
        <div className="empty">
          <p className="empty__title">{t('confirmation.notFound')}</p>
          <Link to="/menu" className="btn btn--primary">
            {t('confirmation.backToMenu')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page confirmation">
      <div className="confirmation__head">
        <span className="confirmation__tick" aria-hidden="true">
          <Icon name="check" size={28} />
        </span>
        <h1 className="page__title">{t('confirmation.title')}</h1>
        <p className="muted">{t('confirmation.subtitle')}</p>
      </div>
      <OrderSummary order={order} />
      <div className="stack">
        <Link to="/menu" className="btn btn--primary btn--block">
          {t('confirmation.backToMenu')}
        </Link>
        <Link to={`/orders/${encodeURIComponent(order.orderId)}`} className="btn btn--ghost btn--block">
          {t('confirmation.viewOrder')}
        </Link>
      </div>
    </div>
  );
}
