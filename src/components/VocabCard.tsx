"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import type { VocabWord } from "@/lib/englishContent";

export function VocabCard({ word }: { word: VocabWord }) {
  const [flipped, setFlipped] = useState(false);

  function speak(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(word.word));
  }

  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50"
    >
      {!flipped ? (
        <div className="flex flex-1 flex-col items-start justify-center">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{word.word}</span>
            <span onClick={speak} className="rounded-full p-1 text-muted hover:text-primary" role="button" aria-label="Pronounce">
              <Volume2 className="h-4 w-4" />
            </span>
          </div>
          <span className="text-xs italic text-muted">{word.partOfSpeech}</span>
          <span className="mt-2 text-xs text-muted">Tap to reveal meaning</span>
        </div>
      ) : (
        <div>
          <p className="text-sm text-foreground">{word.meaning}</p>
          <p className="mt-2 text-xs italic text-muted">&ldquo;{word.example}&rdquo;</p>
        </div>
      )}
    </button>
  );
}
