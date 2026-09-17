/**
 * Sandboxed Python runner.
 *
 * Runs in a Web Worker on the learner's machine using Pyodide (CPython compiled
 * to WebAssembly). Learner code therefore executes inside the browser's WASM
 * sandbox — no filesystem, no network, no access to the application server.
 * The server never executes submitted code.
 */
import { loadPyodide } from "/pyodide/pyodide.mjs";

const PACKAGE_BASE_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

let pyodidePromise = null;

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: "/pyodide/",
      // Core runtime is self-hosted; optional wheels (numpy, pandas) come from the CDN.
      packageBaseUrl: PACKAGE_BASE_URL,
    });
  }
  return pyodidePromise;
}

self.onmessage = async (event) => {
  const { id, program } = event.data ?? {};
  if (!id || typeof program !== "string") return;

  try {
    const pyodide = await getPyodide();

    let stdout = "";
    let stderr = "";
    pyodide.setStdout({ batched: (line) => { stdout += line + "\n"; } });
    pyodide.setStderr({ batched: (line) => { stderr += line + "\n"; } });

    try {
      await pyodide.loadPackagesFromImports(program);
    } catch (error) {
      stderr += `Could not load required Python packages: ${error?.message ?? error}\n`;
    }

    await pyodide.runPythonAsync(program);
    self.postMessage({ id, ok: true, stdout, stderr });
  } catch (error) {
    self.postMessage({ id, ok: false, stdout: "", stderr: String(error?.message ?? error) });
  }
};
