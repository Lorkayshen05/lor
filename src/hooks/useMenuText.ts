import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem } from '../types';

const CATEGORY_KEY: Record<MenuCategory, string> = {
  paste: 'category.paste',
  mixed: 'category.mixed',
  custard: 'category.custard',
  'sweet-soup': 'category.sweetSoup',
  cold: 'category.cold',
  drink: 'category.drink',
};

const CHINESE_LANGS = /^(zh|yue|nan)/;

/** All locale-dependent text for menu items lives here, so components never touch translation keys for dishes. */
export function useMenuText() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const nameOf = useCallback(
    (item: MenuItem) => t(`dish.${item.id}.name`, { defaultValue: item.name }),
    [t],
  );

  /** Second line under the name: Chinese for most readers; English for Chinese-language readers. */
  const secondaryOf = useCallback(
    (item: MenuItem) =>
      CHINESE_LANGS.test(lang) ? { text: item.name, lang: 'en' } : { text: item.chineseName, lang: 'zh-Hans' },
    [lang],
  );

  const descriptionOf = useCallback(
    (item: MenuItem) => t(`dish.${item.id}.description`, { defaultValue: item.description }),
    [t],
  );

  const categoryOf = useCallback((c: MenuCategory) => t(CATEGORY_KEY[c]), [t]);

  const searchFields = useCallback(
    (item: MenuItem) => [
      item.name,
      item.chineseName,
      item.productCode,
      item.category,
      t(CATEGORY_KEY[item.category], { lng: 'en' }),
      nameOf(item),
      categoryOf(item.category),
    ],
    [t, nameOf, categoryOf],
  );

  return { nameOf, secondaryOf, descriptionOf, categoryOf, searchFields };
}
