import { describe, expect, it } from "vitest";
import { XP_BY_DIFFICULTY, levelFromXp, levelProgress, masteryScore, xpForLevel, xpForQuest } from "@/lib/xp";

describe("xp and levels", () => {
  it("uses the documented XP table", () => {
    expect(XP_BY_DIFFICULTY).toEqual({ EASY: 10, MEDIUM: 20, HARD: 40, BOSS: 100 });
  });

  it("levels with floor(sqrt(xp / 100)) + 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(399)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
    expect(levelFromXp(2500)).toBe(6);
  });

  it("treats invalid xp as zero", () => {
    expect(levelFromXp(-50)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
  });

  it("xpForLevel inverts levelFromXp", () => {
    for (let level = 1; level <= 10; level += 1) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      expect(levelFromXp(xpForLevel(level) - 1)).toBe(Math.max(1, level - 1));
    }
  });

  it("reports progress inside the current level", () => {
    const progress = levelProgress(250);
    expect(progress.level).toBe(2);
    expect(progress.levelStartXp).toBe(100);
    expect(progress.nextLevelXp).toBe(400);
    expect(progress.xpIntoLevel).toBe(150);
    expect(progress.xpToNextLevel).toBe(150);
    expect(progress.percent).toBe(50);
  });

  it("scores mastery down for retries and hints, with a floor", () => {
    expect(masteryScore(1, 0)).toBe(1);
    expect(masteryScore(2, 0)).toBe(0.85);
    expect(masteryScore(1, 2)).toBe(0.8);
    expect(masteryScore(20, 20)).toBe(0.2);
  });

  it("falls back to the difficulty table when a quest has no xp", () => {
    expect(xpForQuest("BOSS", null)).toBe(100);
    expect(xpForQuest("EASY", 15)).toBe(15);
  });
});
