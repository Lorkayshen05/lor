/**
 * One idempotency key per *distinct* checkout. While the customer retries the same order (lost response, flaky
 * network, double tap) the key stays the same, so the server returns the order it already saved instead of making
 * a second one. Change anything about the order and a new key is issued.
 */
const STORAGE_KEY = 'rdh.checkout.v1';

interface Stored {
  fingerprint: string;
  key: string;
}

let memory: Stored | null = null; // fallback when sessionStorage is unavailable

function read(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : memory;
  } catch {
    return memory;
  }
}
function write(v: Stored | null): void {
  memory = v;
  try {
    if (v) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* memory fallback already set */
  }
}

const newKey = (): string => `ik_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`}`;

export function fingerprintOf(parts: { items: { itemId: string; quantity: number }[]; orderType: string; tableNumber?: string; pickupInMinutes?: number; name: string; phone: string }): string {
  return JSON.stringify({
    items: [...parts.items].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    t: parts.orderType,
    table: parts.orderType === 'dine-in' ? (parts.tableNumber ?? '').trim().toUpperCase() : '',
    pickup: parts.orderType === 'takeaway' ? (parts.pickupInMinutes ?? 0) : 0,
    name: parts.name.trim(),
    phone: parts.phone.replace(/[\s()-]/g, ''),
  });
}

export function keyFor(fingerprint: string): string {
  const current = read();
  if (current && current.fingerprint === fingerprint) return current.key;
  const next = { fingerprint, key: newKey() };
  write(next);
  return next.key;
}

export const clearKey = (): void => write(null);
