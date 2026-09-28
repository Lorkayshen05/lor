export default function LoadingProduct() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-ink-100" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square animate-pulse rounded-3xl bg-ink-100" />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-ink-100" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-ink-100" />
          <div className="h-10 w-40 animate-pulse rounded bg-ink-100" />
          <div className="h-20 w-full animate-pulse rounded bg-ink-100" />
        </div>
      </div>
    </div>
  );
}
