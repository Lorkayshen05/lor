import { RESULT_MARKER, type RunResult, type TestSpec } from "./types";

/**
 * Builds a self-contained Python program that runs the learner's code, captures
 * stdout/stderr, evaluates each test case and prints a JSON result line.
 * The same program runs in the browser Pyodide worker and in an external
 * sandbox service — the app server never executes it.
 */
export function buildHarness(code: string, tests: TestSpec[]): string {
  const payload = JSON.stringify({ code, tests, marker: RESULT_MARKER });
  return `import ast, io, json, sys, traceback

PAYLOAD = json.loads(r"""${payload}""")

def normalize(text):
    return "\\n".join(line.rstrip() for line in str(text).strip().splitlines())

def numeric(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def matches(actual, expected_text):
    expected_text = str(expected_text)
    try:
        expected_value = ast.literal_eval(expected_text)
    except (ValueError, SyntaxError):
        expected_value = None
        has_literal = False
    else:
        has_literal = True
    if has_literal:
        if actual == expected_value:
            return True
        a, b = numeric(actual), numeric(expected_value)
        if a is not None and b is not None and abs(a - b) < 1e-9:
            return True
    return normalize(actual) == normalize(expected_text)

stdout_buffer = io.StringIO()
stderr_buffer = io.StringIO()
namespace = {"__name__": "__main__"}
error = None

real_stdout, real_stderr = sys.stdout, sys.stderr
sys.stdout, sys.stderr = stdout_buffer, stderr_buffer
try:
    exec(compile(PAYLOAD["code"], "solution.py", "exec"), namespace)
except BaseException:
    error = traceback.format_exc(limit=3)
finally:
    sys.stdout, sys.stderr = real_stdout, real_stderr

program_stdout = stdout_buffer.getvalue()
program_stderr = stderr_buffer.getvalue()
results = []

for test in PAYLOAD["tests"]:
    entry = {
        "id": test["id"],
        "name": test["name"],
        "hidden": test["hidden"],
        "expected": test["expected"],
        "actual": "",
        "passed": False,
        "message": "",
    }
    if error is not None:
        entry["message"] = "Your code raised an error before this test could run."
        results.append(entry)
        continue
    try:
        if test["kind"] == "EXPRESSION":
            expression = test.get("expression") or ""
            value = eval(compile(expression, "<test>", "eval"), namespace)
            entry["actual"] = repr(value)
            entry["passed"] = matches(value, test["expected"])
        else:
            entry["actual"] = program_stdout
            entry["passed"] = matches(program_stdout, test["expected"])
    except BaseException:
        entry["message"] = traceback.format_exc(limit=2).strip().splitlines()[-1]
    if not entry["passed"] and not entry["message"]:
        entry["message"] = "Output did not match the expected result."
    results.append(entry)

payload_out = {
    "stdout": program_stdout,
    "stderr": program_stderr,
    "error": error,
    "results": results,
}
print(PAYLOAD["marker"] + json.dumps(payload_out))
`;
}

/** Parses the marker line printed by the harness. */
export function parseHarnessOutput(raw: string, durationMs: number): RunResult {
  const index = raw.lastIndexOf(RESULT_MARKER);
  if (index === -1) {
    return {
      stdout: raw,
      stderr: "Sandbox produced no result payload.",
      error: "Sandbox produced no result payload.",
      results: [],
      passed: false,
      passedCount: 0,
      totalCount: 0,
      durationMs,
    };
  }
  const json = raw.slice(index + RESULT_MARKER.length).trim();
  const parsed = JSON.parse(json) as Pick<RunResult, "stdout" | "stderr" | "error" | "results">;
  const passedCount = parsed.results.filter((r) => r.passed).length;
  return {
    stdout: parsed.stdout ?? "",
    stderr: parsed.stderr ?? "",
    error: parsed.error ?? null,
    results: parsed.results ?? [],
    passed: parsed.results.length > 0 && passedCount === parsed.results.length && !parsed.error,
    passedCount,
    totalCount: parsed.results.length,
    durationMs,
  };
}
