"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { extractPracticeQuestions, type GeneratedQuestion } from "@/lib/materialExtractor";

export function StudyMaterialGenerator() {
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  function generate() {
    setQuestions(extractPracticeQuestions(text));
    setRevealed({});
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        Paste text from your lecture slides, assignment brief, or rubric. Practice questions are generated only from
        what you paste — nothing is invented.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste lecture or assignment text here…"
        className="h-28 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-sm text-foreground outline-none focus:border-primary"
      />
      <button
        onClick={generate}
        disabled={text.trim().length < 20}
        className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Wand2 className="h-4 w-4" /> Generate Practice Questions
      </button>

      {questions && (
        <div className="mt-4 space-y-2">
          {questions.length === 0 && <p className="text-sm text-muted">Couldn&apos;t find enough content — paste a longer passage.</p>}
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <p className="text-foreground">{q.question}</p>
              {revealed[i] ? (
                <p className="mt-1 text-xs font-medium text-success">Answer: {q.answer}</p>
              ) : (
                <button onClick={() => setRevealed((r) => ({ ...r, [i]: true }))} className="mt-1 text-xs text-primary">
                  Reveal answer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
