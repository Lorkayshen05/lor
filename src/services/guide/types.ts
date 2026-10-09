import type { BusinessFacts } from '../../data/business';
import type { MenuItem, Money, OrderType, ReasonKey } from '../../types';

export type FaqTopic = 'hours' | 'location' | 'contact' | 'ordering' | 'languages' | 'dinein_takeaway' | 'reservation' | 'prep_time' | 'discounts';
export type Ingredient = 'sesame' | 'peanut' | 'almond' | 'walnut';

export type GuideIntent =
  | { type: 'first_visit' }
  | { type: 'second_visit' }
  | { type: 'try_next' }
  | { type: 'budget'; amount: Money; people?: number }
  | { type: 'ingredient'; ingredient: Ingredient }
  | { type: 'drinks' }
  | { type: 'compare'; itemIds?: string[] }
  | { type: 'allergy'; ingredient?: Ingredient }
  | { type: 'faq'; topic: FaqTopic }
  | { type: 'unknown' };

export interface GuideContext {
  menu: readonly MenuItem[];
  orderType: OrderType;
  /** Products this customer has ordered before, if the client legitimately has that history. */
  orderedItemIds: readonly string[];
  cartItemIds: readonly string[];
  business: BusinessFacts;
  languageCount: number;
}

export type AllergenView =
  | { status: 'unknown' }
  | { status: 'verified'; contains: string[]; mayContain: string[]; verifiedBy: string; verifiedAt: string };

export interface GuideItem {
  itemId: string;
  quantity?: number;
  reason?: ReasonKey;
  /** Present on allergy / ingredient answers. */
  allergen?: AllergenView;
}

export interface GuideAnswer {
  intent: GuideIntent['type'];
  /** i18n key under `guide.*` — wording is localized on the client. */
  messageKey: string;
  params?: Record<string, string | number>;
  items: GuideItem[];
  /** i18n keys for caveats shown under the answer. */
  notes: string[];
  /** A verified fact (hours, address) to interpolate. Absent when the business hasn't supplied it. */
  value?: string;
  contact?: BusinessFacts['contact'];
  /** Budget plan figures, computed by the planner (never by the AI). */
  plan?: { total: Money; remaining: Money; budget: Money; people: number; coversEveryone: boolean };
  source: 'rules' | 'ai';
  /** AI-written text (free-form questions only). Items and prices still come from the menu. */
  aiText?: string;
}
