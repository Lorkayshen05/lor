import Link from "next/link";

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      {page > 1 ? <Link className="btn btn-outline btn-sm" rel="prev" href={hrefFor(page - 1)}>← Previous</Link> : <span />}
      <span className="text-sm text-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link className="btn btn-outline btn-sm" rel="next" href={hrefFor(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
