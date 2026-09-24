"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";

interface ExtractedQuestion {
  question: string;
  answer: string;
  quote: string;
}
interface Extraction {
  concepts: string[];
  marks: string[];
  practiceQuestions: ExtractedQuestion[];
  examQuestions: ExtractedQuestion[];
}

export function MaterialExtractor() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/cgpa/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(res.ok ? data : null);
      setRevealed({});
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        Paste lecture slides, a rubric, or an assignment brief (or upload a .txt/.md file below). Every concept, mark, and question is quoted verbatim
        from what you paste — nothing is invented.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste material here…"
        className="h-28 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-sm text-foreground outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".txt,.md"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setText(await file.text());
          }}
          className="text-xs text-muted"
        />
        <button onClick={generate} disabled={text.trim().length < 20 || loading} className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
          <Wand2 className="h-4 w-4" /> {loading ? "Analyzing…" : "Analyze Material"}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Important Concepts</h4>
            {result.concepts.length === 0 ? (
              <p className="text-xs text-muted">Not in the material.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-foreground">
                {result.concepts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Marks / Requirements</h4>
            {result.marks.length === 0 ? (
              <p className="text-xs text-muted">Not in the material.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-foreground">
                {result.marks.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Practice Questions</h4>
            {result.practiceQuestions.length === 0 && <p className="text-xs text-muted">Not in the material.</p>}
            <div className="space-y-1.5">
              {result.practiceQuestions.map((q, i) => (
                <QuestionRow key={`p${i}`} q={q} id={`p${i}`} revealed={revealed} setRevealed={setRevealed} />
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Exam Questions</h4>
            {result.examQuestions.length === 0 && <p className="text-xs text-muted">Not in the material.</p>}
            <div className="space-y-1.5">
              {result.examQuestions.map((q, i) => (
                <QuestionRow key={`e${i}`} q={q} id={`e${i}`} revealed={revealed} setRevealed={setRevealed} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  q,
  id,
  revealed,
  setRevealed,
}: {
  q: ExtractedQuestion;
  id: string;
  revealed: Record<string, boolean>;
  setRevealed: (fn: (r: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
      <p className="text-foreground">{q.question}</p>
      {revealed[id] ? (
        <p className="mt-1 text-xs font-medium text-success">Answer: {q.answer}</p>
      ) : (
        <button onClick={() => setRevealed((r) => ({ ...r, [id]: true }))} className="mt-1 text-xs text-primary">
          Reveal answer
        </button>
      )}
    </div>
  );
}
