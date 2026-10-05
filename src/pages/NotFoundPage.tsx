import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="container page">
      <div className="empty">
        <h1 className="empty__title">{t('errors.pageNotFound')}</h1>
        <p className="muted">{t('errors.pageNotFoundHint')}</p>
        <Link to="/menu" className="btn btn--primary">
          {t('product.backToMenu')}
        </Link>
      </div>
    </div>
  );
}
