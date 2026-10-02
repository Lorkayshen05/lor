import "server-only";
import { pyRunResultSchema, type PyRunResult } from "./types";

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

/** Trusted server-side re-execution via a Piston instance, used when PISTON_URL is set. */
export async function runOnPiston(
  src: string,
  tests: { name: string; code: string }[],
  expected: string | undefined
): Promise<PyRunResult | null> {
  const base = process.env.PISTON_URL;
  if (!base) return null;

  const driver = `${HARNESS_SRC}\nimport json as __aq_json\nprint(__aq_run(${JSON.stringify(src)}, __aq_json.loads(${JSON.stringify(JSON.stringify(tests))}), ${expected ? JSON.stringify(expected) : "None"}))`;

  const res = await fetch(`${base.replace(/\/$/, "")}/api/v2/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", version: "*", files: [{ content: driver }] }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const stdout: string = data?.run?.stdout ?? "";
  try {
    const parsed = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
    const validated = pyRunResultSchema.safeParse({ ...parsed, timedOut: false });
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}
