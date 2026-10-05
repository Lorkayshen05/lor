import { useMemo } from 'react';
import type { FlavourTag, Money, Recommendation, VisitType } from '../types';
import { getRecommendations } from '../services/recommendations';
import { useApp } from '../state/AppContext';

interface Options {
  visitType?: VisitType;
  budget?: Money;
  preference?: readonly FlavourTag[];
  limit?: number;
  excludeOrdered?: boolean;
}

/** Context-bound wrapper around the pure recommender (history, cart and order type come from app state). */
export function useRecommendations(options: Options = {}): Recommendation[] {
  const { menu, orders, cart, orderType, visitType } = useApp();
  const { budget, limit, excludeOrdered } = options;
  const preferenceKey = options.preference?.join(',') ?? '';
  const effectiveVisit = options.visitType ?? visitType;

  return useMemo(
    () =>
      getRecommendations({
        menu,
        customerHistory: orders,
        currentCart: cart,
        visitType: effectiveVisit,
        orderType,
        budget,
        preference: preferenceKey ? (preferenceKey.split(',') as FlavourTag[]) : [],
        limit,
        excludeOrdered,
      }),
    [menu, orders, cart, orderType, effectiveVisit, budget, preferenceKey, limit, excludeOrdered],
  );
}
