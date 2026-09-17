import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui";

export default async function AchievementsPage() {
  const user = await requireUser("/achievements");
  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { xpReward: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId: user.id }, select: { achievementId: true, unlockedAt: true } }),
  ]);

  const unlockedMap = new Map(unlocked.map((entry) => [entry.achievementId, entry.unlockedAt]));

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Achievements"
        subtitle={`${unlocked.length}/${achievements.length} unlocked`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement) => {
          const at = unlockedMap.get(achievement.id);
          return (
            <Card key={achievement.id} className={at ? "border-xp/50" : "opacity-60"}>
              <p className="text-3xl" aria-hidden>
                {achievement.icon}
              </p>
              <p className="mt-2 font-bold">{achievement.title}</p>
              <p className="text-sm text-ink-muted">{achievement.description}</p>
              <p className="mt-2 text-xs text-xp">
                +{achievement.xpReward} XP · {at ? `unlocked ${at.toISOString().slice(0, 10)}` : "locked"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
