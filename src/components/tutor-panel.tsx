"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

const ACTIONS = [
  { id: "explain", label: "Explain" },
  { id: "hint", label: "Hint" },
  { id: "debug", label: "Debug" },
  { id: "review", label: "Review" },
  { id: "practice", label: "Practice" },
  { id: "boss", label: "Boss" },
] as const;

type Action = (typeof ACTIONS)[number]["id"];

export function TutorPanel({
  questId,
  getCode,
  getError,
}: {
  questId?: string;
  getCode?: () => string;
  getError?: () => string | null;
}) {
  const [reply, setReply] = useState<{ title: string; body: string; source: string } | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(action: Action) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          questId,
          code: getCode?.() || undefined,
          error: getError?.() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Tutor is unavailable.");
        return;
      }
      setReply(data);
    } catch {
      setError("Could not reach the tutor.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">AI Tutor</h2>
        {reply ? <span className="text-[11px] text-ink-muted">{reply.source === "claude" ? "Claude" : "offline coach"}</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="secondary"
            onClick={() => ask(action.id)}
            disabled={busy !== null}
            className="px-3 py-1.5 text-xs"
          >
            {busy === action.id ? "…" : action.label}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {reply ? (
        <div className="mt-3 rounded-xl border border-line/70 bg-surface/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-accent-soft">{reply.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{reply.body}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Ask for an explanation, the smallest hint, or a debug of your last error.</p>
      )}
    </Card>
  );
}
