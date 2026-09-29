import Link from "next/link";
import { SITE } from "@/config/site";

const NAV = [
  { href: "/stores", label: "Stores" },
  { href: "/categories/chicken-breast", label: "Categories" },
  { href: "/deals", label: "Deals" },
  { href: "/guides", label: "Guides" },
];

function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#18653e" />
        <path d="M16 6v20M7.3 11l17.4 10M7.3 21l17.4-10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3" fill="#f4b73a" />
      </svg>
      <span className="text-lg font-black tracking-tight text-pandan-900">
        Beku<span className="text-chili-600">Segar</span>
      </span>
    </span>
  );
}

/** No cookie/session reads here on purpose: it keeps every public page statically cacheable. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${SITE.name} home`}><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm font-semibold text-ink hover:text-pandan-700">{n.label}</Link>
          ))}
          <Link href="/business" className="btn btn-primary btn-sm">For businesses</Link>
        </nav>
        <details className="group relative md:hidden">
          <summary className="btn btn-outline btn-sm list-none [&::-webkit-details-marker]:hidden" aria-label="Open menu">Menu ☰</summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-white p-2 shadow-lg">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-3 text-sm font-semibold hover:bg-pandan-50">{n.label}</Link>
            ))}
            <Link href="/business" className="block rounded-lg px-3 py-3 text-sm font-semibold text-pandan-700 hover:bg-pandan-50">For businesses</Link>
            <Link href="/login" className="block rounded-lg px-3 py-3 text-sm text-muted hover:bg-pandan-50">Log in</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
