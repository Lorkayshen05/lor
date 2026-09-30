export interface Clock {
  now(): number;
}
export const systemClock: Clock = { now: () => Date.now() };
export const iso = (ms: number): string => new Date(ms).toISOString();
