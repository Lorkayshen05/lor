import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProgressBar } from "@/components/ProgressBar";

export function CourseCard({
  slug,
  title,
  description,
  icon,
  completedQuests,
  totalQuests,
}: {
  slug: string;
  title: string;
  description: string;
  icon: string;
  completedQuests: number;
  totalQuests: number;
}) {
  return (
    <Link
      href={`/course/${slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon name={icon} />
        </div>
        <h3 className="font-semibold text-foreground group-hover:text-primary">{title}</h3>
      </div>
      <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted">{description}</p>
      <ProgressBar value={completedQuests} max={Math.max(totalQuests, 1)} label="Progress" />
    </Link>
  );
}
