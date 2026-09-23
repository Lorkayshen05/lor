import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";

const MIN_ATTEMPTS_BEFORE_REVEAL = 3;

/**
 * Solutions stay server-side and are only handed out after a few genuine
 * attempts (or once the quest is already completed) — the "don't reveal
 * answers immediately" rule enforced where a client can't bypass it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: questId } = await params;
  const user = await getOrCreateDemoUser();

  const progress = await prisma.progress.findUnique({
    where: { userId_questId: { userId: user.id, questId } },
  });

  const attempts = progress?.attempts ?? 0;
  if (!progress?.completed && attempts < MIN_ATTEMPTS_BEFORE_REVEAL) {
    return NextResponse.json(
      { error: `Try at least ${MIN_ATTEMPTS_BEFORE_REVEAL} times before revealing the solution.`, attempts },
      { status: 403 }
    );
  }

  const quest = await prisma.quest.findUnique({ where: { id: questId }, select: { solutionCode: true } });
  if (!quest) return NextResponse.json({ error: "Quest not found." }, { status: 404 });

  return NextResponse.json({ solutionCode: quest.solutionCode });
}
