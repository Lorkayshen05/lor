"use client";

import { useState } from "react";
import { BookOpen, Headphones, Library, Mic } from "lucide-react";
import { READING_PASSAGES, LISTENING_PASSAGES, VOCABULARY, SPEAKING_PROMPTS } from "@/lib/englishContent";
import { EnglishPracticeCard } from "@/components/EnglishPracticeCard";
import { VocabCard } from "@/components/VocabCard";

const TABS = [
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "vocabulary", label: "Vocabulary", icon: Library },
  { id: "speaking", label: "Speaking", icon: Mic },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function EnglishPage() {
  const [tab, setTab] = useState<TabId>("reading");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">English Training</h1>
        <p className="text-sm text-muted">Listen or read, explain in your own words, get corrected, then retry.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "reading" && (
        <div className="space-y-4">
          {READING_PASSAGES.map((p) => (
            <EnglishPracticeCard
              key={p.id}
              title={p.title}
              text={p.text}
              question={p.question}
              keywords={p.keywords}
              modelAnswer={p.modelAnswer}
              revealTextUpfront
            />
          ))}
        </div>
      )}

      {tab === "listening" && (
        <div className="space-y-4">
          {LISTENING_PASSAGES.map((p) => (
            <EnglishPracticeCard
              key={p.id}
              title={p.title}
              text={p.text}
              question={p.question}
              keywords={p.keywords}
              modelAnswer={p.modelAnswer}
              revealTextUpfront={false}
            />
          ))}
        </div>
      )}

      {tab === "vocabulary" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VOCABULARY.map((w) => (
            <VocabCard key={w.word} word={w} />
          ))}
        </div>
      )}

      {tab === "speaking" && (
        <div className="space-y-4">
          {SPEAKING_PROMPTS.map((p) => (
            <EnglishPracticeCard
              key={p.id}
              title="Explain it"
              text={p.prompt}
              question={p.prompt}
              keywords={p.keywords}
              modelAnswer={p.modelAnswer}
              revealTextUpfront
            />
          ))}
        </div>
      )}
    </div>
  );
}
