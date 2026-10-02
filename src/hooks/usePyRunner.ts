"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PyRunResult } from "@/lib/pyRunner/types";

const RUN_TIMEOUT_MS = 8000;

interface PendingCall {
  resolve: (result: PyRunResult) => void;
}

export function usePyRunner() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingCall>>(new Map());
  const [ready, setReady] = useState(false);

  const spawnWorker = useCallback(() => {
    const worker = new Worker(new URL("/pyworker.js", window.location.origin), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const { id, ok, result, error } = event.data;
      if (id === "__ready__") {
        setReady(true);
        return;
      }
      const pending = pendingRef.current.get(id);
      if (!pending) return;
      pendingRef.current.delete(id);
      if (ok) {
        pending.resolve({ ...result, timedOut: false });
      } else {
        pending.resolve({ stdout: "", error: { type: "WorkerError", message: String(error), line: null }, tests: [], expectedOk: false, timedOut: false });
      }
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    setReady(false);
    const worker = spawnWorker();
    return () => {
      worker.terminate();
    };
  }, [spawnWorker]);

  const run = useCallback(
    (src: string, tests: { name: string; code: string }[], expected?: string): Promise<PyRunResult> => {
      return new Promise((resolve) => {
        const id = crypto.randomUUID();
        pendingRef.current.set(id, { resolve });

        const timer = setTimeout(() => {
          if (!pendingRef.current.has(id)) return; // already resolved
          pendingRef.current.delete(id);
          workerRef.current?.terminate();
          setReady(false);
          spawnWorker(); // fresh worker for the next run
          resolve({
            stdout: "",
            error: { type: "TimeoutError", message: "Your code took longer than 8 seconds to run — check for an infinite loop.", line: null },
            tests: [],
            expectedOk: false,
            timedOut: true,
          });
        }, RUN_TIMEOUT_MS);

        const wrappedResolve = (result: PyRunResult) => {
          clearTimeout(timer);
          resolve(result);
        };
        pendingRef.current.set(id, { resolve: wrappedResolve });

        // Pass `undefined` (never `null`) for "no expected output" — pyodide maps JS
        // `undefined` to Python `None`, but JS `null` becomes a distinct `JsNull` object
        // that fails `is not None` checks in the harness.
        workerRef.current?.postMessage({ id, src, tests, expected });
      });
    },
    [spawnWorker]
  );

  return { run, ready };
}
