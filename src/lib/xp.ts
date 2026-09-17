import type { Difficulty } from "@/generated/prisma/enums";

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 10,
  MEDIUM: 20,
  HARD: 40,
  BOSS: 100,
};

export const DIFFICULTY_ORDER: Difficulty[] = ["EASY", "MEDIUM", "HARD", "BOSS"];

/** level = floor(sqrt(xp / 100)) + 1 */
export function levelFromXp(xp: number): number {
  const safe = Number.isFinite(xp) && xp > 0 ? xp : 0;
  return Math.floor(Math.sqrt(safe / 100)) + 1;
}

/** Total XP required to reach `level`. Inverse of levelFromXp. */
export function xpForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return (safe - 1) ** 2 * 100;
}

export type LevelProgress = {
  level: number;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  percent: number;
};

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - levelStartXp;
  const xpIntoLevel = Math.max(0, xp - levelStartXp);
  return {
    level,
    xp,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel,
    xpToNextLevel: Math.max(0, nextLevelXp - xp),
    percent: span > 0 ? Math.min(100, Math.round((xpIntoLevel / span) * 100)) : 100,
  };
}

/**
 * Mastery for a completed quest: 1.0 on a clean first-try solve, reduced by
 * extra attempts and hints, floored at 0.2 so effort still counts.
 */
export function masteryScore(attempts: number, hintsUsed: number): number {
  const extraAttempts = Math.max(0, attempts - 1);
  const raw = 1 - extraAttempts * 0.15 - hintsUsed * 0.1;
  return Math.round(Math.max(0.2, Math.min(1, raw)) * 100) / 100;
}

export function xpForQuest(difficulty: Difficulty, questXp?: number | null): number {
  return questXp && questXp > 0 ? questXp : XP_BY_DIFFICULTY[difficulty];
}
