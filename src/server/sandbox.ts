import "server-only";
import { buildHarness, parseHarnessOutput } from "@/lib/python/harness";
import type { RunResult, TestSpec } from "@/lib/python/types";

const SERVICE_URL = process.env.SANDBOX_SERVICE_URL;

/**
 * True when an external sandbox service is configured. In that mode the server
 * re-runs every test (including hidden ones) and the client result is advisory.
 * The app server itself never executes learner code in either mode.
 */
export const serverVerificationEnabled = Boolean(SERVICE_URL);

export async function verifyInSandbox(code: string, tests: TestSpec[]): Promise<RunResult | null> {
  if (!SERVICE_URL) return null;

  const program = buildHarness(code, tests);
  const started = Date.now();
  const response = await fetch(SERVICE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.SANDBOX_SERVICE_TOKEN ? { authorization: `Bearer ${process.env.SANDBOX_SERVICE_TOKEN}` } : {}),
    },
    body: JSON.stringify({ language: "python", program, timeoutMs: 15_000 }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Sandbox service responded with ${response.status}`);
  }

  const payload = (await response.json()) as { stdout?: string; stderr?: string };
  return parseHarnessOutput(payload.stdout ?? "", Date.now() - started);
}
