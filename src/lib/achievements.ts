import { prisma } from "@/lib/prisma";

/** Achievement keys and the check that unlocks them. Extend freely. */
const CHECKS: Record<string, (userId: string) => Promise<boolean>> = {
  first_quest: async (userId) => {
    const count = await prisma.progress.count({ where: { userId, completed: true } });
    return count >= 1;
  },
  streak_3: async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return (user?.streak ?? 0) >= 3;
  },
  streak_7: async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return (user?.streak ?? 0) >= 7;
  },
  level_5: async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return (user?.level ?? 0) >= 5;
  },
  ten_quests: async (userId) => {
    const count = await prisma.progress.count({ where: { userId, completed: true } });
    return count >= 10;
  },
  boss_slayer: async (userId) => {
    const count = await prisma.progress.count({
      where: { userId, completed: true, quest: { difficulty: "boss" } },
    });
    return count >= 1;
  },
};

export async function checkAndUnlockAchievements(userId: string) {
  const unlocked: string[] = [];
  const achievements = await prisma.achievement.findMany();
  const existing = await prisma.userAchievement.findMany({ where: { userId } });
  const existingIds = new Set(existing.map((e) => e.achievementId));

  for (const achievement of achievements) {
    if (existingIds.has(achievement.id)) continue;
    const check = CHECKS[achievement.key];
    if (!check) continue;
    if (await check(userId)) {
      await prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });
      unlocked.push(achievement.key);
    }
  }
  return unlocked;
}
