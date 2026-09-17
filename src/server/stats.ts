import "server-only";
import { prisma } from "@/lib/prisma";
import { effectiveStreak } from "@/lib/streak";
import { levelProgress } from "@/lib/xp";

export async function getProgressByQuest(userId: string) {
  const rows = await prisma.progress.findMany({
    where: { userId },
    select: { questId: true, status: true, attempts: true, mastery: true },
  });
  return new Map(rows.map((row) => [row.questId, row]));
}

export async function getCourseMastery(userId: string) {
  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      icon: true,
      modules: { select: { lessons: { select: { quests: { select: { id: true } } } } } },
    },
  });

  const progress = await prisma.progress.findMany({
    where: { userId, status: "COMPLETED" },
    select: { questId: true, mastery: true },
  });
  const completed = new Map(progress.map((row) => [row.questId, row.mastery]));

  return courses.map((course) => {
    const questIds = course.modules.flatMap((m) => m.lessons.flatMap((l) => l.quests.map((q) => q.id)));
    const done = questIds.filter((id) => completed.has(id));
    const masterySum = done.reduce((sum, id) => sum + (completed.get(id) ?? 0), 0);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      icon: course.icon,
      total: questIds.length,
      completed: done.length,
      percent: questIds.length ? Math.round((done.length / questIds.length) * 100) : 0,
      mastery: done.length ? Math.round((masterySum / done.length) * 100) : 0,
    };
  });
}

export async function getDashboard(userId: string) {
  const [user, streak, completedCount, failedCount, achievements, recent, mistakes, mastery] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, username: true, xp: true, level: true, profile: true },
    }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.progress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.submission.count({ where: { userId, status: { in: ["FAILED", "ERROR"] } } }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { quest: { select: { id: true, title: true, difficulty: true } } },
    }),
    prisma.mistake.findMany({
      where: { userId, resolved: false },
      orderBy: { retryCount: "desc" },
      take: 5,
      include: { quest: { select: { id: true, title: true } } },
    }),
    getCourseMastery(userId),
  ]);

  const nextQuest = await getNextQuestForUser(userId);

  return {
    user,
    progress: levelProgress(user.xp),
    streak: streak
      ? effectiveStreak({ current: streak.current, longest: streak.longest, lastActive: streak.lastActive })
      : 0,
    longestStreak: streak?.longest ?? 0,
    completedCount,
    failedCount,
    achievements,
    recent,
    mistakes,
    mastery,
    nextQuest,
  };
}

/** The first quest in catalogue order the user has not completed yet. */
export async function getNextQuestForUser(userId: string) {
  const completed = await prisma.progress.findMany({
    where: { userId, status: "COMPLETED" },
    select: { questId: true },
  });
  const completedIds = completed.map((row) => row.questId);

  return prisma.quest.findFirst({
    where: completedIds.length ? { id: { notIn: completedIds } } : {},
    orderBy: [
      { lesson: { module: { course: { order: "asc" } } } },
      { lesson: { module: { order: "asc" } } },
      { lesson: { order: "asc" } },
      { order: "asc" },
    ],
    select: {
      id: true,
      title: true,
      difficulty: true,
      xp: true,
      lesson: { select: { id: true, title: true, module: { select: { course: { select: { title: true, icon: true } } } } } },
    },
  });
}

export async function getLeaderboard(limit = 20) {
  const users = await prisma.user.findMany({
    orderBy: [{ xp: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      username: true,
      xp: true,
      level: true,
      streak: { select: { current: true, longest: true, lastActive: true } },
      _count: { select: { progress: true } },
    },
  });

  return users.map((user, index) => ({
    rank: index + 1,
    id: user.id,
    username: user.username,
    xp: user.xp,
    level: user.level,
    streak: user.streak
      ? effectiveStreak({ current: user.streak.current, longest: user.streak.longest, lastActive: user.streak.lastActive })
      : 0,
  }));
}

export async function getProfile(userId: string) {
  const [user, streak, submissions, mistakes, achievements, mastery] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, username: true, xp: true, level: true, role: true, createdAt: true, profile: true },
    }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { quest: { select: { id: true, title: true } } },
    }),
    prisma.mistake.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { quest: { select: { id: true, title: true } } },
    }),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    getCourseMastery(userId),
  ]);

  return { user, streak, submissions, mistakes, achievements, mastery, progress: levelProgress(user.xp) };
}
