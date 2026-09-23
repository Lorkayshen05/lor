"use client";

import { useState } from "react";
import { Volume2, CheckCircle2, RotateCcw } from "lucide-react";
import { checkEnglishAnswer } from "@/lib/tutor";

export function EnglishPracticeCard({
  title,
  text,
  question,
  keywords,
  modelAnswer,
  revealTextUpfront,
}: {
  title: string;
  text: string;
  question: string;
  keywords: string[];
  modelAnswer: string;
  revealTextUpfront: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{ meaningOk: boolean; missing: string[]; grammarNotes: string[] } | null>(null);
  const [transcriptShown, setTranscriptShown] = useState(revealTextUpfront);
  const [played, setPlayed] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlayed(true);
  }

  async function handleSubmit() {
    if (!answer.trim()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const result = checkEnglishAnswer(answer, keywords);
    setFeedback(result);

    if (!result.meaningOk || result.grammarNotes.length > 0) {
      fetch("/api/mistake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `English: ${title}`,
          detail: result.missing.length ? `Missing: ${result.missing.join(", ")}` : result.grammarNotes.join(" "),
        }),
      }).catch(() => {});
    }
  }

  function handleRetry() {
    setAnswer("");
    setFeedback(null);
  }

  const showModelAnswer = feedback && (feedback.meaningOk && feedback.grammarNotes.length === 0 ? true : attempts >= 2);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>

      {revealTextUpfront ? (
        <p className="mb-4 text-sm text-muted">{text}</p>
      ) : (
        <div className="mb-4">
          <button
            onClick={speak}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50"
          >
            <Volume2 className="h-4 w-4" /> {played ? "Play Again" : "Play Audio"}
          </button>
          {transcriptShown && <p className="mt-3 text-sm text-muted">{text}</p>}
          {!transcriptShown && played && (
            <button onClick={() => setTranscriptShown(true)} className="mt-2 text-xs text-primary">
              Show transcript
            </button>
          )}
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-foreground">{question}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={Boolean(feedback && (feedback.meaningOk && feedback.grammarNotes.length === 0))}
        placeholder="Explain in your own words…"
        className="h-24 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
      />

      {!feedback || !(feedback.meaningOk && feedback.grammarNotes.length === 0) ? (
        <button
          onClick={handleSubmit}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2"
        >
          Check My Answer
        </button>
      ) : null}

      {feedback && (
        <div className="pop-in mt-4 space-y-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
          {feedback.meaningOk && feedback.grammarNotes.length === 0 ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" /> Good — you covered the meaning clearly.
            </div>
          ) : (
            <>
              {feedback.missing.length > 0 && (
                <p className="text-foreground">
                  <span className="font-medium text-danger">Meaning check:</span> try to also mention{" "}
                  {feedback.missing.join(", ")}.
                </p>
              )}
              {feedback.grammarNotes.map((note, i) => (
                <p key={i} className="text-foreground">
                  <span className="font-medium text-xp">Grammar:</span> {note}
                </p>
              ))}
              <button
                onClick={handleRetry}
                className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Rewrite your answer
              </button>
            </>
          )}

          {showModelAnswer && (
            <div className="mt-2 border-t border-border pt-2">
              <span className="font-medium text-accent">Natural version: </span>
              {modelAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
