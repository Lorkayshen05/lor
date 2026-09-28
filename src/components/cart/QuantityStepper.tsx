"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="inline-flex items-center rounded-full border border-ink-100 bg-white">
      <button
        type="button"
        aria-label="减少数量"
        className={cn(
          "flex items-center justify-center rounded-full text-ink-600 transition hover:text-brand-600 disabled:opacity-30",
          buttonSize
        )}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn("w-8 text-center font-medium tabular-nums", textSize)}>{value}</span>
      <button
        type="button"
        aria-label="增加数量"
        className={cn(
          "flex items-center justify-center rounded-full text-ink-600 transition hover:text-brand-600 disabled:opacity-30",
          buttonSize
        )}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
