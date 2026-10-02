const DEFAULT_TZ = "Asia/Kuala_Lumpur";

/** YYYY-MM-DD for `date` as seen in APP_TIMEZONE, e.g. "2026-09-23". */
export function calendarDate(date: Date, timeZone = process.env.APP_TIMEZONE || DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function daysBetween(a: string, b: string): number {
  // Both are YYYY-MM-DD calendar-date strings (not instants), so comparing as UTC midnights is safe.
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / msPerDay);
}

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

/** Advances the streak for activity happening "now". Same-day calls are idempotent. */
export function advanceStreak(state: StreakState, now: Date): StreakState {
  const today = calendarDate(now);
  if (state.lastActiveDate === today) {
    return state; // already counted today
  }

  let current: number;
  if (state.lastActiveDate === null) {
    current = 1;
  } else {
    const gap = daysBetween(state.lastActiveDate, today);
    current = gap === 1 ? state.current + 1 : 1; // consecutive day vs. missed a day (or clock skew) -> reset to 1
  }

  return { current, longest: Math.max(state.longest, current), lastActiveDate: today };
}
