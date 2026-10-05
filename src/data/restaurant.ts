/**
 * Brand and outlet details. Only facts supplied in the brief are filled in.
 * Add real outlets (address, hours, map link) to `outlets`; the Location
 * section renders them automatically and hides its "to be added" notice.
 */
export interface Outlet {
  id: string;
  name: string;
  address: string;
  hours?: string;
  phone?: string;
  mapUrl?: string;
}

export const BRAND = {
  line1: 'KAN BROTHERS',
  line2: 'RUBY DESSERT HOUSE',
  chinese: '芝麻糊大王',
  since: 1927,
} as const;

export const OUTLETS: readonly Outlet[] = [];

export const CHECKOUT_CONFIG = {
  /** Whether a phone number is required for takeaway orders. */
  requirePhoneForTakeaway: true,
  /** Dine-in guests may leave their name blank. */
  requireNameForDineIn: false,
  maxQuantityPerItem: 20,
  pickupOptionsMinutes: [0, 15, 30, 60],
} as const;
