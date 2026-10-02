import { test } from "node:test";
import assert from "node:assert/strict";
import { extractStudyMaterial } from "../src/lib/cgpaExtract";

const SOURCE =
  "Machine Learning is the study of algorithms that improve automatically through experience. " +
  "The Final Assignment is worth 40% of the total grade and is due on the last week of the semester. " +
  "Students must understand Supervised Learning and Unsupervised Learning as key concepts for the exam.";

test("extractStudyMaterial never invents a quote or answer not in the source", () => {
  const result = extractStudyMaterial(SOURCE);
  for (const c of result.concepts) assert.ok(SOURCE.includes(c));
  for (const m of result.marks) assert.ok(SOURCE.includes(m));
  for (const q of [...result.practiceQuestions, ...result.examQuestions]) {
    assert.ok(SOURCE.includes(q.quote), `quote must be verbatim: ${q.quote}`);
    assert.ok(SOURCE.includes(q.answer), `answer must be verbatim: ${q.answer}`);
    assert.ok(q.question.includes("_____"));
  }
});

test("extractStudyMaterial finds the weighted-mark sentence", () => {
  const result = extractStudyMaterial(SOURCE);
  assert.ok(result.marks.some((m) => m.includes("40%")));
});

test("extractStudyMaterial returns empty categories (never invented content) for sparse input", () => {
  const result = extractStudyMaterial("This is a short line with no real content here at all.");
  assert.equal(result.marks.length, 0);
});
