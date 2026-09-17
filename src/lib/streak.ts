export type StreakState = {
  current: number;
  longest: number;
  lastActive: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnight for a date, so streaks are day-based and timezone-stable. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function daysBetweenUtc(a: Date, b: Date): number {
  return Math.round((startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime()) / DAY_MS);
}

/** Pure streak transition applied whenever a user completes activity. */
export function advanceStreak(state: StreakState, now: Date = new Date()): StreakState {
  if (!state.lastActive) {
    return { current: 1, longest: Math.max(1, state.longest), lastActive: now };
  }
  const gap = daysBetweenUtc(state.lastActive, now);
  if (gap <= 0) {
    return { ...state, current: Math.max(1, state.current), longest: Math.max(state.longest, Math.max(1, state.current)), lastActive: now };
  }
  const current = gap === 1 ? state.current + 1 : 1;
  return { current, longest: Math.max(state.longest, current), lastActive: now };
}

/** Current streak as seen today (a streak not touched yesterday or today is dead). */
export function effectiveStreak(state: StreakState, now: Date = new Date()): number {
  if (!state.lastActive) return 0;
  return daysBetweenUtc(state.lastActive, now) <= 1 ? state.current : 0;
}
