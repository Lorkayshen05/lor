"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { hintSchema, submissionSchema } from "@/lib/validation";
import { recordSubmission, registerHintUse, type SubmitOutcome } from "@/server/progression";

export type SubmitState = { ok: true; outcome: SubmitOutcome } | { ok: false; error: string };

export async function submitQuestAction(input: unknown): Promise<SubmitState> {
  const user = await requireUser();

  const limit = rateLimit(`submit:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return { ok: false, error: `Slow down — try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.` };
  }

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }

  try {
    const outcome = await recordSubmission(user.id, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath(`/quest/${parsed.data.questId}`);
    return { ok: true, outcome };
  } catch (error) {
    console.error("submitQuestAction failed", error);
    return { ok: false, error: "Could not save your submission. Try again." };
  }
}

export type HintState = { ok: true; hint: string; index: number; total: number } | { ok: false; error: string };

/** Reveals the next hint and records that a hint was used (it costs mastery). */
export async function revealHintAction(input: unknown): Promise<HintState> {
  const user = await requireUser();

  const limit = rateLimit(`hint:${user.id}`, 40, 60_000);
  if (!limit.ok) return { ok: false, error: "Too many hint requests. Wait a moment." };

  const parsed = hintSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const [quest, progress] = await Promise.all([
    prisma.quest.findUnique({ where: { id: parsed.data.questId }, select: { hints: true } }),
    prisma.progress.findUnique({ where: { userId_questId: { userId: user.id, questId: parsed.data.questId } } }),
  ]);
  if (!quest || quest.hints.length === 0) return { ok: false, error: "No hints for this quest." };

  const index = Math.min(progress?.hintsUsed ?? 0, quest.hints.length - 1);
  await registerHintUse(user.id, parsed.data.questId);

  return { ok: true, hint: quest.hints[index], index, total: quest.hints.length };
}
