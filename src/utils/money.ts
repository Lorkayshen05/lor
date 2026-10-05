import type { Money } from '../types';

/** Convert a ringgit amount written in source (8.5) to integer sen (850). */
export const rm = (ringgit: number): Money => Math.round(ringgit * 100);

export function formatMoney(sen: Money, locale = 'en-MY'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'MYR',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
    })
      .format(sen / 100)
      .replace(/^RM\s?/, 'RM ');
  } catch {
    return `RM ${(sen / 100).toFixed(2)}`;
  }
}
