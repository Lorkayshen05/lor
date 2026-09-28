import { Search } from "lucide-react";

export function SearchBar({ defaultValue, className }: { defaultValue?: string; className?: string }) {
  return (
    <form action="/products" method="get" className={className} role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="搜索猪肉、鸡肉、海鲜..."
          className="w-full rounded-full border border-ink-100 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>
    </form>
  );
}
