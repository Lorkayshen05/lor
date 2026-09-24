"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { useAiTutorContext } from "@/components/tutor/AiTutorProvider";
import type { ClientQuizVariant } from "@/lib/quiz";

interface UnlockedAchievement {
  key: string;
  title: string;
  description: string;
  icon: string;
}

interface AnswerResponse {
  correct: boolean;
  feedback: string;
  rule: string;
  retry?: { variantIndex: 0 | 1 } & ClientQuizVariant;
  allSlotsSolved?: boolean;
  xpAwarded?: number;
  mastery?: number | null;
  level?: { level: number; xpIntoLevel: number; xpToNextLevel: number } | null;
  unlockedAchievements?: UnlockedAchievement[];
  nextQuestId?: string | null;
}

export function QuizQuestWorkspace({
  questId,
  title,
  topic,
  slots,
}: {
  questId: string;
  title: string;
  topic: string;
  slots: ClientQuizVariant[]; // variant 0 of each slot, to start
}) {
  const [activeVariant, setActiveVariant] = useState<Record<number, ClientQuizVariant & { variantIndex: 0 | 1 }>>(
    Object.fromEntries(slots.map((v, i) => [i, { ...v, variantIndex: 0 as const }]))
  );
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Record<number, { text: string; rule: string; correct: boolean } | undefined>>({});
  const [submittingSlot, setSubmittingSlot] = useState<number | null>(null);
  const [completion, setCompletion] = useState<AnswerResponse | null>(null);

  const { setCurrentQuest } = useAiTutorContext();
  useEffect(() => {
    setCurrentQuest({ questId, title, topic });
  }, [questId, title, topic, setCurrentQuest]);

  async function answer(slotIndex: number, optionIndex: number) {
    setSubmittingSlot(slotIndex);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, slotIndex, variantIndex: activeVariant[slotIndex].variantIndex, optionIndex }),
      });
      const data: AnswerResponse = await res.json();
      setFeedback((f) => ({ ...f, [slotIndex]: { text: data.feedback, rule: data.rule, correct: data.correct } }));

      if (data.correct) {
        setSolved((s) => new Set(s).add(slotIndex));
        if (data.allSlotsSolved) setCompletion(data);
      } else if (data.retry) {
        setActiveVariant((v) => ({ ...v, [slotIndex]: data.retry! }));
      }
    } finally {
      setSubmittingSlot(null);
    }
  }

  return (
    <div className="space-y-4">
      {slots.map((_, slotIndex) => {
        const variant = activeVariant[slotIndex];
        const isSolved = solved.has(slotIndex);
        const fb = feedback[slotIndex];
        return (
          <div key={slotIndex} className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted">
              {isSolved ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
              Question {slotIndex + 1} of {slots.length}
            </div>
            <p className="mb-3 whitespace-pre-wrap text-sm font-medium text-foreground">{variant.prompt}</p>
            <div className="space-y-2">
              {variant.options.map((opt, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => answer(slotIndex, optIndex)}
                  disabled={isSolved || submittingSlot === slotIndex}
                  className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm text-foreground hover:border-primary/50 disabled:opacity-60"
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {fb && (
              <div className={`pop-in mt-3 rounded-lg border p-3 text-sm ${fb.correct ? "border-success/40 bg-success/10" : "border-danger/30 bg-danger/10"}`}>
                <p className={fb.correct ? "text-success" : "text-danger"}>{fb.text}</p>
                <p className="mt-1 text-xs text-muted">Rule: {fb.rule}</p>
                {!fb.correct && !isSolved && <p className="mt-1 text-xs text-foreground">Try the retry version above.</p>}
              </div>
            )}
          </div>
        );
      })}

      {completion && (
        <div className="pop-in rounded-2xl border border-success/40 bg-success/10 p-4">
          <h4 className="mb-1 text-sm font-semibold text-success">Quest Complete!</h4>
          {(completion.xpAwarded ?? 0) > 0 && <div className="xp-pop mb-2 text-lg font-bold text-xp">+{completion.xpAwarded} XP</div>}
          {completion.mastery != null && <p className="mb-2 text-sm text-foreground">Mastery: {completion.mastery}%</p>}
          {completion.level && (
            <div className="mb-3">
              <ProgressBar value={completion.level.xpIntoLevel} max={completion.level.xpToNextLevel} color="xp" label={`Level ${completion.level.level}`} />
            </div>
          )}
          {(completion.unlockedAchievements ?? []).length > 0 && (
            <div className="mb-3 space-y-1.5">
              {completion.unlockedAchievements!.map((a) => (
                <div key={a.key} className="flex items-center gap-2 rounded-lg border border-xp/40 bg-xp/10 px-3 py-2">
                  <Icon name={a.icon} className="h-4 w-4 text-xp" />
                  <div>
                    <div className="text-xs font-semibold text-xp">Achievement Unlocked: {a.title}</div>
                    <div className="text-xs text-muted">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {completion.nextQuestId ? (
            <Link href={`/quest/${completion.nextQuestId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-2">
              Next Quest
            </Link>
          ) : (
            <Link href="/courses" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground">
              Back to Courses
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
