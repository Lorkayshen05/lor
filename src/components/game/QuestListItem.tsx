import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { DifficultyTag } from "@/components/ui/DifficultyTag";

export function QuestListItem({
  id,
  title,
  description,
  difficulty,
  completed,
  mastery,
}: {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  completed: boolean;
  mastery: number | null;
}) {
  return (
    <Link href={`/quest/${id}`} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:border-primary/50">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="font-medium text-foreground">{title}</h4>
          {completed && <CheckCircle2 className="h-4 w-4 text-success" aria-label="Completed" />}
        </div>
        <p className="mb-2 text-sm text-muted">{description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyTag difficulty={difficulty} />
          {completed && mastery !== null && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">Mastery {mastery}%</span>}
        </div>
      </div>
    </Link>
  );
}
