import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";
import { Icon } from "@/components/Icon";
import { ProgressBar } from "@/components/ProgressBar";
import { QuestCard } from "@/components/QuestCard";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateDemoUser();

  const course = await prisma.course.findUnique({
    where: { slug: id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { quests: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const progress = await prisma.progress.findMany({ where: { userId: user.id, completed: true } });
  const completedQuestIds = new Set(progress.map((p) => p.questId));

  const allQuests = course.modules.flatMap((m) => m.lessons.flatMap((l) => l.quests));
  const completedCount = allQuests.filter((q) => completedQuestIds.has(q.id)).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon name={course.icon} className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted">{course.description}</p>
        </div>
      </div>

      <div className="mb-8">
        <ProgressBar value={completedCount} max={Math.max(allQuests.length, 1)} color="success" label="Course Progress" />
      </div>

      <div className="space-y-8">
        {course.modules.map((module) => (
          <div key={module.id}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">{module.title}</h2>
            {module.lessons.map((lesson) => (
              <div key={lesson.id} className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-muted">{lesson.title}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lesson.quests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      id={quest.id}
                      title={quest.title}
                      description={quest.description}
                      difficulty={quest.difficulty}
                      completed={completedQuestIds.has(quest.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
