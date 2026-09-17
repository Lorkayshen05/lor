"use client";

import { buildHarness, parseHarnessOutput } from "./harness";
import { emptyRunResult, type RunResult, type TestSpec } from "./types";

let worker: Worker | null = null;
let nextId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/sandbox-worker.js", { type: "module" });
  }
  return worker;
}

/** Drops the worker so the next run starts from a clean interpreter. */
export function resetSandbox() {
  worker?.terminate();
  worker = null;
}

export function warmUpSandbox() {
  getWorker();
}

/**
 * Runs the learner's code against the given tests inside the browser sandbox.
 * A run that exceeds the timeout kills the worker (this is how infinite loops end).
 */
export function runTests(code: string, tests: TestSpec[], timeoutMs = 25_000): Promise<RunResult> {
  const program = buildHarness(code, tests);
  const id = `run-${nextId++}`;
  const started = Date.now();

  return new Promise((resolve) => {
    const active = getWorker();

    const timer = setTimeout(() => {
      cleanup();
      resetSandbox();
      resolve(emptyRunResult(`Timed out after ${Math.round(timeoutMs / 1000)}s — check for an infinite loop.`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      active.removeEventListener("message", onMessage);
      active.removeEventListener("error", onError);
    }

    function onMessage(event: MessageEvent) {
      const data = event.data as { id?: string; ok?: boolean; stdout?: string; stderr?: string };
      if (data?.id !== id) return;
      cleanup();

      if (!data.ok) {
        resolve(emptyRunResult(data.stderr || "The sandbox failed to run your code."));
        return;
      }

      try {
        const result = parseHarnessOutput(data.stdout ?? "", Date.now() - started);
        resolve({ ...result, stderr: result.stderr || (data.stderr ?? "") });
      } catch {
        resolve(emptyRunResult(data.stderr || "The sandbox returned an unreadable result."));
      }
    }

    function onError(event: ErrorEvent) {
      cleanup();
      resetSandbox();
      resolve(emptyRunResult(event.message || "The sandbox worker crashed."));
    }

    active.addEventListener("message", onMessage);
    active.addEventListener("error", onError);
    active.postMessage({ id, program });
  });
}
