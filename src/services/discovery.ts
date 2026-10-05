import type { DiscoveryFilter, MenuItem } from '../types';

export const DISCOVERY_FILTERS: readonly DiscoveryFilter[] = [
  'signature',
  'first-time',
  'mixed',
  'rich-nutty',
  'warm-silky',
  'light-refreshing',
  'drinks',
  'try-new',
];

export interface DiscoveryContext {
  /** Products the customer already ordered (history) — falls back to cart when there is none. */
  seenIds: ReadonlySet<string>;
}

/** Discovery filters are editorial lenses over real products, not official categories. */
export function matchesFilter(item: MenuItem, filter: DiscoveryFilter, ctx: DiscoveryContext): boolean {
  switch (filter) {
    case 'signature':
      return !!item.curation.signature;
    case 'first-time':
      return !!item.curation.firstTimerPick;
    case 'mixed':
      return item.category === 'mixed' || item.flavours.includes('mixed');
    case 'rich-nutty':
      return (
        (item.category === 'paste' || item.category === 'mixed') &&
        (item.flavours.includes('nutty') || item.flavours.includes('sesame'))
      );
    case 'warm-silky':
      return item.temperature === 'hot' && item.category !== 'drink' && item.flavours.includes('creamy');
    case 'light-refreshing':
      return (
        item.category !== 'paste' &&
        item.category !== 'mixed' &&
        (item.flavours.includes('light') || item.flavours.includes('refreshing'))
      );
    case 'drinks':
      return item.category === 'drink';
    case 'try-new':
      return !ctx.seenIds.has(item.id);
  }
}

export function filterMenu(
  menu: readonly MenuItem[],
  filter: DiscoveryFilter | null,
  ctx: DiscoveryContext,
): MenuItem[] {
  return filter ? menu.filter((m) => matchesFilter(m, filter, ctx)) : [...menu];
}
