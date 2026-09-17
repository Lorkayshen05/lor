import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/xp";
import { logoutAction } from "@/app/actions/auth";
import { Button, LinkButton, ProgressBar } from "@/components/ui";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/achievements", label: "Achievements" },
  { href: "/projects", label: "Projects" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  const stats = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } })
    : null;
  const progress = stats ? levelProgress(stats.xp) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-surface/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="text-base font-black tracking-tight">
          <span className="text-accent-soft">Play</span>Game
        </Link>

        {user ? (
          <ul className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {user.role === "ADMIN" ? (
              <li>
                <Link href="/admin" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xp hover:bg-surface-3">
                  Admin
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          {user && progress ? (
            <>
              <Link href="/profile" className="hidden text-right sm:block">
                <p className="text-xs font-semibold">{user.username}</p>
                <p className="text-[11px] text-ink-muted">
                  Lvl {progress.level} · {progress.xp} XP
                </p>
                <ProgressBar percent={progress.percent} className="mt-1 h-1 w-28" />
              </Link>
              <form action={logoutAction}>
                <Button variant="ghost" type="submit">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost">
                Log in
              </LinkButton>
              <LinkButton href="/register">Start playing</LinkButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
