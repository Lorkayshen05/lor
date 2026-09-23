import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";
import { QuestWorkspace } from "@/components/QuestWorkspace";
import { AiTutorPanel } from "@/components/AiTutorPanel";

export const dynamic = "force-dynamic";

export default async function QuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateDemoUser();

  const quest = await prisma.quest.findUnique({
    where: { id },
    include: { questions: true },
  });
  if (!quest) notFound();

  const progress = await prisma.progress.findUnique({
    where: { userId_questId: { userId: user.id, questId: quest.id } },
  });

  const lastSubmission = await prisma.submission.findFirst({
    where: { userId: user.id, questId: quest.id },
    orderBy: { createdAt: "desc" },
  });

  const questionsView = quest.questions.map((q) => ({ id: q.id, prompt: q.prompt, hint: q.hint }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <QuestWorkspace
        questId={quest.id}
        title={quest.title}
        description={quest.description}
        difficulty={quest.difficulty}
        starterCode={lastSubmission?.code || quest.starterCode}
        xpReward={quest.xpReward}
        questions={questionsView}
        initialAttempts={progress?.attempts ?? 0}
      />
      <div className="px-4 pb-8 lg:py-8 lg:pl-0 lg:pr-6">
        <div className="h-[600px] lg:sticky lg:top-20">
          <AiTutorPanel topic={quest.title} hint={quest.questions[0]?.hint} attempts={progress?.attempts ?? 0} />
        </div>
      </div>
    </div>
  );
}
