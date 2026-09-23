"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Send, Lightbulb, ArrowRight, Eye, CheckCircle2, XCircle, Swords } from "lucide-react";
import { DifficultyTag } from "@/components/DifficultyTag";
import { Icon } from "@/components/Icon";
import { ProgressBar } from "@/components/ProgressBar";
import type { QuestQuestionView, SubmitResponse, RunResponse } from "@/lib/types";

export function QuestWorkspace({
  questId,
  title,
  description,
  difficulty,
  starterCode,
  xpReward,
  questions,
  initialAttempts,
}: {
  questId: string;
  title: string;
  description: string;
  difficulty: string;
  starterCode: string;
  xpReward: number;
  questions: QuestQuestionView[];
  initialAttempts: number;
}) {
  const [code, setCode] = useState(starterCode);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [hintsShown, setHintsShown] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState(initialAttempts);
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = code.slice(0, start) + "    " + code.slice(end);
    setCode(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 4;
    });
  }

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setRunResult(await res.json());
    } catch {
      setRunResult({ stdout: "", stderr: "Network error while running code.", timedOut: false, exitCode: null });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch(`/api/quest/${questId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data: SubmitResponse = await res.json();
      setSubmitResult(data);
      if (typeof data.attempts === "number") setAttempts(data.attempts);
    } catch {
      setSubmitResult({
        outcomes: [],
        passed: false,
        xpAwarded: 0,
        attempts,
        mastery: 0,
        user: { level: 0, xp: 0, xpToNext: 0, streak: 0 },
        unlockedAchievements: [],
        nextQuestId: null,
        tutorMessage: "",
        error: "Network error while submitting.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevealSolution() {
    setSolutionError(null);
    const res = await fetch(`/api/quest/${questId}/solution`);
    const data = await res.json();
    if (!res.ok) {
      setSolutionError(data.error ?? "Solution not available yet.");
      return;
    }
    setSolution(data.solutionCode);
  }

  const canReveal = attempts >= 3 || submitResult?.passed;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-sm text-muted">
            <Swords className="h-4 w-4" /> <span>Quest</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
        <DifficultyTag difficulty={difficulty} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Instructions</h2>
            <p className="whitespace-pre-wrap text-sm text-muted">{description}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-medium text-muted">main.py</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleTab}
              spellCheck={false}
              className="h-72 w-full resize-none bg-surface p-4 font-mono text-sm text-foreground outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50 disabled:opacity-50"
              >
                <Play className="h-4 w-4" /> {running ? "Running…" : "Run"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit"}
              </button>
              <button
                onClick={() => setHintsShown((h) => ({ ...h, [questions[0]?.id]: true }))}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50"
              >
                <Lightbulb className="h-4 w-4" /> Hint
              </button>
              {canReveal && !solution && (
                <button
                  onClick={handleRevealSolution}
                  className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" /> Reveal Solution
                </button>
              )}
            </div>
          </div>

          {runResult && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Output</h3>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-mono text-xs text-foreground">
                {runResult.stdout || "(no output)"}
                {runResult.stderr && <span className="text-danger">{"\n" + runResult.stderr}</span>}
              </pre>
            </div>
          )}

          {solutionError && <p className="text-xs text-danger">{solutionError}</p>}
          {solution && (
            <div className="rounded-2xl border border-xp/30 bg-xp/5 p-4">
              <h3 className="mb-2 text-sm font-semibold text-xp">Solution</h3>
              <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-foreground">{solution}</pre>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Tests</h3>
            {!submitResult && <p className="text-sm text-muted">Run Submit to check your code against the tests.</p>}
            {submitResult?.error && <p className="text-sm text-danger">{submitResult.error}</p>}
            {submitResult && !submitResult.error && (
              <ul className="space-y-2">
                {submitResult.outcomes.map((o) => (
                  <li key={o.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-2.5 text-sm">
                    {o.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    )}
                    <div>
                      <div className="text-foreground">{o.prompt}</div>
                      {!o.passed && <div className="text-xs text-danger">{o.message}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {questions.map(
            (q) =>
              hintsShown[q.id] && (
                <div key={q.id} className="rounded-xl border border-xp/30 bg-xp/10 p-3 text-sm text-foreground">
                  <span className="font-medium text-xp">Hint: </span>
                  {q.hint || "Break the problem into smaller steps and test one piece at a time."}
                </div>
              )
          )}

          {submitResult && !submitResult.error && (
            <div
              className={`pop-in rounded-2xl border p-4 ${
                submitResult.passed ? "border-success/40 bg-success/10" : "border-danger/30 bg-danger/10"
              }`}
            >
              <h3 className={`mb-1 text-sm font-semibold ${submitResult.passed ? "text-success" : "text-danger"}`}>
                {submitResult.passed ? "Quest Complete!" : "Not quite yet"}
              </h3>
              <p className="mb-2 text-sm text-foreground">{submitResult.tutorMessage}</p>
              {submitResult.passed && submitResult.xpAwarded > 0 && (
                <div className="mb-2 text-lg font-bold text-xp">+{submitResult.xpAwarded} XP</div>
              )}
              {submitResult.unlockedAchievements.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {submitResult.unlockedAchievements.map((a) => (
                    <div key={a.key} className="pop-in flex items-center gap-2 rounded-lg border border-xp/40 bg-xp/10 px-3 py-2">
                      <Icon name={a.icon} className="h-4 w-4 text-xp" />
                      <div>
                        <div className="text-xs font-semibold text-xp">Achievement Unlocked: {a.title}</div>
                        <div className="text-xs text-muted">{a.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {submitResult.passed && (
                <div className="mb-3">
                  <ProgressBar value={submitResult.user.xp} max={submitResult.user.xpToNext} color="xp" label={`Level ${submitResult.user.level}`} />
                </div>
              )}
              {submitResult.passed && submitResult.nextQuestId && (
                <Link
                  href={`/quest/${submitResult.nextQuestId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-2"
                >
                  Next Quest <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {submitResult.passed && !submitResult.nextQuestId && (
                <Link href="/courses" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground">
                  Back to Courses <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted">
            Reward on completion: <span className="font-semibold text-xp">+{xpReward} XP</span> · Attempts so far: {attempts}
          </div>
        </div>
      </div>
    </div>
  );
}
