import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { checkAndUnlockAchievements } from "../src/lib/achievements";

test("completing a quest unlocks first_quest exactly once", async () => {
  const user = await prisma.user.create({
    data: { email: `test-ach-${Date.now()}@test.local`, name: "Test", level: 1, xp: 0, xpToNext: 100 },
  });
  const quest = await prisma.quest.findFirst();
  assert.ok(quest, "seed data must contain at least one quest");

  try {
    await prisma.progress.create({
      data: { userId: user.id, questId: quest!.id, completed: true, mastery: 100, attempts: 1 },
    });

    const firstRun = await checkAndUnlockAchievements(user.id);
    assert.ok(firstRun.includes("first_quest"));

    const secondRun = await checkAndUnlockAchievements(user.id);
    assert.equal(secondRun.length, 0, "already-unlocked achievements must not unlock twice");

    const stored = await prisma.userAchievement.findMany({ where: { userId: user.id } });
    assert.equal(stored.length, 1);
  } finally {
    await prisma.progress.deleteMany({ where: { userId: user.id } });
    await prisma.userAchievement.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
