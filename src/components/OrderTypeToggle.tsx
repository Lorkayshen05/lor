import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderType } from '../types';
import { useApp } from '../state/AppContext';
import { Icon } from './Icon';

const OPTIONS: { type: OrderType; key: string }[] = [
  { type: 'dine-in', key: 'orderType.dineIn' },
  { type: 'takeaway', key: 'orderType.takeAway' },
];

/** The single source of order-type UI. Changing it re-prices every screen via `priceCart`/`getUnitPrice`. */
export function OrderTypeToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { t } = useTranslation();
  const { orderType, setOrderType } = useApp();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const next: OrderType = orderType === 'dine-in' ? 'takeaway' : 'dine-in';
      setOrderType(next);
      (e.currentTarget.querySelector(`[data-type="${next}"]`) as HTMLElement | null)?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('orderType.label')}
      className={`segmented segmented--${variant}`}
      onKeyDown={onKeyDown}
    >
      {OPTIONS.map(({ type, key }) => {
        const selected = orderType === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            data-type={type}
            tabIndex={selected ? 0 : -1}
            className={`segmented__btn ${selected ? 'is-selected' : ''}`}
            onClick={() => setOrderType(type)}
          >
            {selected && <Icon name="check" size={16} />}
            <span>{t(key)}</span>
          </button>
        );
      })}
    </div>
  );
}
