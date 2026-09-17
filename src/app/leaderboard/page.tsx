import { getCurrentUser } from "@/lib/session";
import { getLeaderboard } from "@/server/stats";
import { Card, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [user, rows] = await Promise.all([getCurrentUser(), getLeaderboard(25)]);

  return (
    <div className="space-y-4">
      <SectionTitle title="Leaderboard" subtitle="Top 25 players by XP." />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-line/60 text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">XP</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-line/40 last:border-0 ${row.id === user?.id ? "bg-accent/10" : ""}`}
              >
                <td className="px-4 py-3 font-bold">
                  {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
                </td>
                <td className="px-4 py-3 font-medium">{row.username}</td>
                <td className="px-4 py-3 text-xp">{row.xp}</td>
                <td className="px-4 py-3">{row.level}</td>
                <td className="px-4 py-3">🔥 {row.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
