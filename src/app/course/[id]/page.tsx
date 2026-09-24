import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, progress } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QuestListItem } from "@/components/game/QuestListItem";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const { id } = await params;
  const course = await db.query.courses.findFirst({
    where: eq(courses.slug, id),
    with: {
      modules: {
        orderBy: (m, { asc }) => asc(m.order),
        with: { lessons: { orderBy: (l, { asc }) => asc(l.order), with: { quests: { orderBy: (q, { asc }) => asc(q.order) } } } },
      },
    },
  });
  if (!course) notFound();

  const progressRows = await db.query.progress.findMany({ where: eq(progress.userId, sessionUser.id) });
  const progressByQuest = new Map(progressRows.map((p) => [p.questId, p]));

  const allQuests = course.modules.flatMap((m) => m.lessons.flatMap((l) => l.quests));
  const completedCount = allQuests.filter((q) => progressByQuest.get(q.id)?.completed).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

      <div className="space-y-6">
        {course.modules.map((module) => (
          <div key={module.id}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">{module.title}</h2>
            {module.lessons.map((lesson) => (
              <details key={lesson.id} className="group mb-3 rounded-xl border border-border bg-surface open:bg-surface" open>
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
                  {lesson.title}
                </summary>
                <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                  {lesson.quests.map((quest) => {
                    const p = progressByQuest.get(quest.id);
                    return (
                      <QuestListItem
                        key={quest.id}
                        id={quest.id}
                        title={quest.title}
                        description={quest.description}
                        difficulty={quest.difficulty}
                        completed={p?.completed ?? false}
                        mastery={p?.completed ? p.mastery : null}
                      />
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
