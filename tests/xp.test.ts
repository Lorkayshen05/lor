import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { awardXp, xpToNextLevel } from "../src/lib/xp";

test("xpToNextLevel scales with level", () => {
  assert.equal(xpToNextLevel(1), 100);
  assert.equal(xpToNextLevel(2), 150);
  assert.equal(xpToNextLevel(3), 200);
});

test("awardXp accumulates XP without leveling up", async () => {
  const user = await prisma.user.create({
    data: { email: `test-xp-${Date.now()}@test.local`, name: "Test", level: 1, xp: 0, xpToNext: 100 },
  });
  try {
    const updated = await awardXp(user, 40);
    assert.equal(updated.xp, 40);
    assert.equal(updated.level, 1);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("awardXp rolls over into a level up, carrying remainder XP", async () => {
  const user = await prisma.user.create({
    data: { email: `test-xp-${Date.now()}-2@test.local`, name: "Test", level: 1, xp: 90, xpToNext: 100 },
  });
  try {
    const updated = await awardXp(user, 30);
    assert.equal(updated.level, 2);
    assert.equal(updated.xp, 20);
    assert.equal(updated.xpToNext, 150);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("awardXp sets streak to 1 on a brand-new user's very first quest, same day as signup", async () => {
  const user = await prisma.user.create({
    data: {
      email: `test-xp-${Date.now()}-3@test.local`,
      name: "Test",
      level: 1,
      xp: 0,
      xpToNext: 100,
      streak: 0,
      lastActiveAt: new Date(), // account just created "today", like a fresh seed
    },
  });
  try {
    const updated = await awardXp(user, 10);
    assert.equal(updated.streak, 1);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("awardXp increments an existing streak on the next calendar day", async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const user = await prisma.user.create({
    data: {
      email: `test-xp-${Date.now()}-4@test.local`,
      name: "Test",
      level: 1,
      xp: 0,
      xpToNext: 100,
      streak: 1,
      lastActiveAt: yesterday,
    },
  });
  try {
    const updated = await awardXp(user, 10);
    assert.equal(updated.streak, 2);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("awardXp does not double-count a second quest completed the same day", async () => {
  const user = await prisma.user.create({
    data: {
      email: `test-xp-${Date.now()}-5@test.local`,
      name: "Test",
      level: 1,
      xp: 0,
      xpToNext: 100,
      streak: 3,
      lastActiveAt: new Date(),
    },
  });
  try {
    const updated = await awardXp(user, 10);
    assert.equal(updated.streak, 3);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("awardXp resets the streak to 1 after a missed day", async () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const user = await prisma.user.create({
    data: {
      email: `test-xp-${Date.now()}-6@test.local`,
      name: "Test",
      level: 1,
      xp: 0,
      xpToNext: 100,
      streak: 5,
      lastActiveAt: threeDaysAgo,
    },
  });
  try {
    const updated = await awardXp(user, 10);
    assert.equal(updated.streak, 1);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});
