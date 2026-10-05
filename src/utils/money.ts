import type { Money } from '../types';

/** Convert a ringgit amount written in source (8.5) to integer sen (850). */
export const rm = (ringgit: number): Money => Math.round(ringgit * 100);

let formatter: Intl.NumberFormat | null | undefined;

/** Always "RM 7.50" regardless of UI language, so a price reads the same everywhere. */
export function formatMoney(sen: Money): string {
  if (formatter === undefined) {
    try {
      formatter = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      formatter = null;
    }
  }
  const amount = sen / 100;
  return `RM ${formatter ? formatter.format(amount) : amount.toFixed(2)}`;
}
