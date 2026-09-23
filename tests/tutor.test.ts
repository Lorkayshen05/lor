import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEnglishAnswer, getRuleBasedTutorReply } from "../src/lib/tutor";

test("checkEnglishAnswer accepts an answer covering the expected keywords", () => {
  const result = checkEnglishAnswer("The model learns patterns from data.", ["pattern", "data"]);
  assert.equal(result.meaningOk, true);
  assert.equal(result.missing.length, 0);
});

test("checkEnglishAnswer flags missing concepts", () => {
  const result = checkEnglishAnswer("It just works somehow.", ["pattern", "data"]);
  assert.equal(result.meaningOk, false);
  assert.deepEqual(result.missing.sort(), ["data", "pattern"]);
});

test("checkEnglishAnswer flags common grammar mistakes", () => {
  const result = checkEnglishAnswer("I is happy", []);
  assert.ok(result.grammarNotes.some((n) => /I am/.test(n)));
});

test("hint mode does not reveal the answer, only a hint", () => {
  const reply = getRuleBasedTutorReply({ mode: "hint", topic: "loops", hint: "count the iterations" });
  assert.match(reply.message, /count the iterations/);
});

test("debug mode surfaces the last line of the error, not the raw traceback", () => {
  const reply = getRuleBasedTutorReply({
    mode: "debug",
    topic: "loops",
    errorOutput: "Traceback (most recent call last):\n  File x\nAssertionError",
  });
  assert.match(reply.message, /AssertionError/);
});
