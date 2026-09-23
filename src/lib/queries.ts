import { prisma } from "@/lib/prisma";

export async function getCoursesWithProgress(userId: string) {
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { quests: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  const progress = await prisma.progress.findMany({ where: { userId, completed: true } });
  const completedQuestIds = new Set(progress.map((p) => p.questId));

  return courses.map((course) => {
    const quests = course.modules.flatMap((m) => m.lessons.flatMap((l) => l.quests));
    const completedQuests = quests.filter((q) => completedQuestIds.has(q.id)).length;
    return { ...course, totalQuests: quests.length, completedQuests };
  });
}

/** First quest (in course/module/lesson/quest order) the user hasn't completed yet. */
export async function getCurrentQuest(userId: string) {
  const quests = await prisma.quest.findMany({
    orderBy: [
      { lesson: { module: { course: { order: "asc" } } } },
      { lesson: { module: { order: "asc" } } },
      { lesson: { order: "asc" } },
      { order: "asc" },
    ],
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });

  const progress = await prisma.progress.findMany({ where: { userId, completed: true } });
  const completedQuestIds = new Set(progress.map((p) => p.questId));

  return quests.find((q) => !completedQuestIds.has(q.id)) ?? null;
}

export async function getWeakTopics(userId: string, limit = 5) {
  return prisma.mistake.findMany({
    where: { userId },
    orderBy: { count: "desc" },
    take: limit,
  });
}

export async function getAchievementsWithStatus(userId: string) {
  const [all, unlocked] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  return all.map((a) => ({ ...a, unlocked: unlockedIds.has(a.id) }));
}

export async function getQuestStats(userId: string) {
  const [totalQuests, completed] = await Promise.all([
    prisma.quest.count(),
    prisma.progress.count({ where: { userId, completed: true } }),
  ]);
  return { totalQuests, completed };
}
