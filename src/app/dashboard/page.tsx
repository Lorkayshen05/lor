import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Trophy, Swords, ArrowRight, AlertTriangle } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeLevel } from "@/lib/game/xp";
import { getWeakTopics } from "@/lib/game/weakTopics";
import { getCurrentQuest, getAchievementsWithStatus, getQuestStats } from "@/lib/queries";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { AchievementBadge } from "@/components/game/AchievementBadge";

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const [user, streak, currentQuest, weakTopics, achievements, questStats] = await Promise.all([
    db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, sessionUser.id) }),
    db.query.streaks.findFirst({ where: eq(streaks.userId, sessionUser.id) }),
    getCurrentQuest(sessionUser.id),
    getWeakTopics(sessionUser.id),
    getAchievementsWithStatus(sessionUser.id),
    getQuestStats(sessionUser.id),
  ]);

  const level = computeLevel(user?.xp ?? 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {sessionUser.name}</h1>
        <p className="text-sm text-muted">Here&apos;s where your quest stands today.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Swords className="h-4 w-4" />} label="Level" value={level.level} />
        <StatTile icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak?.current ?? 0}d`} accent="text-xp" />
        <StatTile icon={<Trophy className="h-4 w-4" />} label="Quests Done" value={`${questStats.completed}/${questStats.totalQuests}`} />
        <StatTile icon={<AlertTriangle className="h-4 w-4" />} label="Weak Topics" value={weakTopics.length} accent="text-danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={`Level ${level.level}`} subtitle="Experience Points" />
            <ProgressBar value={level.xpIntoLevel} max={level.xpToNextLevel} color="xp" label="XP" />
          </Card>

          <Card>
            <CardHeader title="Current Quest" subtitle="Pick up right where you left off" />
            {currentQuest ? (
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="font-medium text-foreground">{currentQuest.title}</h4>
                  <DifficultyTag difficulty={currentQuest.difficulty} />
                </div>
                <p className="mb-3 text-sm text-muted">{currentQuest.description}</p>
                <Link href={`/quest/${currentQuest.id}`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2">
                  Continue Quest <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">You&apos;ve cleared every quest — nice work! Check back for more soon.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Weak Topics" subtitle="Mistakes and low mastery worth reviewing" />
            {weakTopics.length === 0 ? (
              <p className="text-sm text-muted">No weak topics tracked yet. Keep questing!</p>
            ) : (
              <ul className="space-y-2">
                {weakTopics.map((w) => (
                  <li key={w.topic} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{w.topic}</span>
                      <span className="text-xs text-danger">{w.reason === "repeated_mistake" ? "repeated mistake" : "low mastery"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{w.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Achievements" right={<Link href="/profile" className="text-xs text-primary">View all</Link>} />
            <div className="grid grid-cols-2 gap-2">
              {achievements.slice(0, 4).map((a) => (
                <AchievementBadge key={a.id} icon={a.icon} title={a.title} description={a.description} unlocked={a.unlocked} />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Links" />
            <div className="grid gap-2">
              <Link href="/courses" className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/50">Browse Courses</Link>
              <Link href="/english" className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/50">English Practice</Link>
              <Link href="/cgpa" className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/50">CGPA Tracker</Link>
              <Link href="/projects" className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/50">Projects</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
