import { TableSkeleton } from "@/components/admin/TableSkeleton";

export default function LoadingAdminProducts() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-ink-100" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-ink-100" />
      </div>
      <TableSkeleton />
    </div>
  );
}
