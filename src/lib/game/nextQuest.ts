import "server-only";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { quests, lessons, modules, courses, progress } from "@/db/schema";

const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2, boss: 3 };

/**
 * After a strong pass (mastery >= 85), offers a harder unfinished quest in
 * the same course. Otherwise (or if no harder quest remains), falls back to
 * the next unfinished quest in the overall course -> module -> lesson order.
 */
export async function pickNextQuest(userId: string, currentQuestId: string, mastery: number): Promise<string | null> {
  const current = await db.query.quests.findFirst({
    where: eq(quests.id, currentQuestId),
    with: { lesson: { with: { module: { with: { course: true } } } } },
  });
  if (!current) return null;

  const doneRows = await db.query.progress.findMany({ where: and(eq(progress.userId, userId), eq(progress.completed, true)) });
  const doneIds = new Set(doneRows.map((r) => r.questId));

  if (mastery >= 85) {
    const sameCourseQuests = await db
      .select({ id: quests.id, difficulty: quests.difficulty, order: quests.order })
      .from(quests)
      .innerJoin(lessons, eq(quests.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(eq(courses.id, current.lesson.module.course.id));

    const currentRank = DIFFICULTY_RANK[current.difficulty] ?? 0;
    const harder = sameCourseQuests
      .filter((q) => !doneIds.has(q.id) && q.id !== currentQuestId && (DIFFICULTY_RANK[q.difficulty] ?? 0) > currentRank)
      .sort((a, b) => (DIFFICULTY_RANK[a.difficulty] ?? 0) - (DIFFICULTY_RANK[b.difficulty] ?? 0) || a.order - b.order)[0];
    if (harder) return harder.id;
  }

  const all = await db
    .select({ id: quests.id })
    .from(quests)
    .innerJoin(lessons, eq(quests.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .orderBy(asc(courses.order), asc(modules.order), asc(lessons.order), asc(quests.order));

  const next = all.find((q) => !doneIds.has(q.id) && q.id !== currentQuestId);
  return next?.id ?? null;
}
