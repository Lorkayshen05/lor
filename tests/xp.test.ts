import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLevel, cumulativeXpForLevel, xpToClearLevel } from "../src/lib/game/xp";

test("cumulativeXpForLevel matches 50*L*(L-1)", () => {
  assert.equal(cumulativeXpForLevel(1), 0);
  assert.equal(cumulativeXpForLevel(2), 100);
  assert.equal(cumulativeXpForLevel(3), 300);
});

test("xpToClearLevel matches 100*L", () => {
  assert.equal(xpToClearLevel(1), 100);
  assert.equal(xpToClearLevel(2), 200);
});

test("computeLevel derives level 1 at 0 XP", () => {
  const info = computeLevel(0);
  assert.equal(info.level, 1);
  assert.equal(info.xpIntoLevel, 0);
  assert.equal(info.xpToNextLevel, 100);
});

test("computeLevel rolls over at the exact boundary", () => {
  const info = computeLevel(100);
  assert.equal(info.level, 2);
  assert.equal(info.xpIntoLevel, 0);
});

test("computeLevel handles multi-level jumps", () => {
  // level 3 starts at cumulative 300; 350 total xp -> level 3, 50 into it
  const info = computeLevel(350);
  assert.equal(info.level, 3);
  assert.equal(info.xpIntoLevel, 50);
  assert.equal(info.xpToNextLevel, 300);
});
