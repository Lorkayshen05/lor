import Link from "next/link";
import { LayoutDashboard, Package, ClipboardList, LogOut, ExternalLink } from "lucide-react";
import { logout } from "@/app/admin/login/actions";
import { siteConfig } from "@/config/site";

const navItems = [
  { href: "/admin", label: "总览", icon: LayoutDashboard },
  { href: "/admin/products", label: "商品管理", icon: Package },
  { href: "/admin/orders", label: "订单管理", icon: ClipboardList },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-100 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">
            永
          </span>
          <span className="font-display text-sm font-bold leading-tight text-ink-900">{siteConfig.name}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-cream-200 hover:text-ink-900"
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-500 hover:bg-cream-200"
          >
            <ExternalLink className="h-4.5 w-4.5" />
            查看网站
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-500 hover:bg-cream-200"
            >
              <LogOut className="h-4.5 w-4.5" />
              登出
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 md:hidden">
          <span className="font-display text-sm font-bold text-ink-900">{siteConfig.name} 后台</span>
          <div className="flex items-center gap-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-ink-500">
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
            <form action={logout}>
              <button type="submit" aria-label="登出" className="text-ink-500">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
