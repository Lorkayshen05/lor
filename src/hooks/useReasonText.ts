import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReasonKey } from '../types';
import { useApp } from '../state/AppContext';
import { useMenuText } from './useMenuText';

/** Turns a structured recommendation reason into a localized sentence. */
export function useReasonText() {
  const { t } = useTranslation();
  const { menuById } = useApp();
  const { nameOf } = useMenuText();

  return useCallback(
    (reason: ReasonKey): string => {
      const related = reason.relatedItemId ? menuById.get(reason.relatedItemId) : undefined;
      return t(reason.key, {
        flavour: reason.flavour ? t(`flavour.${reason.flavour}`) : '',
        item: related ? nameOf(related) : '',
      });
    },
    [t, menuById, nameOf],
  );
}
