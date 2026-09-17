import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getProfile } from "@/server/stats";
import { ProfileForm } from "@/components/forms/profile-form";
import { Badge, Card, ProgressBar, SectionTitle, Stat } from "@/components/ui";

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const data = await getProfile(user.id);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-black">{data.user.profile?.displayName ?? data.user.username}</h1>
          <p className="text-sm text-ink-muted">
            @{data.user.username} · {data.user.email} · joined {data.user.createdAt.toISOString().slice(0, 10)}
            {data.user.role === "ADMIN" ? " · admin" : ""}
          </p>
          <ProgressBar percent={data.progress.percent} className="mt-3 max-w-md" />
          <p className="mt-1 text-xs text-ink-muted">
            Level {data.progress.level} · {data.user.xp} XP · {data.progress.xpToNextLevel} XP to next level
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Streak" value={`🔥 ${data.streak?.current ?? 0}`} hint={`Longest ${data.streak?.longest ?? 0}`} />
          <Stat label="Achievements" value={data.achievements.length} />
          <Stat label="Open mistakes" value={data.mistakes.filter((m) => !m.resolved).length} />
        </div>

        <section>
          <SectionTitle title="Mistake log" subtitle="Every failure becomes a note you can review before exams." />
          {data.mistakes.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-muted">No mistakes recorded yet.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {data.mistakes.map((mistake) => (
                <li key={mistake.id} className="rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={mistake.resolved ? "text-success" : "text-danger"}>{mistake.concept}</Badge>
                    <Link href={`/quest/${mistake.quest.id}`} className="text-sm font-medium hover:text-accent-soft">
                      {mistake.quest.title}
                    </Link>
                    <span className="ml-auto text-xs text-ink-muted">
                      ×{mistake.retryCount} {mistake.resolved ? "· fixed" : ""}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink-muted">{mistake.error}</p>
                  <p className="mt-1 text-xs text-ink-muted">{mistake.correction}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle title="Recent submissions" />
          <ul className="space-y-2">
            {data.submissions.map((submission) => (
              <li
                key={submission.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2 text-sm"
              >
                <span aria-hidden>{submission.status === "PASSED" ? "✅" : "❌"}</span>
                <Link href={`/quest/${submission.quest.id}`} className="font-medium hover:text-accent-soft">
                  {submission.quest.title}
                </Link>
                <span className="ml-auto text-xs text-ink-muted">
                  {submission.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <ProfileForm
          profile={{
            displayName: data.user.profile?.displayName ?? data.user.username,
            bio: data.user.profile?.bio ?? "",
            goal: data.user.profile?.goal ?? "",
            avatarUrl: data.user.profile?.avatarUrl ?? "",
          }}
        />
        <Card>
          <h2 className="font-bold">Mastery</h2>
          <ul className="mt-2 space-y-2">
            {data.mastery.map((course) => (
              <li key={course.id}>
                <div className="flex items-center justify-between text-xs">
                  <span>
                    {course.icon} {course.title}
                  </span>
                  <span className="text-ink-muted">
                    {course.completed}/{course.total}
                  </span>
                </div>
                <ProgressBar percent={course.percent} className="mt-1" />
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
