import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getRuleBasedReply, type TutorMode } from "@/lib/tutor/ruleBasedTutor";
import { getLiveTutorReply } from "@/lib/tutor/anthropic";
import { getWeakTopics } from "@/lib/game/weakTopics";

const MODES: TutorMode[] = ["teach", "quiz", "practice", "hint", "debug", "review", "exam", "boss", "chat"];

const bodySchema = z.object({
  mode: z.enum(MODES as [TutorMode, ...TutorMode[]]),
  topic: z.string().max(200).optional(),
  questTitle: z.string().max(200).optional(),
  hint: z.string().max(500).optional(),
  errorType: z.string().max(100).optional(),
  errorMessage: z.string().max(500).optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const ctx = parsed.data;
  const weakTopics = ctx.mode === "review" ? (await getWeakTopics(user.id)).map((w) => w.topic) : undefined;

  const live = await getLiveTutorReply({ ...ctx, weakTopics });
  const reply = live ?? getRuleBasedReply({ ...ctx, weakTopics });

  return NextResponse.json({ ...reply, source: live ? "live" : "rule-based" });
}
