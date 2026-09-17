import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCourseBySlugOrId } from "@/server/quests";
import { getProgressByQuest } from "@/server/stats";
import { Badge, Card, DifficultyBadge, ProgressBar } from "@/components/ui";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await requireUser(`/courses/${courseId}`);
  const course = await getCourseBySlugOrId(courseId);
  if (!course) notFound();

  const progress = await getProgressByQuest(user.id);
  const allQuests = course.modules.flatMap((m) => m.lessons.flatMap((l) => l.quests));
  const completed = allQuests.filter((quest) => progress.get(quest.id)?.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/courses" className="text-xs text-ink-muted hover:text-ink">
          ← All courses
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black">
          <span aria-hidden>{course.icon}</span>
          {course.title}
        </h1>
        <p className="text-sm text-ink-muted">{course.description}</p>
        <ProgressBar percent={allQuests.length ? (completed / allQuests.length) * 100 : 0} className="mt-3 max-w-md" />
        <p className="mt-1 text-xs text-ink-muted">
          {completed}/{allQuests.length} quests cleared
        </p>
      </header>

      <div className="space-y-6">
        {course.modules.map((courseModule) => (
          <section key={courseModule.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-bold">{courseModule.title}</h2>
              <p className="text-sm text-ink-muted">{courseModule.description}</p>
            </div>

            {courseModule.lessons.map((lesson) => (
              <Card key={lesson.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/lesson/${lesson.id}`} className="font-bold hover:text-accent-soft">
                      {lesson.title}
                    </Link>
                    <p className="text-sm text-ink-muted">{lesson.summary}</p>
                  </div>
                  <Badge>{lesson.quests.length} quests</Badge>
                </div>

                <ul className="mt-3 space-y-2">
                  {lesson.quests.map((quest) => {
                    const state = progress.get(quest.id);
                    return (
                      <li key={quest.id}>
                        <Link
                          href={`/quest/${quest.id}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-line/60 bg-surface/50 px-3 py-2 text-sm hover:border-accent/60"
                        >
                          <span aria-hidden>{state?.status === "COMPLETED" ? "✅" : "⬜"}</span>
                          <span className="font-medium">{quest.title}</span>
                          <DifficultyBadge difficulty={quest.difficulty} />
                          <span className="ml-auto text-xs text-xp">+{quest.xp} XP</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
