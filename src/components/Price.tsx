import type { Money } from '../types';
import { formatMoney } from '../utils/money';

/** Isolated LTR run so "RM 7.50" never gets reordered inside Arabic/Hebrew/Persian text. */
export function Price({ value, className = '' }: { value: Money; className?: string }) {
  return (
    <bdi dir="ltr" className={`price ${className}`}>
      {formatMoney(value)}
    </bdi>
  );
}
