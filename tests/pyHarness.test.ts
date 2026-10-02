import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPyodide, type PyodideInterface } from "pyodide";

const HARNESS_SRC = `
import io, json, traceback, contextlib

def __aq_run(src, tests, expected):
    ns = {"__name__": "__main__", "__src__": src}
    def _no_input(*args, **kwargs):
        raise RuntimeError("input() is disabled in this sandbox")
    ns["input"] = _no_input
    stdout_buf = io.StringIO()
    error = None
    try:
        code_obj = compile(src, "main.py", "exec")
        with contextlib.redirect_stdout(stdout_buf):
            exec(code_obj, ns)
    except Exception as e:
        line = None
        for frame in traceback.extract_tb(e.__traceback__):
            if frame.filename == "main.py":
                line = frame.lineno
        error = {"type": type(e).__name__, "message": str(e), "line": line}
    stdout = stdout_buf.getvalue()
    test_results = []
    if error is None:
        for t in tests:
            name = t["name"]
            code = t["code"]
            try:
                test_ns = dict(ns)
                test_ns["_out"] = stdout
                exec(compile(code, "<test>", "exec"), test_ns)
                test_results.append({"name": name, "passed": True, "message": "Passed"})
            except AssertionError as ae:
                test_results.append({"name": name, "passed": False, "message": str(ae) or "Assertion failed"})
            except Exception as e:
                test_results.append({"name": name, "passed": False, "message": f"{type(e).__name__}: {e}"})
    expected_ok = True
    if error is None and expected is not None:
        expected_ok = stdout.strip() == str(expected).strip()
    return json.dumps({"stdout": stdout, "error": error, "tests": test_results, "expectedOk": expected_ok})
`;

let pyodide: PyodideInterface;

test("setup: load pyodide once", async () => {
  pyodide = await loadPyodide({ indexURL: "./node_modules/pyodide/" });
  await pyodide.runPythonAsync(HARNESS_SRC);
});

function run(src: string, tests: { name: string; code: string }[], expected?: string) {
  const fn = pyodide.globals.get("__aq_run");
  try {
    // Mirrors public/pyworker.js exactly: `expected` must stay undefined, never
    // null, or pyodide's JsNull sentinel breaks Python's `is not None` check.
    return JSON.parse(fn(src, pyodide.toPy(tests), expected));
  } finally {
    fn.destroy();
  }
}

test("harness passes correct code with no expected stdout constraint (regression: JsNull bug)", () => {
  const src = "def sum_range(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n";
  const result = run(src, [{ name: "t1", code: "assert sum_range(10) == 55" }], undefined);
  assert.equal(result.error, null);
  assert.equal(result.expectedOk, true, "expectedOk must be true when no expected output is required");
  assert.ok(result.tests[0].passed);
});

test("harness reports a custom f-string assertion message on failure", () => {
  const src = "def sum_range(n):\n    return -1\n";
  const result = run(src, [{ name: "t1", code: 'assert sum_range(10) == 55, f"total should be 55, got {sum_range(10)}"' }]);
  assert.equal(result.tests[0].passed, false);
  assert.equal(result.tests[0].message, "total should be 55, got -1");
});

test("harness captures the error type, message, and line number from main.py", () => {
  const src = "x = 1\ny = undefined_name\n";
  const result = run(src, []);
  assert.equal(result.error.type, "NameError");
  assert.equal(result.error.line, 2);
});

test("harness matches expected stdout when provided", () => {
  const src = 'print("hello")';
  const okResult = run(src, [], "hello");
  assert.equal(okResult.expectedOk, true);
  const badResult = run(src, [], "goodbye");
  assert.equal(badResult.expectedOk, false);
});
