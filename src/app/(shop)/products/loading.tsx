export default function LoadingProducts() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-ink-100" />
        <div className="h-10 w-64 animate-pulse rounded-full bg-ink-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-ink-100/70 bg-white">
            <div className="aspect-square animate-pulse bg-ink-100" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
              <div className="h-5 w-20 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
