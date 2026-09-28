import Link from "next/link";
import { Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { SearchBar } from "./SearchBar";
import { CartWidget } from "@/components/cart/CartWidget";
import { CategoryNav } from "./CategoryNav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-cream-50/95 backdrop-blur">
      <div className="hidden bg-ink-900 text-cream-100 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <span>{siteConfig.deliveryNote}</span>
          <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-1.5 hover:text-gold-300">
            <Phone className="h-3.5 w-3.5" />
            {siteConfig.phone}
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-display text-lg font-bold text-white">
              永
            </span>
            <span className="font-display text-lg font-bold leading-tight text-ink-900 sm:text-xl">
              {siteConfig.name}
            </span>
          </Link>

          <div className="hidden flex-1 max-w-md md:block">
            <SearchBar />
          </div>

          <CartWidget />
        </div>

        <div className="mt-3 md:hidden">
          <SearchBar />
        </div>
      </div>

      <CategoryNav />
    </header>
  );
}
