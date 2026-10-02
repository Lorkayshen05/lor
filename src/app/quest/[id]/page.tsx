import { notFound, redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quests, progress } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { CodeQuestWorkspace } from "@/components/quest/CodeQuestWorkspace";
import { QuizQuestWorkspace } from "@/components/quest/QuizQuestWorkspace";
import { toClientVariant } from "@/lib/quiz";

export default async function QuestPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const { id } = await params;
  const quest = await db.query.quests.findFirst({
    where: eq(quests.id, id),
    with: { questions: { orderBy: (q, { asc }) => asc(q.slotIndex) }, lesson: { with: { module: { with: { course: true } } } } },
  });
  if (!quest) notFound();

  const existingProgress = await db.query.progress.findFirst({ where: and(eq(progress.userId, sessionUser.id), eq(progress.questId, quest.id)) });
  const topic = quest.lesson.module.course.title;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs text-muted">{topic}</p>
          <h1 className="text-2xl font-bold text-foreground">{quest.title}</h1>
        </div>
        <DifficultyTag difficulty={quest.difficulty} />
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Instructions</h2>
        <p className="whitespace-pre-wrap text-sm text-muted">{quest.description}</p>
        <p className="mt-3 text-xs text-muted">
          Reward: <span className="font-semibold text-xp">+{quest.xp} XP</span>
          {existingProgress && ` · Attempts so far: ${existingProgress.attempts}`}
        </p>
      </div>

      {quest.type === "code" ? (
        <CodeQuestWorkspace
          questId={quest.id}
          title={quest.title}
          topic={topic}
          starterCode={quest.starterCode ?? ""}
          expectedStdout={quest.expectedStdout ?? undefined}
          tests={quest.tests ?? []}
          totalHints={quest.hints?.length ?? 0}
        />
      ) : (
        <QuizQuestWorkspace questId={quest.id} title={quest.title} topic={topic} slots={quest.questions.map((q) => toClientVariant(q.variants[0]))} />
      )}
    </div>
  );
}
