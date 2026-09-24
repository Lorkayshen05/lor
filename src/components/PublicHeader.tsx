import Link from "next/link";
import { Swords } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <Swords className="h-5 w-5 text-primary" aria-hidden="true" />
          AI Quest
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
            Log in
          </Link>
          <Link href="/register" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-2">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
