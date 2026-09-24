import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quests, progress } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: questId } = await params;
  const quest = await db.query.quests.findFirst({ where: eq(quests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found." }, { status: 404 });

  const existing = await db.query.progress.findFirst({ where: and(eq(progress.userId, user.id), eq(progress.questId, questId)) });
  if (!existing || existing.attempts < 1) {
    return NextResponse.json({ error: "Try the quest at least once before asking for a hint." }, { status: 403 });
  }

  const hints = quest.hints ?? [];
  const hint = hints[existing.hintsUsed] ?? null;
  if (hint) {
    await db
      .update(progress)
      .set({ hintsUsed: existing.hintsUsed + 1, noHint: false })
      .where(eq(progress.id, existing.id));
  }

  return NextResponse.json({ hint, hintsUsed: hint ? existing.hintsUsed + 1 : existing.hintsUsed, totalHints: hints.length });
}
