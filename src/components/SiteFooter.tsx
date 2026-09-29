import Link from "next/link";
import { NOT_OFFICIAL_NOTICE, SITE } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-pandan-900 text-pandan-100">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="text-lg font-black text-white">Beku<span className="text-turmeric-400">Segar</span></p>
          <p className="mt-2 max-w-md text-sm text-pandan-200">{SITE.tagline}. Local grocery discovery for Kuala Lumpur and Selangor.</p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-pandan-200/90">{NOT_OFFICIAL_NOTICE}</p>
        </div>
        <FooterCol title="Explore" links={[["/stores", "Store directory"], ["/deals", "Deals"], ["/guides", "Guides"], ["/categories/hotpot", "Hotpot ingredients"], ["/kuala-lumpur/frozen-food", "Frozen food in KL"]]} />
        <FooterCol title="Business" links={[["/business", "List your business"], ["/business/claim", "Claim a listing"], ["/login", "Log in"], ["/about", "About & data policy"], ["/privacy", "Privacy"]]} />
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-pandan-200">© {new Date().getFullYear()} {SITE.name}. Independent directory.</div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-bold text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
