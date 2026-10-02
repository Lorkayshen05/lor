import type { Metadata } from "next";
import "./globals.css";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeLevel } from "@/lib/game/xp";
import { AppShell } from "@/components/AppShell";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "AI Quest",
  description: "Learn AI, raise your CGPA, and train your English through game-style quests.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  let body;
  if (sessionUser) {
    const [user, streak] = await Promise.all([
      db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, sessionUser.id) }),
      db.query.streaks.findFirst({ where: eq(streaks.userId, sessionUser.id) }),
    ]);
    const level = computeLevel(user?.xp ?? 0);
    body = (
      <AppShell
        user={{
          name: sessionUser.name,
          role: sessionUser.role,
          level: level.level,
          xpIntoLevel: level.xpIntoLevel,
          xpToNextLevel: level.xpToNextLevel,
          streak: streak?.current ?? 0,
        }}
      >
        {children}
      </AppShell>
    );
  } else {
    body = (
      <>
        <PublicHeader />
        <main>{children}</main>
      </>
    );
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{body}</body>
    </html>
  );
}
