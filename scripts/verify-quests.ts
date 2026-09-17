/**
 * Runs every seeded quest solution against its own test cases using the same
 * harness the sandbox uses. Catches broken seed content before it ships.
 * Requires a local `python3` (dev tooling only — the app server never runs user code).
 */
import { spawnSync } from "node:child_process";
import { buildHarness, parseHarnessOutput } from "../src/lib/python/harness";
import type { TestSpec } from "../src/lib/python/types";
import { SEED_COURSES } from "../prisma/content";

let failures = 0;
let checked = 0;

for (const course of SEED_COURSES) {
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      for (const quest of lesson.quests) {
        const tests: TestSpec[] = quest.tests.map((test, index) => ({
          id: `${quest.slug}-${index}`,
          name: test.name,
          kind: test.kind,
          expression: test.expression ?? null,
          expected: test.expected,
          hidden: Boolean(test.hidden),
        }));
        const program = buildHarness(quest.solution, tests);
        const started = Date.now();
        const proc = spawnSync("python3", ["-c", program], { encoding: "utf8", timeout: 60_000 });
        const result = parseHarnessOutput(proc.stdout ?? "", Date.now() - started);
        checked += 1;
        if (!result.passed) {
          failures += 1;
          console.error(`✗ ${course.slug}/${quest.slug}`);
          if (result.error) console.error(`  error: ${result.error.trim().split("\n").slice(-1)[0]}`);
          if (proc.stderr?.trim()) console.error(`  stderr: ${proc.stderr.trim().split("\n").slice(-1)[0]}`);
          for (const test of result.results.filter((t) => !t.passed)) {
            console.error(`  test "${test.name}": expected ${test.expected} got ${test.actual || "<nothing>"} ${test.message}`);
          }
        }
      }
    }
  }
}

console.log(`${checked - failures}/${checked} quest solutions pass their tests`);
if (failures > 0) process.exit(1);
