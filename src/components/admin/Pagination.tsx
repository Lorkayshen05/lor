import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex items-center justify-between text-sm text-ink-500">
      <span>
        共 {total} 条，第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`flex items-center gap-1 rounded-full border border-ink-100 px-3 py-1.5 ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-cream-200"
          }`}
        >
          <ChevronLeft className="h-4 w-4" /> 上一页
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`flex items-center gap-1 rounded-full border border-ink-100 px-3 py-1.5 ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-cream-200"
          }`}
        >
          下一页 <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
