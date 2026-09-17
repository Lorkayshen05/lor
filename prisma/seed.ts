import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { ACHIEVEMENTS } from "../src/lib/achievements";
import { XP_BY_DIFFICULTY } from "../src/lib/xp";
import { SEED_COURSES } from "./content";

async function seedAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement,
    });
  }
}

async function seedCourses() {
  let questCount = 0;
  for (const [courseIndex, course] of SEED_COURSES.entries()) {
    const courseRow = await prisma.course.upsert({
      where: { slug: course.slug },
      update: { title: course.title, description: course.description, icon: course.icon, order: courseIndex },
      create: { slug: course.slug, title: course.title, description: course.description, icon: course.icon, order: courseIndex },
    });

    for (const [moduleIndex, courseModule] of course.modules.entries()) {
      const moduleRow = await prisma.module.upsert({
        where: { courseId_slug: { courseId: courseRow.id, slug: courseModule.slug } },
        update: { title: courseModule.title, description: courseModule.description, order: moduleIndex },
        create: {
          courseId: courseRow.id,
          slug: courseModule.slug,
          title: courseModule.title,
          description: courseModule.description,
          order: moduleIndex,
        },
      });

      for (const [lessonIndex, lesson] of courseModule.lessons.entries()) {
        const lessonRow = await prisma.lesson.upsert({
          where: { moduleId_slug: { moduleId: moduleRow.id, slug: lesson.slug } },
          update: { title: lesson.title, summary: lesson.summary, content: lesson.content, order: lessonIndex },
          create: {
            moduleId: moduleRow.id,
            slug: lesson.slug,
            title: lesson.title,
            summary: lesson.summary,
            content: lesson.content,
            order: lessonIndex,
          },
        });

        for (const [questIndex, quest] of lesson.quests.entries()) {
          const data = {
            title: quest.title,
            description: quest.description,
            difficulty: quest.difficulty,
            concept: quest.concept,
            instructions: quest.instructions,
            starterCode: quest.starterCode,
            expectedBehavior: quest.expectedBehavior,
            hints: quest.hints,
            solution: quest.solution,
            xp: XP_BY_DIFFICULTY[quest.difficulty],
            order: questIndex,
          };
          const questRow = await prisma.quest.upsert({
            where: { lessonId_slug: { lessonId: lessonRow.id, slug: quest.slug } },
            update: data,
            create: { ...data, lessonId: lessonRow.id, slug: quest.slug },
          });
          questCount += 1;

          // Test cases are content, not user data: replace them wholesale.
          await prisma.testCase.deleteMany({ where: { questId: questRow.id } });
          await prisma.testCase.createMany({
            data: quest.tests.map((test, index) => ({
              questId: questRow.id,
              name: test.name,
              kind: test.kind,
              expression: test.expression ?? null,
              expected: test.expected,
              hidden: Boolean(test.hidden),
              order: index,
            })),
          });
        }
      }
    }
  }
  return questCount;
}

async function seedUsers() {
  const accounts = [
    { email: "admin@playgame.dev", username: "admin", password: "admin1234", role: "ADMIN" as const, displayName: "Game Master" },
    { email: "player@playgame.dev", username: "player", password: "player1234", role: "USER" as const, displayName: "Demo Player" },
  ];

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { role: account.role },
      create: {
        email: account.email,
        username: account.username,
        passwordHash,
        role: account.role,
      },
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: account.displayName, goal: "Finish the Python track" },
    });
    await prisma.streak.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }
}

async function main() {
  await seedAchievements();
  const quests = await seedCourses();
  await seedUsers();
  console.log(`Seeded ${SEED_COURSES.length} courses, ${quests} quests, ${ACHIEVEMENTS.length} achievements, 2 demo users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
