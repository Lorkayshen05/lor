import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPracticeQuestions } from "../src/lib/materialExtractor";

test("extractPracticeQuestions never invents an answer not present in the source text", () => {
  const source =
    "Machine learning is a way of teaching computers to find patterns in data. " +
    "The model looks at many examples and improves its accuracy over time.";
  const questions = extractPracticeQuestions(source);
  assert.ok(questions.length > 0);
  for (const q of questions) {
    assert.ok(source.includes(q.answer), `answer "${q.answer}" must be verbatim from the source`);
    assert.ok(q.question.includes("_____"));
  }
});

test("extractPracticeQuestions returns nothing for too-short input", () => {
  const questions = extractPracticeQuestions("Too short.");
  assert.equal(questions.length, 0);
});
