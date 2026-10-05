import { useTranslation } from 'react-i18next';
import type { MenuItem } from '../types';
import { useApp } from '../state/AppContext';

/**
 * Evidence-based tag for a product. "Best seller" appears ONLY when real ranking data exists;
 * otherwise curated labels (Signature / First-timer pick) or "Try something new" (history-based).
 */
export function ItemTag({ item }: { item: MenuItem }) {
  const { t } = useTranslation();
  const { bestSellers, orders, seenIds } = useApp();

  const rank = bestSellers?.find((b) => b.itemId === item.id)?.rank;
  let label: string | null = null;
  let tone = 'gold';
  if (rank) {
    label = `${t('signatures.rank', { rank })} ${t('labels.bestSeller')}`;
  } else if (item.curation.signature) {
    label = t('labels.signature');
  } else if (item.curation.firstTimerPick) {
    label = t('labels.firstTimerPick');
    tone = 'jade';
  } else if (orders.length > 0 && !seenIds.has(item.id)) {
    label = t('labels.tryNew');
    tone = 'ruby';
  }
  return label ? <span className={`tag tag--${tone}`}>{label}</span> : null;
}
