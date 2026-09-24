import "server-only";
import type { TutorContext, TutorReply } from "./ruleBasedTutor";

const SYSTEM_PROMPT = `You are the AI Tutor inside AI Quest, a game-style learning platform for a Year 2 Computer Science / Data Analytics student.
Rules:
- Use simple English. Use Mandarin only when it genuinely helps clarify a concept.
- Keep replies short. Cover one concept at a time.
- Check the student's understanding before explaining more.
- Never give a full solution or the correct quiz answer — guide, don't solve.
- If the student writes English with a mistake, correct only the important grammar issue, briefly.
- Ask the student to rewrite or try again in their own words.
- Always end your reply with a short question so the student stays engaged and independent, not dependent on you.`;

export async function getLiveTutorReply(ctx: TutorContext): Promise<TutorReply | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const userPrompt = [
    `Mode: ${ctx.mode}`,
    ctx.topic ? `Topic: ${ctx.topic}` : null,
    ctx.questTitle ? `Quest: ${ctx.questTitle}` : null,
    ctx.errorType ? `Error: ${ctx.errorType} — ${ctx.errorMessage}` : null,
    ctx.hint ? `Hint available: ${ctx.hint}` : null,
    ctx.weakTopics?.length ? `Weak topics: ${ctx.weakTopics.join(", ")}` : null,
    ctx.message ? `Student says: ${ctx.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.content?.[0]?.text;
    if (!text) return null;
    return { message: text.trim() };
  } catch {
    return null;
  }
}
