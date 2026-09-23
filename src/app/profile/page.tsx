import { Flame, Trophy, Swords } from "lucide-react";
import { getOrCreateDemoUser } from "@/lib/user";
import { getCoursesWithProgress, getAchievementsWithStatus, getQuestStats } from "@/lib/queries";
import { xpToNextLevel } from "@/lib/xp";
import { Card, CardHeader } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { StatTile } from "@/components/StatTile";
import { AchievementBadge } from "@/components/AchievementBadge";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getOrCreateDemoUser();
  const [courses, achievements, questStats] = await Promise.all([
    getCoursesWithProgress(user.id),
    getAchievementsWithStatus(user.id),
    getQuestStats(user.id),
  ]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-bold text-primary">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Swords className="h-4 w-4" />} label="Level" value={user.level} />
        <StatTile icon={<Flame className="h-4 w-4" />} label="Streak" value={`${user.streak}d`} accent="text-xp" />
        <StatTile icon={<Trophy className="h-4 w-4" />} label="Quests Done" value={`${questStats.completed}/${questStats.totalQuests}`} />
        <StatTile icon={<Icon name="star" className="h-4 w-4" />} label="Achievements" value={`${unlockedCount}/${achievements.length}`} accent="text-xp" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Level ${user.level}`} subtitle="Experience Points" />
          <ProgressBar value={user.xp} max={xpToNextLevel(user.level)} color="xp" label="XP" />
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
