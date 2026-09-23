export type TutorMode =
  | "teach"
  | "quiz"
  | "practice"
  | "hint"
  | "debug"
  | "review"
  | "exam"
  | "boss";

export interface TutorContext {
  mode: TutorMode;
  topic: string;
  question?: string;
  studentAnswer?: string;
  hint?: string;
  errorOutput?: string;
  attempts?: number;
}

export interface TutorReply {
  message: string;
  followUp?: string;
}

/**
 * AI Quest's tutor is rule-based by default (no external API key needed to
 * run the MVP). If ANTHROPIC_API_KEY is set, callers can route through
 * getLlmTutorReply instead for richer, model-generated responses — same
 * contract, so the UI never has to know which one answered.
 */
export function getRuleBasedTutorReply(ctx: TutorContext): TutorReply {
  const attempts = ctx.attempts ?? 0;

  switch (ctx.mode) {
    case "teach":
      return {
        message: `Let's look at **${ctx.topic}** one idea at a time. Read the lesson, then try the quest below with your own code before checking the answer — you'll remember it much better that way.`,
        followUp: "Ready to try it yourself?",
      };

    case "hint":
      return {
        message: ctx.hint
          ? `Hint: ${ctx.hint}`
          : `Think about what ${ctx.topic} is actually asking you to do, step by step. What's the very first thing your code needs to do?`,
        followUp: "Try updating your code and running it again.",
      };

    case "debug":
      if (ctx.errorOutput) {
        const lastLine = ctx.errorOutput.trim().split("\n").pop() ?? ctx.errorOutput;
        return {
          message: `Your code hit this error: "${lastLine}". Read it closely — it usually tells you the exact line and reason. Fix just that one issue first, then run again.`,
          followUp:
            attempts >= 3
              ? "You've tried a few times — want to reveal the solution and compare it to yours?"
              : "What do you think caused it?",
        };
      }
      return { message: "Paste the error output and I'll help you find the exact line that's wrong." };

    case "quiz":
      return {
        message: `Quick check on ${ctx.topic}: can you explain, in your own words, what the code you just wrote actually does?`,
        followUp: "Write 1-2 sentences.",
      };

    case "practice":
      return {
        message: `Good — let's reinforce ${ctx.topic} with another similar problem before moving on.`,
      };

    case "review":
      return {
        message: `Here's a summary of ${ctx.topic}: focus on the pattern you kept getting wrong, and re-read that part of the lesson before the next quest.`,
      };

    case "exam":
      return {
        message: `Exam mode: no hints this round. Apply everything you've learned about ${ctx.topic}.`,
      };

    case "boss":
      return {
        message: `⚔ Boss challenge on ${ctx.topic}. This combines everything from this module — take your time and test your logic before submitting.`,
      };

    default:
      return { message: "Let's keep going." };
  }
}

/**
 * Checks a student's English explanation against the target concept using
 * lightweight heuristics: keyword coverage + a few common grammar slips.
 * Good enough to drive the listen -> explain -> check -> correct -> retry
 * loop without an external API.
 */
export function checkEnglishAnswer(studentAnswer: string, expectedKeywords: string[]) {
  const lower = studentAnswer.toLowerCase();
  const missing = expectedKeywords.filter((k) => !lower.includes(k.toLowerCase()));
  const grammarNotes: string[] = [];

  if (/\bi is\b/.test(lower)) grammarNotes.push('"I is" → use "I am".');
  if (/\bhe don't\b|\bshe don't\b/.test(lower)) grammarNotes.push('"he/she don\'t" → "he/she doesn\'t".');
  if (/\ba [aeiou]/.test(lower)) grammarNotes.push('Use "an" before a vowel sound, not "a".');
  if (studentAnswer.trim().length > 0 && !/[.!?]$/.test(studentAnswer.trim())) {
    grammarNotes.push("End your sentence with proper punctuation.");
  }

  const meaningOk = missing.length === 0;
  return { meaningOk, missing, grammarNotes };
}
