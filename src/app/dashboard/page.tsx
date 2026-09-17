import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDashboard } from "@/server/stats";
import { Badge, Card, DifficultyBadge, EmptyState, LinkButton, ProgressBar, SectionTitle, Stat } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const data = await getDashboard(user.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            Welcome back, {data.user.profile?.displayName ?? data.user.username}
          </h1>
          <p className="text-sm text-ink-muted">
            Level {data.progress.level} · {data.progress.xpToNextLevel} XP to level {data.progress.level + 1}
          </p>
          <ProgressBar percent={data.progress.percent} className="mt-2 w-64" />
        </div>
        {data.nextQuest ? (
          <LinkButton href={`/quest/${data.nextQuest.id}`}>Continue: {data.nextQuest.title}</LinkButton>
        ) : (
          <LinkButton href="/courses" variant="secondary">
            Browse courses
          </LinkButton>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="XP" value={data.user.xp} hint={`Level ${data.progress.level}`} />
        <Stat label="Streak" value={`🔥 ${data.streak}`} hint={`Longest ${data.longestStreak} days`} />
        <Stat label="Quests cleared" value={data.completedCount} hint={`${data.failedCount} failed attempts`} />
        <Stat label="Achievements" value={data.achievements.length} hint="Unlocked badges" />
      </div>

      <section>
        <SectionTitle title="Mastery by course" subtitle="Completion and how cleanly you cleared each quest." />
        <div className="grid gap-3 sm:grid-cols-2">
          {data.mastery.map((course) => (
            <Card key={course.id}>
              <div className="flex items-center gap-2">
                <span aria-hidden>{course.icon}</span>
                <Link href={`/courses/${course.id}`} className="font-semibold hover:text-accent-soft">
                  {course.title}
                </Link>
                <span className="ml-auto text-xs text-ink-muted">
                  {course.completed}/{course.total}
                </span>
              </div>
              <ProgressBar percent={course.percent} className="mt-2" />
              {course.completed > 0 ? <p className="mt-1 text-xs text-ink-muted">Mastery {course.mastery}%</p> : null}
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionTitle title="Recent runs" />
          {data.recent.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              body="Clear your first quest to start the streak."
              action={data.nextQuest ? <LinkButton href={`/quest/${data.nextQuest.id}`}>Start quest</LinkButton> : undefined}
            />
          ) : (
            <ul className="space-y-2">
              {data.recent.map((submission) => (
                <li key={submission.id}>
                  <Link
                    href={`/quest/${submission.quest.id}`}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2 text-sm hover:border-accent/60"
                  >
                    <span aria-hidden>{submission.status === "PASSED" ? "✅" : "❌"}</span>
                    <span className="font-medium">{submission.quest.title}</span>
                    <DifficultyBadge difficulty={submission.quest.difficulty} />
                    <span className="ml-auto text-xs text-ink-muted">
                      {submission.passedCount}/{submission.totalCount} tests
                      {submission.xpAwarded > 0 ? ` · +${submission.xpAwarded} XP` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle title="Weak spots" subtitle="Mistakes worth one more rep." />
          {data.mistakes.length === 0 ? (
            <EmptyState title="Nothing to fix" body="No unresolved mistakes — keep going." />
          ) : (
            <ul className="space-y-2">
              {data.mistakes.map((mistake) => (
                <li key={mistake.id} className="rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="text-danger">{mistake.concept}</Badge>
                    <Link href={`/quest/${mistake.quest.id}`} className="text-sm font-medium hover:text-accent-soft">
                      {mistake.quest.title}
                    </Link>
                    <span className="ml-auto text-xs text-ink-muted">×{mistake.retryCount}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink-muted">{mistake.error}</p>
                  <p className="mt-1 text-xs text-ink-muted">{mistake.correction}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
