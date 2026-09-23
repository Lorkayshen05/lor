import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface RunResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
}

const MAX_OUTPUT = 20_000;
const TIMEOUT_MS = 5000;

/**
 * Runs untrusted student code in a throwaway temp dir, isolated Python
 * (-I: no user site-packages/env vars, -S: no site module), with a hard
 * wall-clock timeout and no network beyond what the container itself denies.
 * This is process-level isolation, not a full VM sandbox — good enough for
 * an educational MVP; a production deploy should push this to a dedicated
 * worker (e.g. gVisor/Firecracker/Judge0) instead of the main app process.
 */
export async function runPython(code: string, stdin = ""): Promise<RunResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "aiquest-"));
  const file = path.join(dir, "main.py");
  await writeFile(file, code, "utf8");

  try {
    return await new Promise<RunResult>((resolve) => {
      const child = spawn("python3", ["-I", "-S", file], {
        cwd: dir,
        env: { PATH: process.env.PATH ?? "", NODE_ENV: process.env.NODE_ENV } as NodeJS.ProcessEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, TIMEOUT_MS);

      child.stdout.on("data", (chunk) => {
        if (stdout.length < MAX_OUTPUT) stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        if (stderr.length < MAX_OUTPUT) stderr += chunk.toString();
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: String(err), timedOut, exitCode: null });
      });

      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.slice(0, MAX_OUTPUT),
          stderr: (timedOut ? "Execution timed out after 5s.\n" : "") + stderr.slice(0, MAX_OUTPUT),
          timedOut,
          exitCode,
        });
      });

      child.stdin.write(stdin);
      child.stdin.end();
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export interface TestCase {
  id: string;
  prompt: string;
  testCode: string; // python asserting against student's main.py via exec
  hint: string;
}

export interface TestOutcome {
  id: string;
  prompt: string;
  passed: boolean;
  message: string;
}

/**
 * Runs the student's solution once per test case, appending an assertion
 * snippet that imports nothing but re-executes the student code inline so
 * `testCode` can reference whatever names the student defined.
 */
export async function gradeQuest(studentCode: string, tests: TestCase[]): Promise<TestOutcome[]> {
  const outcomes: TestOutcome[] = [];
  for (const test of tests) {
    const program = `${studentCode}\n\n# --- test harness ---\n${test.testCode}\nprint("__PASS__")\n`;
    const result = await runPython(program);
    const passed = !result.timedOut && result.exitCode === 0 && result.stdout.includes("__PASS__");
    outcomes.push({
      id: test.id,
      prompt: test.prompt,
      passed,
      message: passed
        ? "Passed"
        : result.timedOut
          ? "Timed out — check for infinite loops."
          : result.stderr.trim().split("\n").pop() || "Output did not match expectations.",
    });
  }
  return outcomes;
}
