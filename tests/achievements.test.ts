import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements } from "@/lib/achievements";

const base = { completedQuests: 0, pythonCompleted: 0, pythonTotal: 8, bossCompleted: 0, streak: 0, projects: 0 };

describe("achievements", () => {
  it("ships every achievement the spec requires", () => {
    expect(ACHIEVEMENTS.map((a) => a.code).sort()).toEqual(
      ["BOSS_DEFEATED", "FIRST_PROJECT", "FIRST_QUEST", "PYTHON_BEGINNER", "PYTHON_MASTER", "STREAK_7", "TEN_QUESTS"].sort(),
    );
  });

  it("unlocks nothing for a new player", () => {
    expect(evaluateAchievements(base)).toEqual([]);
  });

  it("unlocks the first quest and python beginner tiers", () => {
    expect(evaluateAchievements({ ...base, completedQuests: 3, pythonCompleted: 3 })).toEqual([
      "FIRST_QUEST",
      "PYTHON_BEGINNER",
    ]);
  });

  it("requires every python quest for mastery", () => {
    expect(evaluateAchievements({ ...base, completedQuests: 8, pythonCompleted: 7, pythonTotal: 8 })).not.toContain("PYTHON_MASTER");
    expect(evaluateAchievements({ ...base, completedQuests: 8, pythonCompleted: 8, pythonTotal: 8 })).toContain("PYTHON_MASTER");
  });

  it("never unlocks python mastery when the course is empty", () => {
    expect(evaluateAchievements({ ...base, pythonTotal: 0, pythonCompleted: 0 })).not.toContain("PYTHON_MASTER");
  });

  it("unlocks streak, boss and project badges", () => {
    const earned = evaluateAchievements({ ...base, completedQuests: 10, streak: 7, bossCompleted: 1, projects: 2 });
    expect(earned).toEqual(expect.arrayContaining(["TEN_QUESTS", "STREAK_7", "BOSS_DEFEATED", "FIRST_PROJECT"]));
  });
});
