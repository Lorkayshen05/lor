export function Stars({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${count} reviews`}>
      <span aria-hidden="true" className="text-turmeric-500">★</span>
      <span className="font-semibold">{avg.toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </span>
  );
}
