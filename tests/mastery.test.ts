import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMastery } from "../src/lib/game/mastery";

test("first-try, no-hint solve gives full mastery", () => {
  assert.equal(computeMastery(1, 0), 100);
});

test("mastery drops 15 per extra attempt and 10 per hint", () => {
  assert.equal(computeMastery(2, 0), 85);
  assert.equal(computeMastery(1, 1), 90);
  assert.equal(computeMastery(3, 2), 100 - 15 * 2 - 10 * 2);
});

test("mastery never drops below the 40 floor", () => {
  assert.equal(computeMastery(20, 5), 40);
});
