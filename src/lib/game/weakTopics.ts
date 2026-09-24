import "server-only";
import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { mistakes, progress, quests, lessons, modules, courses } from "@/db/schema";

const REPEATED_MISTAKE_THRESHOLD = 2;
const LOW_MASTERY_THRESHOLD = 60;

/** Upserts (user, topic, kind), incrementing count and recording the latest detail. */
export async function logMistake(userId: string, topic: string, kind: string, detail?: string) {
  const existing = await db.query.mistakes.findFirst({
    where: and(eq(mistakes.userId, userId), eq(mistakes.topic, topic), eq(mistakes.kind, kind)),
  });
  if (existing) {
    await db
      .update(mistakes)
      .set({ count: existing.count + 1, lastDetail: detail ?? existing.lastDetail })
      .where(eq(mistakes.id, existing.id));
  } else {
    await db.insert(mistakes).values({ userId, topic, kind, count: 1, lastDetail: detail });
  }
}

export interface WeakTopic {
  topic: string;
  reason: "repeated_mistake" | "low_mastery";
  detail: string;
}

/** A topic is weak if a mistake repeated 2+ times there, OR avg mastery < 60% over attempted quests only. */
export async function getWeakTopics(userId: string): Promise<WeakTopic[]> {
  const weak = new Map<string, WeakTopic>();

  const repeated = await db
    .select({ topic: mistakes.topic, kind: mistakes.kind, count: mistakes.count })
    .from(mistakes)
    .where(and(eq(mistakes.userId, userId), gte(mistakes.count, REPEATED_MISTAKE_THRESHOLD)));

  for (const m of repeated) {
    if (!weak.has(m.topic)) {
      weak.set(m.topic, { topic: m.topic, reason: "repeated_mistake", detail: `${m.kind} repeated ${m.count}x` });
    }
  }

  // Average mastery per course, counting only quests the user has actually attempted (a progress row exists).
  const rows = await db
    .select({ topic: courses.title, mastery: progress.mastery, attempts: progress.attempts })
    .from(progress)
    .innerJoin(quests, eq(progress.questId, quests.id))
    .innerJoin(lessons, eq(quests.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(and(eq(progress.userId, userId), sql`${progress.attempts} > 0`));

  const byTopic = new Map<string, number[]>();
  for (const r of rows) {
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, []);
    byTopic.get(r.topic)!.push(r.mastery);
  }

  for (const [topic, masteries] of byTopic) {
    const avg = masteries.reduce((a, b) => a + b, 0) / masteries.length;
    if (avg < LOW_MASTERY_THRESHOLD && !weak.has(topic)) {
      weak.set(topic, { topic, reason: "low_mastery", detail: `Average mastery ${Math.round(avg)}% over ${masteries.length} attempted quest(s)` });
    }
  }

  return [...weak.values()];
}
