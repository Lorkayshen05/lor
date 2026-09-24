"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Send, Lightbulb, RotateCcw, MessageCircleQuestion, CheckCircle2, XCircle } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { usePyRunner } from "@/hooks/usePyRunner";
import { useAiTutorContext } from "@/components/tutor/AiTutorProvider";
import { ERROR_EXPLANATIONS, type PyRunResult } from "@/lib/pyRunner/types";
import { Icon } from "@/components/ui/Icon";

interface CodeTest {
  name: string;
  code: string;
}

interface UnlockedAchievement {
  key: string;
  title: string;
  description: string;
  icon: string;
}

interface SubmitResponse {
  passed: boolean;
  result: PyRunResult;
  verified: "client" | "server";
  attempts: number;
  xpAwarded: number;
  mastery: number | null;
  level: { level: number; xpIntoLevel: number; xpToNextLevel: number } | null;
  streak: { current: number; longest: number } | null;
  unlockedAchievements: UnlockedAchievement[];
  nextQuestId: string | null;
}

export function CodeQuestWorkspace({
  questId,
  title,
  topic,
  starterCode,
  expectedStdout,
  tests,
  totalHints,
}: {
  questId: string;
  title: string;
  topic: string;
  starterCode: string;
  expectedStdout?: string;
  tests: CodeTest[];
  totalHints: number;
}) {
  const [code, setCode] = useState(starterCode);
  const [runResult, setRunResult] = useState<PyRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintError, setHintError] = useState<string | null>(null);

  const { run, ready } = usePyRunner();
  const { setCurrentQuest, setOpen } = useAiTutorContext();

  useEffect(() => {
    setCurrentQuest({
      questId,
      title,
      topic,
      code,
      lastRunResult: runResult ? { passed: !runResult.error, errorMessage: runResult.error?.message, errorType: runResult.error?.type } : null,
    });
  }, [questId, title, topic, code, runResult, setCurrentQuest]);

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    const result = await run(code, [], undefined);
    setRunResult(result);
    setRunning(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitResult(null);
    const clientResult = await run(code, tests, expectedStdout);
    setRunResult(clientResult);

    try {
      const res = await fetch(`/api/quest/${questId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, clientResult }),
      });
      const data: SubmitResponse = await res.json();
      setSubmitResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHint() {
    setHintError(null);
    const res = await fetch(`/api/quest/${questId}/hint`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setHintError(data.error ?? "Try submitting at least once first.");
      return;
    }
    if (data.hint) {
      setHint(data.hint);
      setHintsUsed(data.hintsUsed);
    } else {
      setHintError("No more hints for this quest.");
    }
  }

  function handleReset() {
    setCode(starterCode);
    setRunResult(null);
    setSubmitResult(null);
    setHint(null);
  }

  function handleDebugWithTutor() {
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-medium text-muted">main.py</span>
          {!ready && <span className="text-xs text-muted">Loading Python…</span>}
        </div>
        <CodeEditor value={code} onChange={setCode} onRunShortcut={handleRun} errorLine={runResult?.error?.line ?? null} />
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
          <button onClick={handleRun} disabled={running || !ready} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50 disabled:opacity-50">
            <Play className="h-4 w-4" /> {running ? "Running…" : "Run"}
          </button>
          <button onClick={handleSubmit} disabled={submitting || !ready} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-2 disabled:opacity-50">
            <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit"}
          </button>
          <button onClick={handleHint} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50">
            <Lightbulb className="h-4 w-4" /> Hint ({hintsUsed}/{totalHints})
          </button>
          <button onClick={handleDebugWithTutor} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50">
            <MessageCircleQuestion className="h-4 w-4" /> Debug with Tutor
          </button>
          <button onClick={handleReset} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {hint && (
        <div className="rounded-xl border border-xp/30 bg-xp/10 p-3 text-sm text-foreground">
          <span className="font-medium text-xp">Hint: </span>
          {hint}
        </div>
      )}
      {hintError && <p className="text-xs text-danger">{hintError}</p>}

      {runResult && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Output</h3>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-mono text-xs text-foreground">{runResult.stdout || "(no output)"}</pre>
          {runResult.error && !runResult.timedOut && (
            <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs">
              <p className="font-semibold text-danger">
                {runResult.error.type}
                {runResult.error.line ? ` at line ${runResult.error.line}` : ""}: {runResult.error.message}
              </p>
              <p className="mt-1 text-foreground">{ERROR_EXPLANATIONS[runResult.error.type] ?? "Read the message closely for the exact cause."}</p>
            </div>
          )}
          {runResult.timedOut && (
            <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              Your code took longer than 8 seconds — check for an infinite loop.
            </div>
          )}
        </div>
      )}

      {submitResult && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Test Results</h3>
          <ul className="space-y-2">
            {submitResult.result.tests.map((t, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-2.5 text-sm">
                {t.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
                <div>
                  <div className="text-foreground">{t.name}</div>
                  {!t.passed && <div className="text-xs text-danger">{t.message}</div>}
                </div>
              </li>
            ))}
          </ul>

          <div className={`pop-in mt-4 rounded-2xl border p-4 ${submitResult.passed ? "border-success/40 bg-success/10" : "border-danger/30 bg-danger/10"}`}>
            <h4 className={`mb-1 text-sm font-semibold ${submitResult.passed ? "text-success" : "text-danger"}`}>
              {submitResult.passed ? "Quest Complete!" : "Not quite yet"}
            </h4>
            {submitResult.passed && submitResult.xpAwarded > 0 && <div className="xp-pop mb-2 text-lg font-bold text-xp">+{submitResult.xpAwarded} XP</div>}
            {submitResult.passed && submitResult.mastery !== null && <p className="mb-2 text-sm text-foreground">Mastery: {submitResult.mastery}%</p>}
            {submitResult.passed && submitResult.level && (
              <div className="mb-3">
                <ProgressBar value={submitResult.level.xpIntoLevel} max={submitResult.level.xpToNextLevel} color="xp" label={`Level ${submitResult.level.level}`} />
              </div>
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
            {submitResult.passed && submitResult.nextQuestId && (
              <Link href={`/quest/${submitResult.nextQuestId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-2">
                Next Quest
              </Link>
            )}
            {submitResult.passed && !submitResult.nextQuestId && (
              <Link href="/courses" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground">
                Back to Courses
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
