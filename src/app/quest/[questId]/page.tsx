import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { levelProgress } from "@/lib/xp";
import { effectiveStreak } from "@/lib/streak";
import { getAdjacentQuests, getQuest, toClientTestSpecs } from "@/server/quests";
import { serverVerificationEnabled } from "@/server/sandbox";
import { QuestWorkspace } from "@/components/quest-workspace";

export default async function QuestPage({ params }: { params: Promise<{ questId: string }> }) {
  const { questId } = await params;
  const user = await requireUser(`/quest/${questId}`);
  const quest = await getQuest(questId);
  if (!quest) notFound();

  const [player, progress, lastSubmission, streak, adjacent] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { xp: true, level: true } }),
    prisma.progress.findUnique({ where: { userId_questId: { userId: user.id, questId } } }),
    prisma.submission.findFirst({
      where: { userId: user.id, questId },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    getAdjacentQuests(questId),
  ]);

  const level = levelProgress(player.xp);

  return (
    <QuestWorkspace
      quest={{
        id: quest.id,
        title: quest.title,
        description: quest.description,
        difficulty: quest.difficulty,
        concept: quest.concept,
        instructions: quest.instructions,
        starterCode: quest.starterCode,
        expectedBehavior: quest.expectedBehavior,
        xp: quest.xp,
        hintCount: quest.hints.length,
        lessonId: quest.lessonId,
        lessonTitle: quest.lesson.title,
        courseTitle: quest.lesson.module.course.title,
      }}
      tests={toClientTestSpecs(quest.testCases)}
      initialCode={lastSubmission?.code ?? quest.starterCode}
      player={{
        level: level.level,
        xp: level.xp,
        percent: level.percent,
        xpToNextLevel: level.xpToNextLevel,
        streak: streak
          ? effectiveStreak({ current: streak.current, longest: streak.longest, lastActive: streak.lastActive })
          : 0,
        completed: progress?.status === "COMPLETED",
        attempts: progress?.attempts ?? 0,
      }}
      nextQuestId={adjacent.next?.id ?? null}
      serverVerified={serverVerificationEnabled}
    />
  );
}
