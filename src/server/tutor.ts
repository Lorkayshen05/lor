import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { analyzeFailure } from "@/lib/mistakes";
import type { TutorInput } from "@/lib/validation";

export type TutorReply = {
  action: TutorInput["action"];
  title: string;
  body: string;
  source: "claude" | "rules";
};

type QuestContext = {
  title: string;
  concept: string;
  difficulty: string;
  instructions: string;
  expectedBehavior: string;
  hints: string[];
  starterCode: string;
} | null;

async function loadQuest(questId?: string): Promise<QuestContext> {
  if (!questId) return null;
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    select: {
      title: true,
      concept: true,
      difficulty: true,
      instructions: true,
      expectedBehavior: true,
      hints: true,
      starterCode: true,
    },
  });
  return quest;
}

const TITLES: Record<TutorInput["action"], string> = {
  explain: "Concept",
  hint: "Hint",
  debug: "Debug",
  review: "Review",
  practice: "Practice",
  boss: "Boss challenge",
};

/** Deterministic tutor used when no ANTHROPIC_API_KEY is configured. */
function ruleBasedReply(input: TutorInput, quest: QuestContext): string {
  const concept = quest?.concept ?? "this topic";

  switch (input.action) {
    case "explain":
      return quest
        ? `**${quest.title}** trains one idea: ${quest.concept}.\n\n${quest.instructions}\n\nSuccess looks like: ${quest.expectedBehavior}`
        : "Pick a quest first — I explain the concept behind the quest you are on.";
    case "hint":
      return quest?.hints.length
        ? `Smallest useful nudge: ${quest.hints[0]}${quest.hints[1] ? `\n\nStill stuck? ${quest.hints[1]}` : ""}`
        : `Re-read the expected behaviour and write down one example input and its output before coding.`;
    case "debug": {
      const analysis = analyzeFailure({
        error: input.error ?? null,
        failedTestNames: [],
        concept,
        hint: quest?.hints[0],
      });
      return `**${analysis.error}**\n\nConcept: ${analysis.concept}\n\nFix: ${analysis.correction}`;
    }
    case "review":
      return input.code
        ? [
            "Quick review checklist:",
            "- Does every branch `return` a value (not `print`)?",
            "- Are edge cases handled (empty input, zero, ties)?",
            "- Any repeated block you could pull into a variable or helper?",
            "- Do the names say what the values are?",
          ].join("\n")
        : "Paste your code in the editor and hit Review — I check returns, edge cases and naming.";
    case "practice":
      return `Practice reps for ${concept}:\n1. Re-solve this quest from a blank editor.\n2. Change one requirement (e.g. reverse the order, handle empty input) and make it work.\n3. Explain your solution out loud in two sentences.`;
    case "boss":
      return `Boss challenge for ${concept}: extend the current quest so it handles a second case (bigger input, empty input, or a different data shape) and keeps every existing test green. No hints for this one.`;
  }
}

const SYSTEM_PROMPT = [
  "You are the AI tutor inside PlayGame, a gamified course for a year-2 AI student.",
  "Be extremely concise: at most 120 words, markdown, no preamble.",
  "Explain one concept at a time. Never output the full solution to the quest unless the action is 'review' and the learner already passed.",
  "For 'hint' give the smallest useful nudge. For 'debug' name the exact mistake and the corrected line.",
].join(" ");

async function claudeReply(input: TutorInput, quest: QuestContext): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const context = quest
    ? `Quest: ${quest.title}\nConcept: ${quest.concept}\nDifficulty: ${quest.difficulty}\nInstructions: ${quest.instructions}\nExpected: ${quest.expectedBehavior}`
    : "No quest selected.";

  const prompt = [
    `Action: ${input.action}`,
    context,
    input.code ? `Learner code:\n\`\`\`python\n${input.code.slice(0, 4000)}\n\`\`\`` : "",
    input.error ? `Error output:\n${input.error.slice(0, 2000)}` : "",
    input.question ? `Learner question: ${input.question}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    return text || null;
  } catch (error) {
    console.error("tutor: Claude call failed, falling back to rules", error);
    return null;
  }
}

export async function askTutor(input: TutorInput): Promise<TutorReply> {
  const quest = await loadQuest(input.questId);
  const fromClaude = await claudeReply(input, quest);
  return {
    action: input.action,
    title: TITLES[input.action],
    body: fromClaude ?? ruleBasedReply(input, quest),
    source: fromClaude ? "claude" : "rules",
  };
}
