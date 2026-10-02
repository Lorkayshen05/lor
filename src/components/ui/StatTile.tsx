import { ReactNode } from "react";

export function StatTile({ icon, label, value, accent = "text-foreground" }: { icon: ReactNode; label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface ${accent}`}>{icon}</div>
      <div>
        <div className={`text-lg font-semibold leading-tight ${accent}`}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
