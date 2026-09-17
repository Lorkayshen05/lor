import "server-only";
import { prisma } from "@/lib/prisma";
import type { TestSpec } from "@/lib/python/types";
import { serverVerificationEnabled } from "@/server/sandbox";

export type QuestNeighbour = { id: string; title: string } | null;

export async function getCourseList() {
  return prisma.course.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { _count: { select: { quests: true } } },
          },
        },
      },
    },
  });
}

export async function getCourseBySlugOrId(idOrSlug: string) {
  return prisma.course.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              quests: { orderBy: { order: "asc" }, select: { id: true, title: true, difficulty: true, xp: true, slug: true } },
            },
          },
        },
      },
    },
  });
}

export async function getLesson(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      quests: { orderBy: { order: "asc" } },
    },
  });
}

export async function getQuest(questId: string) {
  return prisma.quest.findUnique({
    where: { id: questId },
    include: {
      testCases: { orderBy: { order: "asc" } },
      lesson: { include: { module: { include: { course: true } } } },
    },
  });
}

/**
 * Test specs handed to the browser sandbox. When an external sandbox service is
 * configured the server owns verification, so hidden tests never leave the server.
 */
export function toClientTestSpecs(
  testCases: { id: string; name: string; kind: "STDOUT" | "EXPRESSION"; expression: string | null; expected: string; hidden: boolean }[],
): TestSpec[] {
  const visible = serverVerificationEnabled ? testCases.filter((test) => !test.hidden) : testCases;
  return visible.map((test) => ({
    id: test.id,
    name: test.name,
    kind: test.kind,
    expression: test.expression,
    expected: test.expected,
    hidden: test.hidden,
  }));
}

/** Ordered list of every quest id in the catalogue, used for "next quest" navigation. */
export async function getQuestOrder() {
  const quests = await prisma.quest.findMany({
    orderBy: [
      { lesson: { module: { course: { order: "asc" } } } },
      { lesson: { module: { order: "asc" } } },
      { lesson: { order: "asc" } },
      { order: "asc" },
    ],
    select: { id: true, title: true },
  });
  return quests;
}

export async function getAdjacentQuests(questId: string): Promise<{ previous: QuestNeighbour; next: QuestNeighbour }> {
  const order = await getQuestOrder();
  const index = order.findIndex((quest) => quest.id === questId);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null,
  };
}
