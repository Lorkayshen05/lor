import { Swords } from "lucide-react";

const STYLES: Record<string, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-xp/15 text-xp",
  hard: "bg-danger/15 text-danger",
  boss: "bg-accent/20 text-accent",
};

const XP: Record<string, number> = { easy: 10, medium: 20, hard: 40, boss: 100 };

export function DifficultyTag({ difficulty }: { difficulty: string }) {
  const style = STYLES[difficulty] ?? STYLES.easy;
  const label = difficulty === "boss" ? "Boss" : difficulty[0].toUpperCase() + difficulty.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {difficulty === "boss" && <Swords className="h-3 w-3" aria-hidden="true" />}
      {label} · +{XP[difficulty] ?? 10} XP
    </span>
  );
}
