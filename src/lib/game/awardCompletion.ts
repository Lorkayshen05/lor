import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { progress, users, streaks } from "@/db/schema";
import { computeMastery } from "./mastery";
import { computeLevel } from "./xp";
import { advanceStreak } from "./streak";
import { checkAndUnlockAchievements } from "./achievements";

export interface CompletionResult {
  xpAwarded: number;
  mastery: number;
  alreadyCompleted: boolean;
  level: ReturnType<typeof computeLevel>;
  streak: { current: number; longest: number };
  unlockedAchievements: Awaited<ReturnType<typeof checkAndUnlockAchievements>>;
}

/**
 * Shared "quest passed" side effects for both CODE and QUIZ quests: upserts
 * progress/mastery, awards XP once, advances the daily streak, and checks
 * achievements. Call after confirming the quest is actually solved.
 */
export async function awardCompletion(params: {
  userId: string;
  questId: string;
  xpReward: number;
  attempts: number;
  hintsUsed: number;
}): Promise<CompletionResult> {
  const { userId, questId, xpReward, attempts, hintsUsed } = params;

  const existing = await db.query.progress.findFirst({ where: and(eq(progress.userId, userId), eq(progress.questId, questId)) });
  const alreadyCompleted = existing?.completed ?? false;
  const mastery = computeMastery(attempts, hintsUsed);
  const firstTry = attempts === 1;
  const noHint = hintsUsed === 0;

  if (existing) {
    await db
      .update(progress)
      .set({ completed: true, mastery, attempts, hintsUsed, firstTry: existing.firstTry || firstTry, noHint: existing.noHint && noHint })
      .where(eq(progress.id, existing.id));
  } else {
    await db.insert(progress).values({ userId, questId, completed: true, mastery, attempts, hintsUsed, firstTry, noHint });
  }

  let xpAwarded = 0;
  let user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!alreadyCompleted) {
    xpAwarded = xpReward;
    [user] = await db
      .update(users)
      .set({ xp: (user?.xp ?? 0) + xpReward })
      .where(eq(users.id, userId))
      .returning();
  }

  const streakRow = await db.query.streaks.findFirst({ where: eq(streaks.userId, userId) });
  const nextStreak = advanceStreak(
    { current: streakRow?.current ?? 0, longest: streakRow?.longest ?? 0, lastActiveDate: streakRow?.lastActiveDate ?? null },
    new Date()
  );
  if (streakRow) {
    await db.update(streaks).set(nextStreak).where(eq(streaks.id, streakRow.id));
  } else {
    await db.insert(streaks).values({ userId, ...nextStreak });
  }

  const unlockedAchievements = await checkAndUnlockAchievements(userId);

  return {
    xpAwarded,
    mastery,
    alreadyCompleted,
    level: computeLevel(user?.xp ?? 0),
    streak: { current: nextStreak.current, longest: nextStreak.longest },
    unlockedAchievements,
  };
}
