export default function LoadingAdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-24 animate-pulse rounded bg-ink-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}
