import "server-only";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_BY_CODE, evaluateAchievements } from "@/lib/achievements";
import { analyzeFailure } from "@/lib/mistakes";
import { advanceStreak, effectiveStreak } from "@/lib/streak";
import { levelFromXp, masteryScore, xpForQuest } from "@/lib/xp";
import type { RunResult, TestResult } from "@/lib/python/types";
import type { SubmissionInput } from "@/lib/validation";
import { verifyInSandbox, serverVerificationEnabled } from "@/server/sandbox";

export type UnlockedAchievement = { code: string; title: string; icon: string; xpReward: number };

export type SubmitOutcome = {
  passed: boolean;
  verified: boolean;
  status: "PASSED" | "FAILED" | "ERROR";
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  streak: number;
  alreadyCompleted: boolean;
  mastery: number;
  results: TestResult[];
  stdout: string;
  stderr: string;
  error: string | null;
  unlocked: UnlockedAchievement[];
};

/**
 * Applies one quest submission: records it, updates progress, XP, level,
 * streak, mistakes and achievements in a single transaction.
 */
export async function recordSubmission(userId: string, input: SubmissionInput): Promise<SubmitOutcome> {
  const quest = await prisma.quest.findUnique({
    where: { id: input.questId },
    include: { testCases: { orderBy: { order: "asc" } }, lesson: { include: { module: true } } },
  });
  if (!quest) throw new Error("Quest not found");

  const specs = quest.testCases.map((test) => ({
    id: test.id,
    name: test.name,
    kind: test.kind,
    expression: test.expression,
    expected: test.expected,
    hidden: test.hidden,
  }));

  let run: RunResult;
  let verified = false;

  const serverRun = serverVerificationEnabled ? await verifyInSandbox(input.code, specs) : null;
  if (serverRun) {
    run = serverRun;
    verified = true;
  } else {
    // Browser sandbox mode: trust only results that map onto real test rows.
    const knownIds = new Set(specs.map((spec) => spec.id));
    const results = input.results.filter((result) => knownIds.has(result.id));
    const passedCount = results.filter((result) => result.passed).length;
    run = {
      stdout: input.stdout,
      stderr: input.stderr,
      error: input.error,
      results,
      passedCount,
      totalCount: specs.length,
      passed: !input.error && results.length === specs.length && passedCount === specs.length,
      durationMs: input.durationMs,
    };
  }

  const status: SubmitOutcome["status"] = run.passed ? "PASSED" : run.error ? "ERROR" : "FAILED";

  const [user, existingProgress] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, level: true } }),
    prisma.progress.findUnique({ where: { userId_questId: { userId, questId: quest.id } } }),
  ]);

  const alreadyCompleted = existingProgress?.status === "COMPLETED";
  const attempts = (existingProgress?.attempts ?? 0) + 1;
  const hintsUsed = existingProgress?.hintsUsed ?? 0;
  const questXp = xpForQuest(quest.difficulty, quest.xp);
  const xpAwarded = run.passed && !alreadyCompleted ? questXp : 0;
  const mastery = run.passed ? masteryScore(attempts, hintsUsed) : (existingProgress?.mastery ?? 0);

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.submission.create({
      data: {
        userId,
        questId: quest.id,
        code: input.code,
        status,
        stdout: run.stdout.slice(0, 20_000),
        stderr: run.stderr.slice(0, 20_000),
        passedCount: run.passedCount,
        totalCount: run.totalCount,
        durationMs: run.durationMs,
        xpAwarded,
        verified,
      },
    });

    await tx.progress.upsert({
      where: { userId_questId: { userId, questId: quest.id } },
      update: {
        attempts,
        status: run.passed ? "COMPLETED" : "IN_PROGRESS",
        mastery,
        xpEarned: { increment: xpAwarded },
        completedAt: run.passed ? (existingProgress?.completedAt ?? now) : existingProgress?.completedAt ?? null,
      },
      create: {
        userId,
        questId: quest.id,
        attempts,
        status: run.passed ? "COMPLETED" : "IN_PROGRESS",
        mastery,
        xpEarned: xpAwarded,
        completedAt: run.passed ? now : null,
      },
    });

    if (xpAwarded > 0) {
      const totalXp = user.xp + xpAwarded;
      await tx.user.update({
        where: { id: userId },
        data: { xp: totalXp, level: levelFromXp(totalXp) },
      });
    }

    if (run.passed) {
      const streak = await tx.streak.findUnique({ where: { userId } });
      const next = advanceStreak(
        { current: streak?.current ?? 0, longest: streak?.longest ?? 0, lastActive: streak?.lastActive ?? null },
        now,
      );
      await tx.streak.upsert({
        where: { userId },
        update: { current: next.current, longest: next.longest, lastActive: next.lastActive },
        create: { userId, current: next.current, longest: next.longest, lastActive: next.lastActive },
      });
      await tx.mistake.updateMany({ where: { userId, questId: quest.id }, data: { resolved: true } });
    } else {
      const analysis = analyzeFailure({
        error: run.error,
        failedTestNames: run.results.filter((result) => !result.passed).map((result) => result.name),
        concept: quest.concept,
        hint: quest.hints[0],
      });
      await tx.mistake.upsert({
        where: { userId_questId_concept: { userId, questId: quest.id, concept: analysis.concept } },
        update: { error: analysis.error, correction: analysis.correction, retryCount: { increment: 1 }, resolved: false },
        create: {
          userId,
          questId: quest.id,
          error: analysis.error,
          concept: analysis.concept,
          correction: analysis.correction,
        },
      });
    }
  });

  const unlocked = await syncAchievements(userId);
  const refreshed = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xp: true, level: true, streak: { select: { current: true, lastActive: true, longest: true } } },
  });

  return {
    passed: run.passed,
    verified,
    status,
    xpAwarded: xpAwarded + unlocked.reduce((sum, item) => sum + item.xpReward, 0),
    totalXp: refreshed.xp,
    level: refreshed.level,
    leveledUp: refreshed.level > user.level,
    streak: refreshed.streak
      ? effectiveStreak({
          current: refreshed.streak.current,
          longest: refreshed.streak.longest,
          lastActive: refreshed.streak.lastActive,
        })
      : 0,
    alreadyCompleted,
    mastery,
    results: run.results,
    stdout: run.stdout,
    stderr: run.stderr,
    error: run.error,
    unlocked,
  };
}

