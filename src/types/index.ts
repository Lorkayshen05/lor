/** Money is always an integer number of sen (RM 1.00 = 100) to avoid float drift. */
export type Money = number;

export type OrderType = 'dine-in' | 'takeaway';

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type VisitType = 'first' | 'second' | 'returning';

export type MenuCategory = 'paste' | 'mixed' | 'custard' | 'sweet-soup' | 'cold' | 'drink';

/** Flavour / mood tags used by the rule-based recommender and discovery filters. */
export type FlavourTag =
  | 'sesame'
  | 'nutty'
  | 'creamy'
  | 'light'
  | 'refreshing'
  | 'mixed'
  | 'traditional';

export type DiscoveryFilter =
  | 'signature'
  | 'first-time'
  | 'mixed'
  | 'rich-nutty'
  | 'warm-silky'
  | 'light-refreshing'
  | 'drinks'
  | 'try-new';

export interface MenuItem {
  id: string;
  productCode: string;
  category: MenuCategory;
  /** English name — the canonical fallback when a locale has no translation. */
  name: string;
  chineseName: string;
  description: string;
  dineInPrice: Money;
  takeawayPrice: Money;
  image: string;
  imageAlt?: string;
  flavours: FlavourTag[];
  /** Restaurant-curated flags. These are editorial picks, NOT sales data. */
  curation: {
    signature?: boolean;
    firstTimerPick?: boolean;
    traditionalDrink?: boolean;
  };
  /** Served hot ("warm & silky") vs cold. */
  temperature: 'hot' | 'cold';
  available: boolean;
  /** True while the item is sample data and not a confirmed Ruby menu entry. */
  placeholder?: boolean;
}

export interface CartItem {
  itemId: string;
  quantity: number;
}

export interface OrderItem {
  itemId: string;
  /** Snapshots so history survives menu edits. */
  name: string;
  chineseName: string;
  quantity: number;
  unitPrice: Money;
}

export interface Order {
  orderId: string;
  /** Anonymous per-device id. No personal data. */
  customerId: string;
  items: OrderItem[];
  total: Money;
  orderType: OrderType;
  tableNumber?: string;
  /** Takeaway only: minutes from order time the customer asked to collect. */
  pickupInMinutes?: number;
  timestamp: string;
  status: OrderStatus;
}

export interface Customer {
  customerId: string;
  orders: Order[];
}

export interface Recommendation {
  item: MenuItem;
  score: number;
  reason: ReasonKey;
}

export interface ReasonKey {
  /** i18n key under `reasons.*`. */
  key: string;
  /** Flavour to interpolate (translated at render time). */
  flavour?: FlavourTag;
  /** Menu item to interpolate by localized name (translated at render time). */
  relatedItemId?: string;
}

export type TextDirection = 'ltr' | 'rtl';

export interface Language {
  code: string;
  nativeName: string;
  englishName: string;
  dir: TextDirection;
  /** full = complete UI; core = key flows only (rest falls back); fallback = uses another locale. */
  coverage: 'full' | 'core' | 'fallback';
  /** Always false until a native speaker signs off. Surfaced in the UI. */
  verified: boolean;
  /** Needs specialist linguistic validation (e.g. Cantonese, Hokkien). */
  needsValidation?: boolean;
  fallbackTo?: string;
}
