"use client";

import { useState } from "react";
import { Headphones, BookOpen, Library, Mic } from "lucide-react";
import { ENGLISH_EXERCISES, VOCABULARY } from "@/content/english";
import { ExerciseCard } from "@/components/english/ExerciseCard";
import { VocabCard } from "@/components/english/VocabCard";

const TABS = [
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "vocabulary", label: "Vocabulary", icon: Library },
  { id: "speaking", label: "Speaking", icon: Mic },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function EnglishPage() {
  const [tab, setTab] = useState<TabId>("listening");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">English Training</h1>
        <p className="text-sm text-muted">Listen or read, explain in your own words, get corrected, then rewrite.</p>
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

      {tab === "vocabulary" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VOCABULARY.map((w) => (
            <VocabCard key={w.word} word={w} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {ENGLISH_EXERCISES.filter((e) => e.kind === tab).map((e) => (
            <ExerciseCard key={e.id} id={e.id} kind={e.kind} title={e.title} text={e.text} question={e.question} mandarinGloss={e.mandarinGloss} />
          ))}
        </div>
      )}
    </div>
  );
}
