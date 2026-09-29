import { z } from "zod";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const openingHoursSchema = z.partialRecord(
  z.enum(DAY_KEYS),
  z.array(z.object({ open: time, close: time })).max(3),
);
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export type OpenStatus = { state: "open" | "closed" | "unknown"; label: string };

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

function kualaLumpurNow(now: Date): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday").slice(0, 3).toLowerCase() as DayKey;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Hours are trusted ONLY when `verifiedAt` is set and the JSON parses.
 * Otherwise the status is "unknown" — we never guess.
 */
export function getOpenStatus(
  hours: unknown,
  verifiedAt: Date | string | null | undefined,
  now: Date = new Date(),
): OpenStatus {
  if (!verifiedAt) return { state: "unknown", label: "Hours not verified" };
  const parsed = openingHoursSchema.safeParse(hours);
  if (!parsed.success) return { state: "unknown", label: "Hours not verified" };
  const { day, minutes } = kualaLumpurNow(now);
  const idx = DAY_KEYS.indexOf(day);
  const prevDay = DAY_KEYS[(idx + 6) % 7];
  const today = parsed.data[day] ?? [];
  const yesterday = parsed.data[prevDay] ?? [];
  const openToday = today.some((r) => {
    const o = toMin(r.open);
    const c = toMin(r.close);
    return c > o ? minutes >= o && minutes < c : minutes >= o; // close <= open means past midnight
  });
  const spillFromYesterday = yesterday.some((r) => {
    const o = toMin(r.open);
    const c = toMin(r.close);
    return c <= o && minutes < c;
  });
  return openToday || spillFromYesterday ? { state: "open", label: "Open now" } : { state: "closed", label: "Closed now" };
}

export function hasVerifiedHours(hours: unknown, verifiedAt: Date | string | null | undefined): boolean {
  return !!verifiedAt && openingHoursSchema.safeParse(hours).success;
}

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};
