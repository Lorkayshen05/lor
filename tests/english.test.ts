import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAnswer } from "../src/lib/english";

const keyPoints = [
  { label: "decides the next step itself", keywords: ["decide", "itself", "next step"] },
  { label: "uses tools", keywords: ["tool", "use"] },
];

test("checkAnswer scores full meaning coverage", () => {
  const result = checkAnswer("It can decide the next step itself and use a tool.", keyPoints);
  assert.equal(result.meaningScore, 100);
  assert.equal(result.missing.length, 0);
});

test("checkAnswer flags missing key points", () => {
  const result = checkAnswer("It just responds.", keyPoints);
  assert.equal(result.meaningScore, 0);
  assert.equal(result.missing.length, 2);
});

test("checkAnswer catches the listed grammar patterns", () => {
  const result = checkAnswer("he don't know the informations.", []);
  const wrongs = result.grammarIssues.map((g) => g.wrong);
  assert.ok(wrongs.includes("he/she don't"));
  assert.ok(wrongs.includes("informations"));
});

test("checkAnswer flags missing capitalization and punctuation", () => {
  const result = checkAnswer("it works fine", []);
  assert.ok(result.grammarIssues.some((g) => g.wrong.includes("lowercase")));
  assert.ok(result.grammarIssues.some((g) => g.wrong.includes("punctuation")));
});

test("checkAnswer passes a clean, correct sentence", () => {
  const result = checkAnswer("It works fine.", []);
  assert.equal(result.grammarIssues.length, 0);
});
