import type { DiscoveryFilter, MenuItem } from '../../types';
import { filterMenu } from '../discovery';

export const discoveryFilterIds = (menu: readonly MenuItem[], f: DiscoveryFilter, seen: Set<string>) =>
  filterMenu(menu, f, { seenIds: seen }).map((m) => m.id);
