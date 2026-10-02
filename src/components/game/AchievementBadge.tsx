import { Icon } from "@/components/ui/Icon";

export function AchievementBadge({
  icon,
  title,
  description,
  unlocked,
}: {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${unlocked ? "border-xp/40 bg-xp/10" : "border-border bg-surface-2 opacity-50"}`}
      title={description}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${unlocked ? "bg-xp/20 text-xp" : "bg-surface text-muted"}`}>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
    </div>
  );
}
