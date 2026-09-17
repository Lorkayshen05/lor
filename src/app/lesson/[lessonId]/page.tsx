import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getLesson } from "@/server/quests";
import { getProgressByQuest } from "@/server/stats";
import { Badge, Card, DifficultyBadge, LinkButton } from "@/components/ui";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const user = await requireUser(`/lesson/${lessonId}`);
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();

  const progress = await getProgressByQuest(user.id);

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/courses/${lesson.module.course.id}`} className="text-xs text-ink-muted hover:text-ink">
          ← {lesson.module.course.title} · {lesson.module.title}
        </Link>
        <h1 className="mt-1 text-2xl font-black">{lesson.title}</h1>
        <p className="text-sm text-ink-muted">{lesson.summary}</p>
      </div>

      <Card>
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Concept</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{lesson.content}</p>
      </Card>

      <div className="space-y-3">
        {lesson.quests.map((quest) => {
          const state = progress.get(quest.id);
          return (
            <Card key={quest.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={quest.difficulty} />
                  <Badge className="text-xp">+{quest.xp} XP</Badge>
                  {state?.status === "COMPLETED" ? <Badge className="text-success">cleared</Badge> : null}
                  {state && state.status !== "COMPLETED" ? <Badge>{state.attempts} attempts</Badge> : null}
                </div>
                <p className="mt-2 font-bold">{quest.title}</p>
                <p className="text-sm text-ink-muted">{quest.description}</p>
              </div>
              <LinkButton href={`/quest/${quest.id}`} variant={state?.status === "COMPLETED" ? "secondary" : "primary"}>
                {state?.status === "COMPLETED" ? "Replay" : "Start quest"}
              </LinkButton>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
