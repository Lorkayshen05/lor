import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { englishAttempts, users, streaks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { ENGLISH_EXERCISES } from "@/content/english";
import { checkAnswer } from "@/lib/english";
import { advanceStreak } from "@/lib/game/streak";
import { computeLevel } from "@/lib/game/xp";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";

const ENGLISH_XP = 10;
const PASS_THRESHOLD = 70;

const bodySchema = z.object({
  exerciseId: z.string().min(1),
  transcript: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const { exerciseId, transcript } = parsed.data;

  const exercise = ENGLISH_EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) return NextResponse.json({ error: "Exercise not found." }, { status: 404 });

  const priorAttempts = await db.query.englishAttempts.findMany({
    where: and(eq(englishAttempts.userId, user.id), eq(englishAttempts.exerciseId, exerciseId)),
    orderBy: desc(englishAttempts.attemptNumber),
  });
  const attemptNumber = (priorAttempts[0]?.attemptNumber ?? 0) + 1;
  const isRetry = attemptNumber >= 2;
  const hadFirstAttempt = priorAttempts.some((a) => a.attemptNumber === 1);

  const check = checkAnswer(transcript, exercise.keyPoints);
  const passed = check.meaningScore >= PASS_THRESHOLD && check.grammarIssues.length === 0;

  await db.insert(englishAttempts).values({
    userId: user.id,
    exerciseId,
    kind: exercise.kind,
    attemptNumber,
    transcript,
    meaningScore: check.meaningScore,
    keyPointsCovered: check.covered,
    keyPointsMissing: check.missing,
    grammarIssues: check.grammarIssues,
    passed,
  });

  // Award XP once, on the first time the student completes a rewrite (attempt #2) for this exercise.
  const isFirstRewrite = attemptNumber === 2;
  let xpAwarded = 0;
  let level = null;
  let unlockedAchievements: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];

  if (isFirstRewrite) {
    xpAwarded = ENGLISH_XP;
    const [updatedUser] = await db
      .update(users)
      .set({ xp: (await db.query.users.findFirst({ where: eq(users.id, user.id) }))!.xp + ENGLISH_XP })
      .where(eq(users.id, user.id))
      .returning();
    level = computeLevel(updatedUser.xp);

    const streakRow = await db.query.streaks.findFirst({ where: eq(streaks.userId, user.id) });
    const next = advanceStreak({ current: streakRow?.current ?? 0, longest: streakRow?.longest ?? 0, lastActiveDate: streakRow?.lastActiveDate ?? null }, new Date());
    if (streakRow) await db.update(streaks).set(next).where(eq(streaks.id, streakRow.id));
    else await db.insert(streaks).values({ userId: user.id, ...next });

    unlockedAchievements = await checkAndUnlockAchievements(user.id);
  }

  const showNaturalVersion = isRetry && hadFirstAttempt;

  return NextResponse.json({
    attemptNumber,
    meaningScore: check.meaningScore,
    covered: check.covered,
    missing: check.missing,
    grammarIssues: check.grammarIssues,
    passed,
    naturalVersion: showNaturalVersion ? exercise.modelAnswer : null,
    xpAwarded,
    level,
    unlockedAchievements,
  });
}
