"use client";

import { useRef, useState } from "react";
import { Volume2, Mic, CheckCircle2, RotateCcw, Square } from "lucide-react";

interface CheckResult {
  attemptNumber: number;
  meaningScore: number;
  covered: string[];
  missing: string[];
  grammarIssues: { wrong: string; fix: string; why: string }[];
  passed: boolean;
  naturalVersion: string | null;
  xpAwarded: number;
}

interface SpeechRecognitionEvent extends Event {
  results: { length: number; [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export function ExerciseCard({
  id,
  kind,
  title,
  text,
  question,
  mandarinGloss,
}: {
  id: string;
  kind: "listening" | "reading" | "speaking";
  title: string;
  text: string;
  question: string;
  mandarinGloss?: string;
}) {
  const [transcriptRevealed, setTranscriptRevealed] = useState(kind === "reading");
  const [played, setPlayed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [rate, setRate] = useState(1);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function speak(sourceText: string, speed = rate) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(sourceText);
    utterance.rate = speed;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlayed(true);
  }

  function startListening() {
    const Recognition = window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      setAnswer((prev) => (prev ? prev + " " : "") + e.results[e.results.length - 1][0].transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleCheck() {
    if (!answer.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/english/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: id, transcript: answer }),
      });
      const data: CheckResult = await res.json();
      setResult(data);
    } finally {
      setChecking(false);
    }
  }

  function handleRetry() {
    setAnswer("");
    setResult(null);
  }

  const hasSpeechRecognition = typeof window !== "undefined" && Boolean(window.webkitSpeechRecognition);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>

      {kind === "reading" && <p className="mb-4 text-sm text-muted">{text}</p>}

      {(kind === "listening" || kind === "speaking") && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => speak(text)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50">
              <Volume2 className="h-4 w-4" /> {played ? "Play Again" : kind === "listening" ? "Play Audio" : "Hear the Question"}
            </button>
            {kind === "listening" && (
              <label className="flex items-center gap-1.5 text-xs text-muted">
                Speed
                <input type="range" min={0.6} max={1.4} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-primary" />
                {rate.toFixed(1)}x
              </label>
            )}
          </div>
          {kind === "listening" && transcriptRevealed && <p className="mt-3 text-sm text-muted">{text}</p>}
          {kind === "listening" && !transcriptRevealed && played && (
            <button onClick={() => setTranscriptRevealed(true)} className="mt-2 text-xs text-primary">
              Show transcript
            </button>
          )}
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-foreground">{question}</p>
      {mandarinGloss && <p className="mb-2 text-xs text-muted">{mandarinGloss}</p>}

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={Boolean(result?.passed)}
        placeholder="Explain in your own words…"
        className="h-24 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kind === "speaking" && hasSpeechRecognition && (
          <button
            onClick={listening ? stopListening : startListening}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${listening ? "border-danger/40 text-danger" : "border-border text-foreground hover:border-primary/50"}`}
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {listening ? "Stop" : "Speak"}
          </button>
        )}
        {!result?.passed && (
          <button onClick={handleCheck} disabled={checking} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2 disabled:opacity-50">
            {checking ? "Checking…" : "Check My Answer"}
          </button>
        )}
      </div>

      {result && (
        <div className="pop-in mt-4 space-y-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Meaning score: {result.meaningScore}%</span>
            {result.xpAwarded > 0 && <span className="font-semibold text-xp">+{result.xpAwarded} XP</span>}
          </div>

          {result.passed ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" /> Good — you covered the meaning clearly with no grammar issues.
            </div>
          ) : (
            <>
              {result.missing.length > 0 && (
                <p className="text-foreground">
                  <span className="font-medium text-danger">Meaning check:</span> try to also mention {result.missing.join(", ")}.
                </p>
              )}
              {result.grammarIssues.map((g, i) => (
                <p key={i} className="text-foreground">
                  <span className="font-medium text-xp">Grammar:</span> &ldquo;{g.wrong}&rdquo; → {g.fix}. {g.why}
                </p>
              ))}
              <button onClick={handleRetry} className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                <RotateCcw className="h-3.5 w-3.5" /> Rewrite your answer
              </button>
            </>
          )}

          {result.naturalVersion && (
            <div className="mt-2 border-t border-border pt-2">
              <span className="font-medium text-primary">Natural version: </span>
              {result.naturalVersion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
