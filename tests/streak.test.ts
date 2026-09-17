import { describe, expect, it } from "vitest";
import { advanceStreak, daysBetweenUtc, effectiveStreak } from "@/lib/streak";

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe("streaks", () => {
  it("starts at 1 for a first activity", () => {
    const next = advanceStreak({ current: 0, longest: 0, lastActive: null }, day("2026-01-01"));
    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
  });

  it("increments on consecutive days", () => {
    const next = advanceStreak({ current: 3, longest: 5, lastActive: day("2026-01-01") }, day("2026-01-02"));
    expect(next.current).toBe(4);
    expect(next.longest).toBe(5);
  });

  it("does not double count the same day", () => {
    const next = advanceStreak({ current: 3, longest: 3, lastActive: day("2026-01-02") }, new Date("2026-01-02T23:00:00Z"));
    expect(next.current).toBe(3);
  });

  it("resets after a missed day", () => {
    const next = advanceStreak({ current: 9, longest: 9, lastActive: day("2026-01-01") }, day("2026-01-03"));
    expect(next.current).toBe(1);
    expect(next.longest).toBe(9);
  });

  it("reports a dead streak as zero", () => {
    expect(effectiveStreak({ current: 5, longest: 5, lastActive: day("2026-01-01") }, day("2026-01-05"))).toBe(0);
    expect(effectiveStreak({ current: 5, longest: 5, lastActive: day("2026-01-04") }, day("2026-01-05"))).toBe(5);
  });

  it("counts whole UTC days", () => {
    expect(daysBetweenUtc(day("2026-01-01"), day("2026-01-08"))).toBe(7);
  });
});
