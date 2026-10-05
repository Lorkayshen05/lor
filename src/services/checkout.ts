import type { OrderType } from '../types';
import { CHECKOUT_CONFIG } from '../data/restaurant';

export interface CheckoutInput {
  name: string;
  phone: string;
  tableNumber: string;
}

/** Error values are i18n keys under `errors.*`. */
export type CheckoutErrors = Partial<Record<keyof CheckoutInput | 'cart', string>>;

const TABLE_RE = /^[A-Za-z0-9-]{1,6}$/;
const PHONE_RE = /^\+?\d{8,15}$/;

export const normalizePhone = (value: string): string => value.replace(/[\s()-]/g, '');

export function validateCheckout(
  input: CheckoutInput,
  orderType: OrderType,
  cartLineCount: number,
  hasUnavailable = false,
): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (cartLineCount === 0) errors.cart = 'errors.cartEmpty';
  if (hasUnavailable) errors.cart = 'errors.unavailableItems';

  const name = input.name.trim();
  if (name.length > 40) errors.name = 'errors.nameTooLong';

  if (orderType === 'dine-in') {
    if (!input.tableNumber.trim()) errors.tableNumber = 'errors.tableRequired';
    else if (!TABLE_RE.test(input.tableNumber.trim())) errors.tableNumber = 'errors.tableInvalid';
    if (CHECKOUT_CONFIG.requireNameForDineIn && !name) errors.name = 'errors.nameRequired';
  } else {
    if (!name) errors.name = 'errors.nameRequired';
    const phone = normalizePhone(input.phone);
    if (!phone) {
      if (CHECKOUT_CONFIG.requirePhoneForTakeaway) errors.phone = 'errors.phoneRequired';
    } else if (!PHONE_RE.test(phone)) errors.phone = 'errors.phoneInvalid';
  }
  return errors;
}
