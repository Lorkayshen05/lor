import { TableSkeleton } from "@/components/admin/TableSkeleton";

export default function LoadingAdminOrders() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-32 animate-pulse rounded bg-ink-100" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-ink-100" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
