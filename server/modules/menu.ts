import { MENU } from '../../src/data/menu';
import type { MenuItem } from '../../src/types';
import { all, run } from '../db';
import type { Deps } from '../deps';

/**
 * Server-side source of truth for products, prices and availability.
 * Prices and names come only from the menu data file; the database can only switch availability.
 * (Changing a price means editing the menu data and redeploying — a deliberate, reviewable human action.)
 */
export function getMenu(deps: Deps): MenuItem[] {
  const overrides = new Map(
    all<{ item_id: string; available: number }>(deps.db, 'SELECT item_id, available FROM menu_availability').map((r) => [
      r.item_id,
      r.available === 1,
    ]),
  );
  return MENU.map((m) => (overrides.has(m.id) ? { ...m, available: m.available && overrides.get(m.id)! } : { ...m }));
}

export const getMenuMap = (deps: Deps): Map<string, MenuItem> => new Map(getMenu(deps).map((m) => [m.id, m]));

export const menuIsSample = (): boolean => MENU.some((m) => m.placeholder);

export function setAvailability(deps: Deps, itemId: string, available: boolean, actor: string): boolean {
  if (!MENU.some((m) => m.id === itemId)) return false;
  run(
    deps.db,
    `INSERT INTO menu_availability (item_id, available, updated_by, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET available = excluded.available, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    itemId,
    available ? 1 : 0,
    actor,
    deps.now().toISOString(),
  );
  return true;
}
