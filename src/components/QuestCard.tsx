import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { DifficultyTag } from "@/components/DifficultyTag";

export function QuestCard({
  id,
  title,
  description,
  difficulty,
  completed,
}: {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  completed: boolean;
}) {
  return (
    <Link
      href={`/quest/${id}`}
      className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:border-primary/50"
    >
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h4 className="font-medium text-foreground">{title}</h4>
          {completed && <CheckCircle2 className="h-4 w-4 text-success" />}
        </div>
        <p className="mb-2 text-sm text-muted">{description}</p>
        <DifficultyTag difficulty={difficulty} />
      </div>
    </Link>
  );
}
