import Link from "next/link";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { categories } from "@/config/categories";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function Footer() {
  const year = new Date().getFullYear();
  const whatsappLink = buildWhatsAppLink(`您好，我想咨询${siteConfig.name}的商品。`);

  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-900 text-cream-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <h3 className="font-display text-lg font-bold text-white">{siteConfig.name}</h3>
          <p className="mt-2 text-sm text-cream-300/80">{siteConfig.tagline}</p>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp 咨询
          </a>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cream-300/60">商品分类</h4>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/products?category=${category.slug}`} className="text-cream-300/90 hover:text-white">
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cream-300/60">联系我们</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-cream-300/90">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{siteConfig.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <a href={`tel:${siteConfig.phone}`} className="hover:text-white">
                {siteConfig.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{siteConfig.businessHours}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-cream-300/60 sm:flex-row sm:px-6 lg:px-8">
          <span>
            &copy; {year} {siteConfig.name}. All rights reserved.
          </span>
          <Link href="/admin/login" className="hover:text-white">
            商家登录
          </Link>
        </div>
      </div>
    </footer>
  );
}
