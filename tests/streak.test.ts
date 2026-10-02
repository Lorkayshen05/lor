import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceStreak, calendarDate } from "../src/lib/game/streak";

const TZ = "Asia/Kuala_Lumpur";

test("first-ever activity starts the streak at 1", () => {
  const result = advanceStreak({ current: 0, longest: 0, lastActiveDate: null }, new Date());
  assert.equal(result.current, 1);
  assert.equal(result.longest, 1);
});

test("same-day activity does not double-count", () => {
  const now = new Date();
  const today = calendarDate(now, TZ);
  const result = advanceStreak({ current: 3, longest: 3, lastActiveDate: today }, now);
  assert.equal(result.current, 3);
});

test("consecutive-day activity increments the streak", () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const result = advanceStreak({ current: 2, longest: 5, lastActiveDate: calendarDate(yesterday, TZ) }, now);
  assert.equal(result.current, 3);
  assert.equal(result.longest, 5);
});

test("a missed day resets the streak to 1", () => {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const result = advanceStreak({ current: 10, longest: 10, lastActiveDate: calendarDate(threeDaysAgo, TZ) }, now);
  assert.equal(result.current, 1);
  assert.equal(result.longest, 10);
});
