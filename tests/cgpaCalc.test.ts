import { test } from "node:test";
import assert from "node:assert/strict";
import { predictedScore, predictedCgpa } from "../src/lib/cgpaCalc";

test("predictedScore returns null with no graded tasks", () => {
  assert.equal(predictedScore([{ weightPct: 50, score: null }]), null);
});

test("predictedScore is the weighted average of graded tasks only", () => {
  const score = predictedScore([
    { weightPct: 50, score: 80 },
    { weightPct: 50, score: 60 },
    { weightPct: 100, score: null }, // ungraded, excluded
  ]);
  assert.equal(score, 70);
});

test("predictedCgpa is credit-weighted across subjects with at least one grade", () => {
  const cgpa = predictedCgpa([
    { credits: 3, tasks: [{ weightPct: 100, score: 77 } as const] }, // A band (75-79) -> 3.7
    { credits: 3, tasks: [{ weightPct: 100, score: null } as const] }, // ungraded, excluded entirely
  ]);
  assert.ok(cgpa !== null && Math.abs(cgpa - 3.7) < 1e-9, `expected ~3.7, got ${cgpa}`);
});

test("predictedCgpa is null when nothing is graded anywhere", () => {
  assert.equal(predictedCgpa([{ credits: 3, tasks: [{ weightPct: 100, score: null }] }]), null);
});
