"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Languages,
  GraduationCap,
  Rocket,
  Trophy,
  User,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Swords,
  Flame,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { logoutAction } from "@/lib/auth/actions";
import { AiTutorProvider } from "@/components/tutor/AiTutorProvider";
import { AiTutorLauncher } from "@/components/tutor/AiTutorLauncher";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, bottomNav: true },
  { href: "/courses", label: "Courses", icon: BookOpen, bottomNav: true },
  { href: "/english", label: "English", icon: Languages, bottomNav: true },
  { href: "/cgpa", label: "CGPA", icon: GraduationCap, bottomNav: true },
  { href: "/projects", label: "Projects", icon: Rocket, bottomNav: false },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, bottomNav: false },
  { href: "/profile", label: "Profile", icon: User, bottomNav: true },
];

export interface ShellUser {
  name: string;
  role: "student" | "admin";
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  streak: number;
}

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = user.role === "admin" ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck, bottomNav: false }] : NAV;
  const bottomItems = navItems.filter((n) => n.bottomNav);

  return (
    <AiTutorProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
          <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-1 font-bold text-foreground">
            <Swords className="h-5 w-5 text-primary" aria-hidden="true" />
            AI Quest
          </Link>

          <div className="mb-5 rounded-xl border border-border bg-surface-2 p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Level {user.level}</span>
              <span className="flex items-center gap-1 text-xp">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {user.streak}d
              </span>
            </div>
            <ProgressBar value={user.xpIntoLevel} max={user.xpToNextLevel} color="xp" ariaLabel="XP progress" />
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
            </button>
          </form>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
              <Swords className="h-5 w-5 text-primary" aria-hidden="true" />
              AI Quest
            </Link>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-medium text-xp">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {user.streak}d
              </span>
              <span className="text-xs font-medium text-muted">Lv {user.level}</span>
              <button
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                className="rounded-lg p-1.5 text-foreground"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </header>

          {mobileMenuOpen && (
            <nav className="border-b border-border bg-surface px-4 py-3 md:hidden">
              <div className="grid grid-cols-2 gap-1.5">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                ))}
              </div>
              <form action={logoutAction} className="mt-2">
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted">
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
                </button>
              </form>
            </nav>
          )}

          <main className="flex-1 pb-20 md:pb-0">{children}</main>

          {/* Mobile bottom nav */}
          <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur md:hidden">
            {bottomItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-primary" : "text-muted"}`}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <AiTutorLauncher />
      </div>
    </AiTutorProvider>
  );
}
