import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-soft shadow-[0_6px_20px_-8px_rgba(124,92,255,0.9)]",
  secondary: "bg-surface-3 text-ink hover:bg-line border border-line",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-3",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line/70 bg-surface-2/70 p-5 backdrop-blur ${className}`}>{children}</div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: "bg-success/15 text-success border-success/30",
  MEDIUM: "bg-info/15 text-info border-info/30",
  HARD: "bg-xp/15 text-xp border-xp/30",
  BOSS: "bg-danger/15 text-danger border-danger/30",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        DIFFICULTY_STYLES[difficulty] ?? "border-line bg-surface-3 text-ink-muted"
      }`}
    >
      {difficulty}
    </span>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full border border-line bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-ink-muted ${className}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-surface-3 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-gradient-to-r from-accent to-info transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface-2/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      {error?.length ? (
        <p className="text-xs text-danger" role="alert">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface/70 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent-soft";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}
