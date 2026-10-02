import "server-only";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { courses, modules, lessons, quests, progress, userAchievements } from "@/db/schema";

export async function getCoursesWithProgress(userId: string) {
  const allCourses = await db.query.courses.findMany({
    orderBy: asc(courses.order),
    with: {
      modules: {
        orderBy: asc(modules.order),
        with: { lessons: { orderBy: asc(lessons.order), with: { quests: { orderBy: asc(quests.order) } } } },
      },
    },
  });

  const done = await db.query.progress.findMany({ where: and(eq(progress.userId, userId), eq(progress.completed, true)) });
  const doneIds = new Set(done.map((p) => p.questId));

  return allCourses.map((course) => {
    const allQuests = course.modules.flatMap((m) => m.lessons.flatMap((l) => l.quests));
    const completedQuests = allQuests.filter((q) => doneIds.has(q.id)).length;
    return { ...course, totalQuests: allQuests.length, completedQuests };
  });
}

/** First quest (course/module/lesson/quest order) the user hasn't completed yet. */
export async function getCurrentQuest(userId: string) {
  const allQuests = await db
    .select({
      id: quests.id,
      title: quests.title,
      description: quests.description,
      difficulty: quests.difficulty,
      xp: quests.xp,
      type: quests.type,
    })
    .from(quests)
    .innerJoin(lessons, eq(quests.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .orderBy(asc(courses.order), asc(modules.order), asc(lessons.order), asc(quests.order));

  const done = await db.query.progress.findMany({ where: and(eq(progress.userId, userId), eq(progress.completed, true)) });
  const doneIds = new Set(done.map((p) => p.questId));

  return allQuests.find((q) => !doneIds.has(q.id)) ?? null;
}

export async function getAchievementsWithStatus(userId: string) {
  const [all, unlocked] = await Promise.all([
    db.query.achievements.findMany(),
    db.query.userAchievements.findMany({ where: eq(userAchievements.userId, userId) }),
  ]);
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  return all.map((a) => ({ ...a, unlocked: unlockedIds.has(a.id) }));
}

export async function getQuestStats(userId: string) {
  const [totalQuestsRows, completedRows] = await Promise.all([
    db.select({ id: quests.id }).from(quests),
    db.query.progress.findMany({ where: and(eq(progress.userId, userId), eq(progress.completed, true)) }),
  ]);
  return { totalQuests: totalQuestsRows.length, completed: completedRows.length };
}
