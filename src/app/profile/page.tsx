import { redirect } from "next/navigation";
import { Flame, Trophy, Swords } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeLevel } from "@/lib/game/xp";
import { getCoursesWithProgress, getAchievementsWithStatus, getQuestStats } from "@/lib/queries";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";
import { Icon } from "@/components/ui/Icon";
import { AchievementBadge } from "@/components/game/AchievementBadge";

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const [user, streak, courses, achievements, questStats] = await Promise.all([
    db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, sessionUser.id) }),
    db.query.streaks.findFirst({ where: eq(streaks.userId, sessionUser.id) }),
    getCoursesWithProgress(sessionUser.id),
    getAchievementsWithStatus(sessionUser.id),
    getQuestStats(sessionUser.id),
  ]);

  const level = computeLevel(user?.xp ?? 0);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
          {sessionUser.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{sessionUser.name}</h1>
          <p className="text-sm text-muted">{sessionUser.email}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Swords className="h-4 w-4" />} label="Level" value={level.level} />
        <StatTile icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak?.current ?? 0}d`} accent="text-xp" />
        <StatTile icon={<Trophy className="h-4 w-4" />} label="Quests Done" value={`${questStats.completed}/${questStats.totalQuests}`} />
        <StatTile icon={<Icon name="star" className="h-4 w-4" />} label="Achievements" value={`${unlockedCount}/${achievements.length}`} accent="text-xp" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Level ${level.level}`} subtitle="Experience Points" />
          <ProgressBar value={level.xpIntoLevel} max={level.xpToNextLevel} color="xp" label="XP" />
          <p className="mt-3 text-xs text-muted">{level.xpToNextLevel - level.xpIntoLevel} XP to Level {level.level + 1}.</p>
        </Card>

        <Card>
          <CardHeader title="Skills" subtitle="Progress per course" />
          <div className="space-y-3">
            {courses.map((c) => (
              <ProgressBar key={c.id} value={c.completedQuests} max={Math.max(c.totalQuests, 1)} label={c.title} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Achievements" />
        <div className="grid gap-2 sm:grid-cols-2">
          {achievements.map((a) => (
            <AchievementBadge key={a.id} icon={a.icon} title={a.title} description={a.description} unlocked={a.unlocked} />
          ))}
        </div>
      </Card>
    </div>
  );
}
