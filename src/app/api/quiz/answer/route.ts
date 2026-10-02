import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quests, progress } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { toClientVariant } from "@/lib/quiz";
import { logMistake } from "@/lib/game/weakTopics";
import { awardCompletion } from "@/lib/game/awardCompletion";
import { pickNextQuest } from "@/lib/game/nextQuest";

const bodySchema = z.object({
  questId: z.string().min(1),
  slotIndex: z.number().int().min(0),
  variantIndex: z.union([z.literal(0), z.literal(1)]),
  optionIndex: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const { questId, slotIndex, variantIndex, optionIndex } = parsed.data;

  const quest = await db.query.quests.findFirst({
    where: eq(quests.id, questId),
    with: { questions: true, lesson: { with: { module: { with: { course: true } } } } },
  });
  if (!quest || quest.type !== "quiz") return NextResponse.json({ error: "Quiz quest not found." }, { status: 404 });

  const slot = quest.questions.find((q) => q.slotIndex === slotIndex);
  const variant = slot?.variants[variantIndex];
  const option = variant?.options[optionIndex];
  if (!slot || !variant || !option) return NextResponse.json({ error: "Invalid slot/variant/option." }, { status: 400 });

  const existing = await db.query.progress.findFirst({ where: and(eq(progress.userId, user.id), eq(progress.questId, questId)) });
  const attempts = (existing?.attempts ?? 0) + 1;

  if (!option.correct) {
    if (existing) {
      await db.update(progress).set({ attempts }).where(eq(progress.id, existing.id));
    } else {
      await db.insert(progress).values({ userId: user.id, questId, attempts });
    }
    await logMistake(user.id, quest.lesson.module.course.title, "quiz-wrong-answer", option.feedback);

    const retryVariantIndex = variantIndex === 0 ? 1 : 0;
    const retryVariant = slot.variants[retryVariantIndex];
    return NextResponse.json({
      correct: false,
      feedback: option.feedback,
      rule: variant.rule,
      retry: { variantIndex: retryVariantIndex, ...toClientVariant(retryVariant) },
    });
  }

  const solvedSlots = new Set(existing?.quizSlotsSolved ?? []);
  solvedSlots.add(slotIndex);
  const allSlotsSolved = solvedSlots.size >= quest.questions.length;

  if (existing) {
    await db.update(progress).set({ attempts, quizSlotsSolved: [...solvedSlots] }).where(eq(progress.id, existing.id));
  } else {
    await db.insert(progress).values({ userId: user.id, questId, attempts, quizSlotsSolved: [...solvedSlots] });
  }

  let completion = null;
  let nextQuestId: string | null = null;
  if (allSlotsSolved) {
    completion = await awardCompletion({ userId: user.id, questId, xpReward: quest.xp, attempts, hintsUsed: existing?.hintsUsed ?? 0 });
    nextQuestId = await pickNextQuest(user.id, questId, completion.mastery);
  }

  return NextResponse.json({
    correct: true,
    feedback: option.feedback,
    rule: variant.rule,
    allSlotsSolved,
    slotsSolved: [...solvedSlots],
    totalSlots: quest.questions.length,
    xpAwarded: completion?.xpAwarded ?? 0,
    mastery: completion?.mastery ?? null,
    level: completion?.level ?? null,
    streak: completion?.streak ?? null,
    unlockedAchievements: completion?.unlockedAchievements ?? [],
    nextQuestId,
  });
}
