import { test } from "node:test";
import assert from "node:assert/strict";
import { runPython, gradeQuest } from "../src/lib/sandbox";

test("runPython executes and captures stdout", async () => {
  const result = await runPython("print(2 + 2)");
  assert.equal(result.stdout, "4\n");
  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
});

test("runPython surfaces syntax errors on stderr", async () => {
  const result = await runPython("def f(:\n");
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /SyntaxError/);
});

test("runPython times out on an infinite loop", { timeout: 10000 }, async () => {
  const result = await runPython("while True:\n    pass\n");
  assert.equal(result.timedOut, true);
});

test("gradeQuest passes correct code against all tests", async () => {
  const code = "def sum_list(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total\n";
  const outcomes = await gradeQuest(code, [
    { id: "1", prompt: "sum([1,2,3]) == 6", testCode: "assert sum_list([1,2,3]) == 6", hint: "" },
    { id: "2", prompt: "sum([]) == 0", testCode: "assert sum_list([]) == 0", hint: "" },
  ]);
  assert.equal(outcomes.length, 2);
  assert.ok(outcomes.every((o) => o.passed));
});

test("gradeQuest fails incorrect code with a real assertion message", async () => {
  const code = "def sum_list(nums):\n    return 0\n";
  const outcomes = await gradeQuest(code, [
    { id: "1", prompt: "sum([1,2,3]) == 6", testCode: "assert sum_list([1,2,3]) == 6", hint: "" },
  ]);
  assert.equal(outcomes[0].passed, false);
  assert.match(outcomes[0].message, /AssertionError/);
});
