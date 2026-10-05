import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../state/AppContext';
import { useRecommendations } from '../../hooks/useRecommendations';
import { RecommendationCard } from '../RecommendationCard';
import { SectionHeading } from '../SectionHeading';

/** Excludes products already ordered; with no history it falls back to "beyond what's in your cart". */
export function TryNewSection() {
  const { t } = useTranslation();
  const { orders, cart } = useApp();
  const hasHistory = orders.length > 0;
  const recs = useRecommendations({ visitType: 'returning', excludeOrdered: true, limit: 3 });
  if (!hasHistory && cart.length === 0) return null;
  if (recs.length === 0) return null;

  return (
    <section className="section container" aria-labelledby="try-new-title">
      <SectionHeading
        id="try-new-title"
        title={t('tryNew.title')}
        subtitle={hasHistory ? t('tryNew.subtitleHistory') : t('tryNew.subtitleSession')}
        action={
          <Link to="/menu?filter=try-new" className="link-arrow">
            {t('common.seeAll')}
          </Link>
        }
      />
      <ul className="rec-list">
        {recs.map((r) => (
          <RecommendationCard key={r.item.id} rec={r} />
        ))}
      </ul>
    </section>
  );
}
