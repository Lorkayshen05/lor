"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface TutorQuestContext {
  questId: string;
  title: string;
  topic: string; // course title
  code?: string;
  lastRunResult?: { passed: boolean; errorMessage?: string; errorType?: string } | null;
}

interface TutorContextValue {
  currentQuest: TutorQuestContext | null;
  setCurrentQuest: (q: TutorQuestContext | null) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const TutorCtx = createContext<TutorContextValue | null>(null);

export function AiTutorProvider({ children }: { children: ReactNode }) {
  const [currentQuest, setCurrentQuest] = useState<TutorQuestContext | null>(null);
  const [open, setOpen] = useState(false);

  const value = useMemo(() => ({ currentQuest, setCurrentQuest, open, setOpen }), [currentQuest, open]);
  return <TutorCtx.Provider value={value}>{children}</TutorCtx.Provider>;
}

export function useAiTutorContext() {
  const ctx = useContext(TutorCtx);
  if (!ctx) throw new Error("useAiTutorContext must be used within AiTutorProvider");
  return ctx;
}
