import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export const XP_REWARDS = {
  easy: 10,
  medium: 20,
  hard: 40,
  boss: 100,
} as const;

export type Difficulty = keyof typeof XP_REWARDS;

/** XP needed to clear a level scales up gently so the game stays winnable. */
export function xpToNextLevel(level: number) {
  return 100 + (level - 1) * 50;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(a: Date, b: Date) {
  const yest = new Date(b);
  yest.setDate(yest.getDate() - 1);
  return isSameDay(a, yest);
}

/** Applies an XP award, rolls levels up as needed, and updates the daily streak. */
export async function awardXp(user: User, amount: number) {
  let xp = user.xp + amount;
  let level = user.level;
  let xpToNext = user.xpToNext;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = xpToNextLevel(level);
  }

  const now = new Date();
  let streak = user.streak;
  if (streak === 0) {
    // first XP-earning action ever (account creation itself doesn't count as a day of activity)
    streak = 1;
  } else if (isSameDay(user.lastActiveAt, now)) {
    // already counted today
  } else if (isYesterday(user.lastActiveAt, now)) {
    streak += 1;
  } else {
    streak = 1;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { xp, level, xpToNext, streak, lastActiveAt: now },
  });
}
