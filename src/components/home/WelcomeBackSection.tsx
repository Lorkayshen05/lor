import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../state/AppContext';
import { useMenuText } from '../../hooks/useMenuText';
import { latestOrder } from '../../services/visit';
import { formatDate } from '../../utils/format';
import { SectionHeading } from '../SectionHeading';

/** "WELCOME BACK" — second visit leads with TRY SOMETHING NEW, returning customers lead with ORDER AGAIN. */
export function WelcomeBackSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { orders, visitType, reorder, announce, menuById } = useApp();
  const { nameOf } = useMenuText();
  const last = latestOrder(orders);
  if (!last) return null;

  const lines = last.items.map((i) => {
    const current = menuById.get(i.itemId);
    return `${current ? nameOf(current) : i.name} × ${i.quantity}`;
  });

  const onReorder = () => {
    const { skippedNames } = reorder(last);
    announce(
      skippedNames.length
        ? t('welcomeBack.skipped', { names: skippedNames.join(', ') })
        : t('welcomeBack.reordered'),
    );
    navigate('/cart');
  };

  const tryNewFirst = visitType === 'second';
  const reorderBtn = (
    <button type="button" className={`btn ${tryNewFirst ? 'btn--ghost' : 'btn--primary'} btn--block`} onClick={onReorder}>
      {t('welcomeBack.orderAgain')}
    </button>
  );
  const tryNewBtn = (
    <Link to="/menu?filter=try-new" className={`btn ${tryNewFirst ? 'btn--primary' : 'btn--ghost'} btn--block`}>
      {t('welcomeBack.tryNew')}
    </Link>
  );

  return (
    <section className="section container" aria-labelledby="welcome-title">
      <SectionHeading id="welcome-title" title={t('welcomeBack.title')} subtitle={t('welcomeBack.subtitle')} />
      <div className="panel">
        <p className="panel__eyebrow">
          {t('welcomeBack.lastOrder')} · {t('welcomeBack.orderedOn', { date: formatDate(last.timestamp, i18n.language) })}
        </p>
        <p className="panel__lines">{lines.join(' · ')}</p>
        <div className="panel__actions">
          {tryNewFirst ? (
            <>
              {tryNewBtn}
              {reorderBtn}
            </>
          ) : (
            <>
              {reorderBtn}
              {tryNewBtn}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
