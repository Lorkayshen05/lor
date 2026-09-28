export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="h-11 border-b border-ink-100 bg-cream-50" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-ink-50 px-4 py-4 last:border-0">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-ink-100" />
          <div className="h-4 flex-1 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>
  );
}
