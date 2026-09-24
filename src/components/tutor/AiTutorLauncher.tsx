"use client";

import { Sparkles, X } from "lucide-react";
import { useAiTutorContext } from "./AiTutorProvider";
import { AiTutorPanel } from "./AiTutorPanel";

export function AiTutorLauncher() {
  const { open, setOpen } = useAiTutorContext();

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI Tutor" : "Open AI Tutor"}
        className="fixed bottom-[4.75rem] right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-2 md:bottom-6 md:right-6 md:h-14 md:w-14"
      >
        {open ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Sparkles className="h-5 w-5 md:h-6 md:w-6" />}
      </button>

      {open && (
        <div className="fixed inset-x-4 bottom-36 top-20 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-96 md:bottom-24">
          <AiTutorPanel />
        </div>
      )}
    </>
  );
}
