"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import type { TutorMode } from "@/lib/tutor";

const MODES: { mode: TutorMode; label: string }[] = [
  { mode: "teach", label: "Teach" },
  { mode: "quiz", label: "Quiz" },
  { mode: "practice", label: "Practice" },
  { mode: "hint", label: "Hint" },
  { mode: "debug", label: "Debug" },
  { mode: "review", label: "Review" },
  { mode: "exam", label: "Exam" },
  { mode: "boss", label: "Boss" },
];

interface ChatEntry {
  from: "tutor" | "student";
  text: string;
}

/** Renders the tutor's minimal `**bold**` markdown without a full parser dependency. */
function renderFormatted(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function AiTutorPanel({
  topic,
  hint,
  errorOutput,
  attempts,
}: {
  topic: string;
  hint?: string;
  errorOutput?: string;
  attempts?: number;
}) {
  const [entries, setEntries] = useState<ChatEntry[]>([
    { from: "tutor", text: `Hi! I'm your AI Tutor for **${topic}**. Pick a mode below, or ask me anything about this quest.` },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<TutorMode | null>(null);

  async function ask(mode: TutorMode, studentAnswer?: string) {
    setLoading(true);
    setActiveMode(mode);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, topic, hint, errorOutput, attempts, studentAnswer }),
      });
      const data = await res.json();
      setEntries((prev) => [
        ...prev,
        ...(studentAnswer ? [{ from: "student" as const, text: studentAnswer }] : []),
        { from: "tutor", text: data.message + (data.followUp ? `\n\n${data.followUp}` : "") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    if (!draft.trim()) return;
    ask("quiz", draft.trim());
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Tutor</h3>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
        {MODES.map((m) => (
          <button
            key={m.mode}
            onClick={() => ask(m.mode)}
            disabled={loading}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              activeMode === m.mode ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {entries.map((entry, i) => (
          <div
            key={i}
            className={`pop-in max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 ${
              entry.from === "tutor" ? "bg-surface-2 text-foreground" : "ml-auto bg-primary/20 text-foreground"
            }`}
          >
            {renderFormatted(entry.text)}
          </div>
        ))}
        {loading && <div className="text-xs text-muted">AI Tutor is thinking…</div>}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Explain your answer or ask a question…"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
