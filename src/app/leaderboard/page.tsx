import { redirect } from "next/navigation";
import { Flame, Crown } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { Card, CardHeader } from "@/components/ui/Card";
import { computeLevel } from "@/lib/game/xp";

export default async function LeaderboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const users = await db.query.users.findMany();
  const streakRows = await db.query.streaks.findMany();
  const streakByUser = new Map(streakRows.map((s) => [s.userId, s.current]));

  const ranked = users
    .map((u) => ({ id: u.id, name: u.name, xp: u.xp, level: computeLevel(u.xp).level, streak: streakByUser.get(u.id) ?? 0 }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted">Ranked by level, then XP.</p>
      </div>

      <Card>
        <CardHeader title="Top Learners" />
        <div className="space-y-1.5">
          {ranked.map((u, i) => {
            const isMe = u.id === sessionUser.id;
            return (
              <div key={u.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isMe ? "border-primary/50 bg-primary/10" : "border-border bg-surface-2"}`}>
                <span className="w-6 text-center text-sm font-semibold text-muted">{i === 0 ? <Crown className="mx-auto h-4 w-4 text-xp" /> : i + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-xs font-bold text-foreground">{u.name.slice(0, 1).toUpperCase()}</div>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {u.name} {isMe && <span className="text-xs text-primary">(you)</span>}
                </span>
                <span className="flex items-center gap-1 text-xs text-xp">
                  <Flame className="h-3.5 w-3.5" /> {u.streak}d
                </span>
                <span className="w-16 text-right text-sm font-semibold text-foreground">Lv {u.level}</span>
                <span className="w-16 text-right text-xs text-muted">{u.xp} XP</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
