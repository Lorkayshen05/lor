"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodeEditor } from "@/components/code-editor";
import { TutorPanel } from "@/components/tutor-panel";
import { Badge, Button, Card, DifficultyBadge, ProgressBar } from "@/components/ui";
import { revealHintAction, submitQuestAction } from "@/app/actions/quest";
import { runTests, warmUpSandbox } from "@/lib/python/client-runner";
import type { RunResult, TestSpec } from "@/lib/python/types";
import type { SubmitOutcome } from "@/server/progression";

export type QuestView = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  concept: string;
  instructions: string;
  starterCode: string;
  expectedBehavior: string;
  xp: number;
  hintCount: number;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
};

export type PlayerView = {
  level: number;
  xp: number;
  percent: number;
  xpToNextLevel: number;
  streak: number;
  completed: boolean;
  attempts: number;
};

export function QuestWorkspace({
  quest,
  tests,
  initialCode,
  player,
  nextQuestId,
  serverVerified,
}: {
  quest: QuestView;
  tests: TestSpec[];
  initialCode: string;
  player: PlayerView;
  nextQuestId: string | null;
  serverVerified: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "submitting">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [xpFlash, setXpFlash] = useState<number | null>(null);
  useEffect(() => {
    warmUpSandbox();
  }, []);

  const visibleTests = tests.filter((test) => !test.hidden);

  async function execute(selection: TestSpec[]) {
    const run = await runTests(code, selection);
    setResult(run);
    return run;
  }

  async function handleRun() {
    setStatus("running");
    setMessage(null);
    setOutcome(null);
    await execute(visibleTests.length ? visibleTests : tests);
    setStatus("idle");
  }

  async function handleSubmit() {
    setStatus("submitting");
    setMessage(null);
    const run = await execute(tests);

    const response = await submitQuestAction({
      questId: quest.id,
      code: code,
      stdout: run.stdout,
      stderr: run.stderr,
      error: run.error,
      durationMs: run.durationMs,
      results: run.results,
    });

    if (!response.ok) {
      setMessage(response.error);
      setStatus("idle");
      return;
    }

    setOutcome(response.outcome);
    if (response.outcome.xpAwarded > 0) {
      setXpFlash(response.outcome.xpAwarded);
      setTimeout(() => setXpFlash(null), 1500);
    }
    setStatus("idle");
    router.refresh();
  }

  async function handleHint() {
    const response = await revealHintAction({ questId: quest.id });
    if (!response.ok) {
      setMessage(response.error);
      return;
    }
    setHints((current) => (current.includes(response.hint) ? current : [...current, response.hint]));
  }

  const shownResults = outcome?.results ?? result?.results ?? [];
  const passedCount = shownResults.filter((test) => test.passed).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={quest.difficulty} />
            <Badge>{quest.concept}</Badge>
            <Badge className="text-xp">+{quest.xp} XP</Badge>
            {player.completed ? <Badge className="text-success">Completed</Badge> : null}
            <span className="ml-auto text-xs text-ink-muted">
              {quest.courseTitle} · {quest.lessonTitle}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black">{quest.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{quest.description}</p>

          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-line/70 bg-surface/60 p-4 text-sm">
            {quest.instructions}
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            <span className="font-semibold text-ink">Expected: </span>
            {quest.expectedBehavior}
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-bold">Your solution</h2>
            <span className="text-xs text-ink-muted">Python 3 · runs in your browser</span>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setCode(quest.starterCode)} disabled={status !== "idle"}>
                Reset
              </Button>
              <Button variant="secondary" onClick={handleHint} disabled={quest.hintCount === 0}>
                Hint ({hints.length}/{quest.hintCount})
              </Button>
              <Button variant="secondary" onClick={handleRun} disabled={status !== "idle"}>
                {status === "running" ? "Running…" : "Run"}
              </Button>
              <Button onClick={handleSubmit} disabled={status !== "idle"}>
                {status === "submitting" ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>

          <CodeEditor value={code} onChange={setCode} />

          {hints.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-ink-muted">
              {hints.map((hint, index) => (
                <li key={hint} className="rounded-lg border border-line/60 bg-surface/50 px-3 py-2">
                  <span className="font-semibold text-xp">Hint {index + 1}: </span>
                  {hint}
                </li>
              ))}
            </ul>
          ) : null}

          {message ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {message}
            </p>
          ) : null}
        </Card>

        {result || outcome ? (
          <Card>
            <div className="flex items-center gap-2">
              <h2 className="font-bold">Output</h2>
              {shownResults.length > 0 ? (
                <Badge className={passedCount === shownResults.length ? "text-success" : "text-danger"}>
                  {passedCount}/{shownResults.length} tests passed
                </Badge>
              ) : null}
              {outcome && !outcome.verified && !serverVerified ? (
                <span className="text-[11px] text-ink-muted">graded in your browser sandbox</span>
              ) : null}
            </div>

            <pre className="mt-3 max-h-56 overflow-auto rounded-xl border border-line/70 bg-surface/80 p-3 font-mono text-xs">
              {(result?.stdout || outcome?.stdout || "").trim() || "(no output)"}
            </pre>

            {(result?.error || outcome?.error || result?.stderr || outcome?.stderr) ? (
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-danger/40 bg-danger/10 p-3 font-mono text-xs text-danger">
                {(outcome?.error || result?.error || outcome?.stderr || result?.stderr || "").trim()}
              </pre>
            ) : null}

            {shownResults.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {shownResults.map((test) => (
                  <li
                    key={test.id}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      test.passed ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{test.passed ? "✓" : "✗"}</span>
                      <span className="font-semibold">{test.name}</span>
                      {test.hidden ? <Badge>hidden</Badge> : null}
                    </div>
                    {!test.passed ? (
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        expected {test.expected} · got {test.actual || "nothing"}
                        {test.message ? ` — ${test.message}` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        {outcome ? (
          <Card className={outcome.passed ? "border-success/50" : "border-danger/50"}>
            {outcome.passed ? (
              <div className="space-y-3">
                <p className="text-lg font-black text-success">
                  Quest cleared! {outcome.alreadyCompleted ? "(already completed — no extra XP)" : `+${outcome.xpAwarded} XP`}
                </p>
                <p className="text-sm text-ink-muted">
                  Level {outcome.level} · {outcome.totalXp} XP · streak {outcome.streak} day{outcome.streak === 1 ? "" : "s"} ·
                  mastery {Math.round(outcome.mastery * 100)}%
                </p>
                {outcome.leveledUp ? <p className="text-sm font-bold text-xp">⬆ Level up! You are now level {outcome.level}.</p> : null}
                {outcome.unlocked.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {outcome.unlocked.map((achievement) => (
                      <li key={achievement.code} className="rounded-full border border-xp/40 bg-xp/10 px-3 py-1 text-xs font-semibold text-xp">
                        {achievement.icon} {achievement.title} (+{achievement.xpReward} XP)
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {nextQuestId ? (
                    <Link
                      href={`/quest/${nextQuestId}`}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-soft"
                    >
                      Next quest →
                    </Link>
                  ) : null}
                  <Link
                    href={`/lesson/${quest.lessonId}`}
                    className="rounded-lg border border-line bg-surface-3 px-4 py-2 text-sm font-semibold hover:bg-line"
                  >
                    Back to lesson
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-danger">Not yet — {passedCount}/{shownResults.length} tests passed</p>
                <p className="text-sm text-ink-muted">
                  Read the first failing test above, then use the tutor&apos;s Debug action. Attempt {player.attempts + 1}.
                </p>
              </div>
            )}
          </Card>
        ) : null}
      </div>

      <aside className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Level</p>
              <p className="text-3xl font-black">{outcome?.level ?? player.level}</p>
            </div>
            <div className="relative text-right">
              <p className="text-xs uppercase tracking-wide text-ink-muted">XP</p>
              <p className="text-3xl font-black text-xp">{outcome?.totalXp ?? player.xp}</p>
              {xpFlash ? (
                <span className="animate-xp-pop absolute -top-5 right-0 text-sm font-black text-xp">+{xpFlash}</span>
              ) : null}
            </div>
          </div>
          <ProgressBar percent={player.percent} className="mt-3" />
          <p className="mt-2 text-xs text-ink-muted">
            {player.xpToNextLevel} XP to level {player.level + 1} · 🔥 {outcome?.streak ?? player.streak} day streak
          </p>
        </Card>

        <TutorPanel
          questId={quest.id}
          getCode={() => code}
          getError={() => outcome?.error ?? result?.error ?? null}
        />

        <Card>
          <h2 className="font-bold">Sandbox</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Your code runs in a WebAssembly Python interpreter inside this browser tab. It has no network, no filesystem
            and no access to the server.
            {serverVerified ? " Submissions are re-run and graded by the sandbox service." : ""}
          </p>
        </Card>
      </aside>
    </div>
  );
}
