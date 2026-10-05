import type { MenuItem } from '../types';

/** Lower-case, strip diacritics and collapse width variants so "Café"/"cafe" and full-width text match. */
export function normalizeText(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().trim();
}

/**
 * Every whitespace-separated token must appear somewhere in the item's searchable text.
 * `getFields` supplies the text per item (English name, Chinese name, code, category,
 * plus localized name/category where translations exist), so locale logic stays out of here.
 */
export function searchMenu(
  menu: readonly MenuItem[],
  query: string,
  getFields: (item: MenuItem) => string[],
): MenuItem[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...menu];
  return menu.filter((item) => {
    const haystack = normalizeText(getFields(item).join(' '));
    return tokens.every((t) => haystack.includes(t));
  });
}
