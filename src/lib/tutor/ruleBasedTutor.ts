import { ERROR_EXPLANATIONS } from "@/lib/pyRunner/types";
import { findRelevantLesson } from "./lessonSearch";

export type TutorMode = "teach" | "quiz" | "practice" | "hint" | "debug" | "review" | "exam" | "boss" | "chat";

export interface TutorContext {
  mode: TutorMode;
  topic?: string;
  questTitle?: string;
  hint?: string;
  errorType?: string;
  errorMessage?: string;
  message?: string; // free-text from the student (chat, or a rewrite to check understanding)
  weakTopics?: string[];
}

export interface TutorReply {
  message: string;
  followUp?: string;
}

/**
 * Rule-based AI Tutor — runs with zero API keys. System rules baked in:
 * simple English, one concept at a time, never a full solution, end with a
 * question so the student stays independent.
 */
export function getRuleBasedReply(ctx: TutorContext): TutorReply {
  const topic = ctx.topic ?? ctx.questTitle ?? "this topic";

  switch (ctx.mode) {
    case "teach": {
      const lesson = ctx.topic ? findRelevantLesson(ctx.topic) : null;
      return {
        message: lesson
          ? `Let's cover one idea from ${lesson.lessonTitle}. Read it once, then try the quest yourself before checking the answer.`
          : `Let's look at ${topic} one idea at a time. Read the lesson, then try the quest with your own code first.`,
        followUp: "Can you tell me, in one sentence, what you think this is asking you to do?",
      };
    }

    case "hint":
      return {
        message: ctx.hint ? `Hint: ${ctx.hint}` : `Think about the very first step ${topic} needs. What should happen before anything else?`,
        followUp: "What will you try next?",
      };

    case "debug": {
      if (ctx.errorType && ctx.errorMessage) {
        const explain = ERROR_EXPLANATIONS[ctx.errorType] ?? "Read the message closely — it usually names the exact line and reason.";
        return {
          message: `${ctx.errorType}: ${ctx.errorMessage}\n${explain}`,
          followUp: "Which line do you think is causing it?",
        };
      }
      return { message: "Run your code first, then send me the error and I'll point to the exact cause.", followUp: "What error are you seeing?" };
    }

    case "quiz":
      return {
        message: `Quick check on ${topic}: can you explain what you just wrote, in your own words?`,
        followUp: "Try rewriting it in one or two sentences.",
      };

    case "practice":
      return { message: `Good — let's reinforce ${topic} with a similar problem before moving on.`, followUp: "Ready to try it?" };

    case "review": {
      const weak = ctx.weakTopics ?? [];
      if (weak.length === 0) {
        return { message: "No recurring mistakes tracked yet — nice work. Keep going the same way.", followUp: "What quest are you tackling next?" };
      }
      return {
        message: `Here's a 3-step plan: 1) re-read the lesson for ${weak[0]}. 2) retry a quest there without hints. 3) explain the fix in your own words before moving on.`,
        followUp: "Which of those steps do you want to start with?",
      };
    }

    case "exam":
      return { message: `Exam mode: no hints this round. Apply what you've learned about ${topic} on your own.`, followUp: "Take your time — what's your plan?" };

    case "boss":
      return {
        message: `Boss challenge on ${topic}. This combines everything from the module — test your logic before submitting.`,
        followUp: "What's the trickiest part so far?",
      };

    case "chat":
    default: {
      const lesson = findRelevantLesson(ctx.message ?? "");
      if (lesson) {
        const firstLine = lesson.contentMd.split("\n").find((l) => l.trim() && !l.startsWith("#")) ?? lesson.contentMd.slice(0, 160);
        return {
          message: `That connects to "${lesson.lessonTitle}" in ${lesson.courseTitle}: ${firstLine.trim()}`,
          followUp: "Does that answer it, or do you want a different angle?",
        };
      }
      return {
        message: "I'm not sure which lesson that connects to yet — try mentioning the topic or course name.",
        followUp: "What are you working on right now?",
      };
    }
  }
}
