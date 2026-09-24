import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { courses, modules, lessons, quests, questions, achievements, users } from "./schema";
import { COURSES } from "../content/courses";
import { ACHIEVEMENTS } from "../content/achievements";
import { hashPassword } from "../lib/auth/password";

/** Idempotent upsert by natural key, so re-seeding never touches user progress. */
async function upsertCourse(order: number, c: (typeof COURSES)[number]) {
  const existing = await db.query.courses.findFirst({ where: eq(courses.slug, c.slug) });
  const courseId = existing?.id ?? crypto.randomUUID();
  if (existing) {
    await db.update(courses).set({ title: c.title, description: c.description, icon: c.icon, order }).where(eq(courses.id, courseId));
  } else {
    await db.insert(courses).values({ id: courseId, slug: c.slug, title: c.title, description: c.description, icon: c.icon, order });
  }

  for (let mi = 0; mi < c.modules.length; mi++) {
    const m = c.modules[mi];
    const existingModule = await db.query.modules.findFirst({ where: and(eq(modules.courseId, courseId), eq(modules.slug, m.slug)) });
    const moduleId = existingModule?.id ?? crypto.randomUUID();
    if (existingModule) {
      await db.update(modules).set({ title: m.title, order: mi }).where(eq(modules.id, moduleId));
    } else {
      await db.insert(modules).values({ id: moduleId, courseId, slug: m.slug, title: m.title, order: mi });
    }

    for (let li = 0; li < m.lessons.length; li++) {
      const l = m.lessons[li];
      const existingLesson = await db.query.lessons.findFirst({ where: and(eq(lessons.moduleId, moduleId), eq(lessons.slug, l.slug)) });
      const lessonId = existingLesson?.id ?? crypto.randomUUID();
      if (existingLesson) {
        await db.update(lessons).set({ title: l.title, contentMd: l.contentMd, order: li }).where(eq(lessons.id, lessonId));
      } else {
        await db.insert(lessons).values({ id: lessonId, moduleId, slug: l.slug, title: l.title, contentMd: l.contentMd, order: li });
      }

      for (let qi = 0; qi < l.quests.length; qi++) {
        const q = l.quests[qi];
        const existingQuest = await db.query.quests.findFirst({ where: and(eq(quests.lessonId, lessonId), eq(quests.slug, q.slug)) });
        const questId = existingQuest?.id ?? crypto.randomUUID();

        const base = {
          lessonId,
          slug: q.slug,
          type: q.type,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          xp: q.xp,
          order: qi,
          hints: q.hints,
        };

        if (q.type === "code") {
          const codeFields = { starterCode: q.starterCode, solutionCode: q.solutionCode, expectedStdout: q.expectedStdout ?? null, tests: q.tests };
          if (existingQuest) {
            await db.update(quests).set({ ...base, ...codeFields }).where(eq(quests.id, questId));
          } else {
            await db.insert(quests).values({ id: questId, ...base, ...codeFields });
          }
        } else {
          if (existingQuest) {
            await db.update(quests).set(base).where(eq(quests.id, questId));
          } else {
            await db.insert(quests).values({ id: questId, ...base });
          }
          for (let si = 0; si < q.slots.length; si++) {
            const existingSlot = await db.query.questions.findFirst({ where: and(eq(questions.questId, questId), eq(questions.slotIndex, si)) });
            if (existingSlot) {
              await db.update(questions).set({ variants: q.slots[si] }).where(eq(questions.id, existingSlot.id));
            } else {
              await db.insert(questions).values({ questId, slotIndex: si, variants: q.slots[si] });
            }
          }
        }
      }
    }
  }
}

async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    const existing = await db.query.achievements.findFirst({ where: eq(achievements.key, a.key) });
    if (existing) {
      await db.update(achievements).set({ title: a.title, description: a.description, icon: a.icon }).where(eq(achievements.id, existing.id));
    } else {
      await db.insert(achievements).values(a);
    }
  }
}

async function seedDemoAccount() {
  const email = "demo@aiquest.dev";
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing;
  const passwordHash = await hashPassword("demo1234");
  // Admin so the seeded demo account can also explore /admin.
  const [user] = await db.insert(users).values({ email, passwordHash, name: "Demo Student", role: "admin" }).returning();
  return user;
}

async function main() {
  console.log("Seeding AI Quest...");
  for (let i = 0; i < COURSES.length; i++) {
    await upsertCourse(i, COURSES[i]);
  }
  await seedAchievements();
  const demo = await seedDemoAccount();
  console.log(`Seed complete. Demo login: demo@aiquest.dev / demo1234 (user id ${demo.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