/** Unlocks any achievement the user now qualifies for. Idempotent. */
export async function syncAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const [completed, bossCompleted, pythonTotal, pythonCompleted, projects, streak, owned] = await Promise.all([
    prisma.progress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.progress.count({ where: { userId, status: "COMPLETED", quest: { difficulty: "BOSS" } } }),
    prisma.quest.count({ where: { lesson: { module: { course: { slug: "python" } } } } }),
    prisma.progress.count({
      where: { userId, status: "COMPLETED", quest: { lesson: { module: { course: { slug: "python" } } } } },
    }),
    prisma.project.count({ where: { userId } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { code: true } } } }),
  ]);

  const earned = evaluateAchievements({
    completedQuests: completed,
    pythonCompleted,
    pythonTotal,
    bossCompleted,
    streak: streak
      ? effectiveStreak({ current: streak.current, longest: streak.longest, lastActive: streak.lastActive })
      : 0,
    projects,
  });

  const ownedCodes = new Set(owned.map((entry) => entry.achievement.code));
  const fresh = earned.filter((code) => !ownedCodes.has(code));
  if (fresh.length === 0) return [];

  const rows = await prisma.achievement.findMany({ where: { code: { in: fresh } } });
  const unlocked: UnlockedAchievement[] = [];

  for (const row of rows) {
    const created = await prisma.userAchievement.createMany({
      data: [{ userId, achievementId: row.id }],
      skipDuplicates: true,
    });
    if (created.count === 0) continue;
    if (row.xpReward > 0) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: row.xpReward } },
        select: { xp: true },
      });
      await prisma.user.update({ where: { id: userId }, data: { level: levelFromXp(user.xp) } });
    }
    const def = ACHIEVEMENT_BY_CODE.get(row.code);
    unlocked.push({ code: row.code, title: row.title, icon: row.icon, xpReward: def?.xpReward ?? row.xpReward });
  }

  return unlocked;
}

/** Marks a hint as used — it lowers the mastery score for that quest. */
export async function registerHintUse(userId: string, questId: string) {
  await prisma.progress.upsert({
    where: { userId_questId: { userId, questId } },
    update: { hintsUsed: { increment: 1 }, status: "IN_PROGRESS" },
    create: { userId, questId, hintsUsed: 1, status: "IN_PROGRESS" },
  });
}
