export function ProgressBar({
  value,
  max,
  color = "primary",
  height = "h-2.5",
  label,
  ariaLabel,
}: {
  value: number;
  max: number;
  color?: "primary" | "xp" | "success" | "accent";
  height?: string;
  label?: string;
  ariaLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colorClass = { primary: "bg-primary", xp: "bg-xp", success: "bg-success", accent: "bg-accent" }[color];

  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className={`w-full ${height} overflow-hidden rounded-full bg-surface-2`}
        role="progressbar"
        aria-label={ariaLabel ?? label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={`xp-bar-fill h-full rounded-full ${colorClass}`} style={{ "--xp-to": `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}
