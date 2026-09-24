import { loadPyodide } from "/pyodide/pyodide.mjs";

// Shared harness: runs student code in its own namespace, captures stdout,
// disables input(), records {type, message, line} for any error (line taken
// from the "main.py" frame), then runs each test snippet against that same
// namespace with `_out` bound to the captured stdout.
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

const pyodideReady = loadPyodide({ indexURL: "/pyodide/" }).then(async (pyodide) => {
  await pyodide.runPythonAsync(HARNESS_SRC);
  return pyodide;
});

self.onmessage = async (event) => {
  const { id, src, tests, expected } = event.data;
  try {
    const pyodide = await pyodideReady;
    const run = pyodide.globals.get("__aq_run");
    // `expected` must stay `undefined` (not `null`) when absent — pyodide maps JS
    // `undefined` to Python `None`, but `null` becomes a `JsNull` object instead.
    const resultJson = run(src, pyodide.toPy(tests ?? []), expected);
    run.destroy();
    self.postMessage({ id, ok: true, result: JSON.parse(resultJson) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

self.postMessage({ id: "__ready__", ok: true, result: null });
