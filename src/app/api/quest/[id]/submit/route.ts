import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quests, progress, submissions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { pyRunResultSchema } from "@/lib/pyRunner/types";
import { runOnPiston } from "@/lib/pyRunner/piston";
import { logMistake } from "@/lib/game/weakTopics";
import { awardCompletion } from "@/lib/game/awardCompletion";
import { pickNextQuest } from "@/lib/game/nextQuest";

const bodySchema = z.object({
  code: z.string().min(1).max(20_000),
  clientResult: pyRunResultSchema,
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: questId } = await params;
  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }
  const { code, clientResult } = parsedBody.data;

  const quest = await db.query.quests.findFirst({
    where: eq(quests.id, questId),
    with: { lesson: { with: { module: { with: { course: true } } } } },
  });
  if (!quest || quest.type !== "code") {
    return NextResponse.json({ error: "Code quest not found." }, { status: 404 });
  }

  const questTests = quest.tests ?? [];
  // Never trust a client-fabricated result blindly: the reported test set must match the quest's real tests.
  const testCountMatches = clientResult.tests.length === questTests.length;
  const testNamesMatch = testCountMatches && clientResult.tests.every((t, i) => t.name === questTests[i].name);
  if (!testNamesMatch) {
    return NextResponse.json({ error: "Submitted result does not match this quest's tests." }, { status: 400 });
  }

  let result = clientResult;
  let verified: "client" | "server" = "client";
  const serverResult = await runOnPiston(code, questTests, quest.expectedStdout ?? undefined);
  if (serverResult) {
    result = serverResult;
    verified = "server";
  }

  const passed = !result.timedOut && result.error === null && result.expectedOk && result.tests.every((t) => t.passed);

  const existingProgress = await db.query.progress.findFirst({ where: and(eq(progress.userId, user.id), eq(progress.questId, questId)) });
  const attempts = (existingProgress?.attempts ?? 0) + 1;
  const hintsUsed = existingProgress?.hintsUsed ?? 0;

  await db.insert(submissions).values({
    userId: user.id,
    questId,
    kind: "code",
    passed,
    verified,
    stdout: result.stdout,
    errorType: result.error?.type,
    errorMessage: result.error?.message,
    errorLine: result.error?.line ?? undefined,
    hintsUsed,
  });

  let completion = null;
  let nextQuestId: string | null = null;

  if (passed) {
    completion = await awardCompletion({ userId: user.id, questId, xpReward: quest.xp, attempts, hintsUsed });
    nextQuestId = await pickNextQuest(user.id, questId, completion.mastery);
  } else {
    if (existingProgress) {
      await db.update(progress).set({ attempts }).where(eq(progress.id, existingProgress.id));
    } else {
      await db.insert(progress).values({ userId: user.id, questId, attempts });
    }

    const kind = result.timedOut ? "infinite-loop" : result.error ? result.error.type : "wrong-output";
    const topic = quest.lesson.module.course.title;
    await logMistake(user.id, topic, kind, result.error?.message ?? "Output did not match the expected tests.");
  }

  return NextResponse.json({
    passed,
    result,
    verified,
    attempts,
    xpAwarded: completion?.xpAwarded ?? 0,
    mastery: completion?.mastery ?? null,
    level: completion?.level ?? null,
    streak: completion?.streak ?? null,
    unlockedAchievements: completion?.unlockedAchievements ?? [],
    nextQuestId,
  });
}
