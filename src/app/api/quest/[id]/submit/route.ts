import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";
import { gradeQuest } from "@/lib/sandbox";
import { awardXp } from "@/lib/xp";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { getRuleBasedTutorReply } from "@/lib/tutor";

const MAX_CODE_LENGTH = 20_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: questId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("code" in body)) {
    return NextResponse.json({ error: "Missing 'code' field." }, { status: 400 });
  }
  const { code } = body as { code: unknown };
  if (typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json({ error: "'code' must be a non-empty string." }, { status: 400 });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: "Code is too long." }, { status: 400 });
  }

  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    include: { questions: true, lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!quest) {
    return NextResponse.json({ error: "Quest not found." }, { status: 404 });
  }

  const user = await getOrCreateDemoUser();

  const outcomes = await gradeQuest(
    code,
    quest.questions.map((q) => ({ id: q.id, prompt: q.prompt, testCode: q.testCode, hint: q.hint }))
  );
  const passed = outcomes.length > 0 && outcomes.every((o) => o.passed);

  await prisma.submission.create({
    data: {
      userId: user.id,
      questId: quest.id,
      code,
      passed,
      output: JSON.stringify(outcomes),
    },
  });

  const existingProgress = await prisma.progress.findUnique({
    where: { userId_questId: { userId: user.id, questId: quest.id } },
  });
  const wasAlreadyCompleted = existingProgress?.completed ?? false;

  const attempts = (existingProgress?.attempts ?? 0) + 1;
  const mastery = passed ? 100 : Math.max(0, (existingProgress?.mastery ?? 0) - 5);

  await prisma.progress.upsert({
    where: { userId_questId: { userId: user.id, questId: quest.id } },
    update: { attempts, mastery, completed: passed || wasAlreadyCompleted },
    create: { userId: user.id, questId: quest.id, attempts, mastery, completed: passed },
  });

  let updatedUser = user;
  let xpAwarded = 0;
  if (passed && !wasAlreadyCompleted) {
    xpAwarded = quest.xpReward;
    updatedUser = await awardXp(user, xpAwarded);
  }

  const firstFail = outcomes.find((o) => !o.passed);
  if (!passed && firstFail) {
    const topic = quest.title;
    const existingMistake = await prisma.mistake.findFirst({ where: { userId: user.id, topic } });
    if (existingMistake) {
      await prisma.mistake.update({
        where: { id: existingMistake.id },
        data: { count: existingMistake.count + 1, detail: firstFail.message },
      });
    } else {
      await prisma.mistake.create({
        data: { userId: user.id, topic, detail: firstFail.message },
      });
    }
  }

  const unlockedAchievements = passed ? await checkAndUnlockAchievements(user.id) : [];

  let nextQuestId: string | null = null;
  if (passed) {
    const allQuests = await prisma.quest.findMany({
      orderBy: [
        { lesson: { module: { course: { order: "asc" } } } },
        { lesson: { module: { order: "asc" } } },
        { lesson: { order: "asc" } },
        { order: "asc" },
      ],
      select: { id: true },
    });
    const idx = allQuests.findIndex((q) => q.id === quest.id);
    nextQuestId = idx >= 0 && idx < allQuests.length - 1 ? allQuests[idx + 1].id : null;
  }

  const tutor = passed
    ? getRuleBasedTutorReply({ mode: "review", topic: quest.title })
    : getRuleBasedTutorReply({
        mode: "debug",
        topic: quest.title,
        errorOutput: firstFail?.message,
        hint: quest.questions.find((q) => q.id === firstFail?.id)?.hint,
        attempts,
      });

  return NextResponse.json({
    outcomes,
    passed,
    xpAwarded,
    attempts,
    mastery,
    user: { level: updatedUser.level, xp: updatedUser.xp, xpToNext: updatedUser.xpToNext, streak: updatedUser.streak },
    unlockedAchievements,
    nextQuestId,
    tutorMessage: tutor.message,
  });
}
