import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildHarness, parseHarnessOutput } from "@/lib/python/harness";
import type { TestSpec } from "@/lib/python/types";

/**
 * The harness is the contract between the browser sandbox and the server.
 * These tests execute it with the local CPython — the same program Pyodide runs.
 */
function run(code: string, tests: TestSpec[]) {
  const program = buildHarness(code, tests);
  const proc = spawnSync("python3", ["-c", program], { encoding: "utf8", timeout: 30_000 });
  return parseHarnessOutput(proc.stdout ?? "", 0);
}

const spec = (overrides: Partial<TestSpec> & { expected: string }): TestSpec => ({
  id: "t1",
  name: "test",
  kind: "EXPRESSION",
  expression: null,
  hidden: false,
  ...overrides,
});

describe("python harness", () => {
  it("passes a correct stdout solution", () => {
    const result = run('print("Hello, PlayGame!")', [
      spec({ kind: "STDOUT", expected: "Hello, PlayGame!" }),
    ]);
    expect(result.passed).toBe(true);
    expect(result.stdout.trim()).toBe("Hello, PlayGame!");
    expect(result.passedCount).toBe(1);
  });

  it("ignores trailing whitespace differences", () => {
    const result = run('print("a  ")\nprint("b")', [spec({ kind: "STDOUT", expected: "a\nb\n" })]);
    expect(result.passed).toBe(true);
  });

  it("fails when the output is wrong", () => {
    const result = run('print("nope")', [spec({ kind: "STDOUT", expected: "Hello" })]);
    expect(result.passed).toBe(false);
    expect(result.results[0].message).toMatch(/did not match/);
  });

  it("evaluates expression tests against the learner namespace", () => {
    const result = run("def double(x):\n    return x * 2\n", [
      spec({ id: "a", name: "double(2)", expression: "double(2)", expected: "4" }),
      spec({ id: "b", name: "double(0)", expression: "double(0)", expected: "0" }),
    ]);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it("compares dicts and lists structurally, not textually", () => {
    const result = run("def stats():\n    return {'max': 4, 'min': 1}\n", [
      spec({ expression: "stats()", expected: "{'min': 1, 'max': 4}" }),
    ]);
    expect(result.passed).toBe(true);
  });

  it("treats close floats as equal", () => {
    const result = run("value = 0.1 + 0.2\n", [spec({ expression: "value", expected: "0.30000000000000004" })]);
    expect(result.passed).toBe(true);
  });

  it("reports a traceback instead of crashing", () => {
    const result = run("undefined_name + 1", [spec({ expression: "1", expected: "1" })]);
    expect(result.passed).toBe(false);
    expect(result.error).toContain("NameError");
    expect(result.results[0].message).toMatch(/before this test could run/);
  });

  it("captures errors raised inside a test expression", () => {
    const result = run("def boom():\n    raise ValueError('bad')\n", [spec({ expression: "boom()", expected: "1" })]);
    expect(result.passed).toBe(false);
    expect(result.results[0].message).toContain("ValueError");
  });

  it("survives code containing quotes, braces and backslashes", () => {
    const code = 'text = """a {b} \\\\ \'c\' """\nprint(len(text) > 0)\n';
    const result = run(code, [spec({ kind: "STDOUT", expected: "True" })]);
    expect(result.passed).toBe(true);
  });

  it("marks a run without any test as failed", () => {
    const result = run('print("hi")', []);
    expect(result.passed).toBe(false);
    expect(result.totalCount).toBe(0);
  });

  it("surfaces a missing payload as a sandbox error", () => {
    const result = parseHarnessOutput("garbage", 5);
    expect(result.passed).toBe(false);
    expect(result.error).toMatch(/no result payload/);
  });
});
