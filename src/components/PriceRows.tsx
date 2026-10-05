import { useTranslation } from 'react-i18next';
import type { MenuItem } from '../types';
import { useApp } from '../state/AppContext';
import { Price } from './Price';

/** Both prices, with the one that applies to the current order type marked in text (not colour alone). */
export function PriceRows({ item, className }: { item: MenuItem; className: string }) {
  const { t } = useTranslation();
  const { orderType } = useApp();
  return (
    <dl className={className}>
      {(['dine-in', 'takeaway'] as const).map((type) => {
        const active = type === orderType;
        return (
          <div key={type} className={active ? 'is-active' : ''}>
            <dt>
              {t(type === 'dine-in' ? 'common.dineInPrice' : 'common.takeawayPrice')}
              {active && <span className="sr-only"> ({t('common.selected')})</span>}
            </dt>
            <dd>
              <Price value={type === 'dine-in' ? item.dineInPrice : item.takeawayPrice} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
