export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Money is stored in sen. */
export function formatMyr(sen: number | null | undefined): string {
  if (sen == null) return "";
  const rm = sen / 100;
  return `RM${Number.isInteger(rm) ? rm : rm.toFixed(2)}`;
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", ...opts }).format(new Date(d));
}

/** Escape "<" so JSON-LD can't break out of its <script> tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Only allow http(s) URLs; returns null for anything else (blocks javascript: etc.). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Malaysian phone → digits with country code (60…), or null if it doesn't look valid. */
export function normalizeMyPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0")) d = `60${d.slice(1)}`;
  else if (!d.startsWith("60")) return null;
  return /^60\d{8,10}$/.test(d) ? d : null;
}

export function formatMyPhone(digits: string): string {
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/** Only allow same-site relative redirect targets (blocks open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
