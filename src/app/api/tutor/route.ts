import { NextRequest, NextResponse } from "next/server";
import { getRuleBasedTutorReply, TutorMode } from "@/lib/tutor";

const VALID_MODES: TutorMode[] = ["teach", "quiz", "practice", "hint", "debug", "review", "exam", "boss"];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const { mode, topic, question, studentAnswer, hint, errorOutput, attempts } = body as Record<string, unknown>;

  if (typeof mode !== "string" || !VALID_MODES.includes(mode as TutorMode)) {
    return NextResponse.json({ error: `'mode' must be one of ${VALID_MODES.join(", ")}` }, { status: 400 });
  }
  if (typeof topic !== "string" || topic.length === 0) {
    return NextResponse.json({ error: "'topic' is required." }, { status: 400 });
  }

  const reply = getRuleBasedTutorReply({
    mode: mode as TutorMode,
    topic,
    question: typeof question === "string" ? question : undefined,
    studentAnswer: typeof studentAnswer === "string" ? studentAnswer : undefined,
    hint: typeof hint === "string" ? hint : undefined,
    errorOutput: typeof errorOutput === "string" ? errorOutput : undefined,
    attempts: typeof attempts === "number" ? attempts : undefined,
  });

  return NextResponse.json(reply);
}
