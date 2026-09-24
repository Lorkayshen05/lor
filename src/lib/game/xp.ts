export const XP_REWARDS = { easy: 10, medium: 20, hard: 40, boss: 100 } as const;
export type Difficulty = keyof typeof XP_REWARDS;

/** Cumulative XP needed to have reached level L: 50*L*(L-1). Level 1 starts at 0. */
export function cumulativeXpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

/** XP needed to go from level L to level L+1: 100*L. */
export function xpToClearLevel(level: number): number {
  return 100 * level;
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  totalXp: number;
}

/** Derives level + progress-into-level from a lifetime XP total. Pure — no DB. */
export function computeLevel(totalXp: number): LevelInfo {
  let level = 1;
  while (totalXp >= cumulativeXpForLevel(level + 1)) {
    level += 1;
  }
  const xpIntoLevel = totalXp - cumulativeXpForLevel(level);
  return { level, xpIntoLevel, xpToNextLevel: xpToClearLevel(level), totalXp };
}
