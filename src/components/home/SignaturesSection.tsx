import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../state/AppContext';
import { ProductCard } from '../ProductCard';
import { SectionHeading } from '../SectionHeading';

/**
 * Switches automatically: true "Best sellers" only when real ranking data exists,
 * otherwise "Our signatures" (restaurant-curated, no popularity claim).
 */
export function SignaturesSection() {
  const { t } = useTranslation();
  const { menu, menuById, bestSellers } = useApp();

  const items = bestSellers
    ? bestSellers.flatMap((b) => {
        const item = menuById.get(b.itemId);
        return item ? [item] : [];
      })
    : menu.filter((m) => m.available && m.curation.signature).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="section container" aria-labelledby="signatures-title">
      <SectionHeading
        id="signatures-title"
        title={bestSellers ? t('signatures.bestTitle') : t('signatures.title')}
        subtitle={bestSellers ? t('signatures.bestSubtitle') : t('signatures.subtitle')}
        action={
          <Link to="/menu" className="link-arrow">
            {t('common.viewAll')}
          </Link>
        }
      />
      <div className="card-grid">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
