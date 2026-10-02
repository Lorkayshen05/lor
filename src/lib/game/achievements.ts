import "server-only";
import { eq, and, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { progress, quests, lessons, modules, courses, streaks, userAchievements, englishAttempts, projects, users } from "@/db/schema";
import { computeLevel } from "./xp";
import { ACHIEVEMENTS } from "@/content/achievements";

type Check = (userId: string) => Promise<boolean>;

const CHECKS: Record<string, Check> = {
  first_quest: async (userId) => (await completedCount(userId)) >= 1,
  five_quests: async (userId) => (await completedCount(userId)) >= 5,
  twenty_quests: async (userId) => (await completedCount(userId)) >= 20,

  boss_slayer: async (userId) => {
    const [row] = await db
      .select({ n: count() })
      .from(progress)
      .innerJoin(quests, eq(progress.questId, quests.id))
      .where(and(eq(progress.userId, userId), eq(progress.completed, true), eq(quests.difficulty, "boss")));
    return (row?.n ?? 0) >= 1;
  },

  no_hint_solve: async (userId) => {
    const [row] = await db
      .select({ n: count() })
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.completed, true), eq(progress.noHint, true)));
    return (row?.n ?? 0) >= 1;
  },

  first_try_solve: async (userId) => {
    const [row] = await db
      .select({ n: count() })
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.completed, true), eq(progress.firstTry, true)));
    return (row?.n ?? 0) >= 1;
  },

  streak_3: async (userId) => ((await db.query.streaks.findFirst({ where: eq(streaks.userId, userId) }))?.current ?? 0) >= 3,
  streak_7: async (userId) => ((await db.query.streaks.findFirst({ where: eq(streaks.userId, userId) }))?.current ?? 0) >= 7,

  level_5: async (userId) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return computeLevel(user?.xp ?? 0).level >= 5;
  },

  five_english: async (userId) => {
    const [row] = await db
      .select({ n: sql<number>`count(distinct ${englishAttempts.exerciseId})` })
      .from(englishAttempts)
      .where(and(eq(englishAttempts.userId, userId), eq(englishAttempts.passed, true)));
    return Number(row?.n ?? 0) >= 5;
  },

  first_project: async (userId) => {
    const [row] = await db.select({ n: count() }).from(projects).where(eq(projects.userId, userId));
    return (row?.n ?? 0) >= 1;
  },

  shipped_project: async (userId) => {
    const [row] = await db.select({ n: count() }).from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "shipped")));
    return (row?.n ?? 0) >= 1;
  },

  all_python: async (userId) => {
    const [totalRow] = await db
      .select({ n: count() })
      .from(quests)
      .innerJoin(lessons, eq(quests.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(eq(courses.slug, "python"));
    const [doneRow] = await db
      .select({ n: count() })
      .from(progress)
      .innerJoin(quests, eq(progress.questId, quests.id))
      .innerJoin(lessons, eq(quests.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(and(eq(progress.userId, userId), eq(progress.completed, true), eq(courses.slug, "python")));
    const total = totalRow?.n ?? 0;
    return total > 0 && (doneRow?.n ?? 0) >= total;
  },
};

async function completedCount(userId: string) {
  const [row] = await db.select({ n: count() }).from(progress).where(and(eq(progress.userId, userId), eq(progress.completed, true)));
  return row?.n ?? 0;
}

export async function checkAndUnlockAchievements(userId: string) {
  const unlocked: (typeof ACHIEVEMENTS)[number][] = [];
  const already = await db.query.userAchievements.findMany({ where: eq(userAchievements.userId, userId) });
  const alreadyIds = new Set(already.map((a) => a.achievementId));

  const allRows = await db.query.achievements.findMany();
  for (const row of allRows) {
    if (alreadyIds.has(row.id)) continue;
    const check = CHECKS[row.key];
    if (!check) continue;
    if (await check(userId)) {
      await db.insert(userAchievements).values({ userId, achievementId: row.id });
      const def = ACHIEVEMENTS.find((a) => a.key === row.key);
      if (def) unlocked.push(def);
    }
  }
  return unlocked;
}
