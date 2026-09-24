import type { CourseContent } from "../types";

export const genaiLlm: CourseContent = {
  slug: "genai-llm",
  title: "GenAI / LLM",
  description: "How large language models work: tokens, embeddings, transformers, prompting.",
  icon: "sparkles",
  modules: [
    {
      slug: "language-models",
      title: "Language Models",
      lessons: [
        {
          slug: "tokens",
          title: "Tokens & Context Windows",
          contentMd: `# Tokens\n\nLLMs read text as tokens, not characters or whole words. A rough rule of thumb: 1 token ≈ 4 characters of English text.`,
          quests: [
            {
              slug: "estimate-tokens",
              type: "code",
              title: "Estimate Token Count",
              description: "Write `estimate_tokens(text)` returning `len(text) // 4` as a rough token estimate.",
              difficulty: "easy",
              xp: 10,
              starterCode: `def estimate_tokens(text):\n    # your code here\n    pass\n`,
              solutionCode: `def estimate_tokens(text):\n    return len(text) // 4\n`,
              tests: [{ name: "estimate_tokens('a'*8) == 2", code: `assert estimate_tokens('a'*8) == 2, f"expected 2, got {estimate_tokens('a'*8)}"` }],
              hints: ["Integer-divide the character length by 4."],
            },
            {
              slug: "prompting-quiz",
              type: "quiz",
              title: "Prompting Basics",
              description: "Check your understanding of prompting and context.",
              difficulty: "medium",
              xp: 20,
              hints: ["A context window limits how much text a model can consider at once.", "Being specific in a prompt usually improves the response."],
              slots: [
                [
                  {
                    prompt: "What is a model's 'context window'?",
                    options: [
                      { text: "The maximum amount of text it can consider at once", correct: true, feedback: "Correct — the context window is the token limit for a single request." },
                      { text: "How fast the model responds", correct: false, feedback: "That's latency, a separate concept from context window size." },
                      { text: "The model's training dataset", correct: false, feedback: "Training data is fixed at training time; context window is about a single request's input length." },
                    ],
                    rule: "The context window is the maximum number of tokens a model can process in one request.",
                  },
                  {
                    prompt: "Which prompt is more likely to get a useful answer?",
                    options: [
                      { text: '"Summarize this article in 3 bullet points for a beginner"', correct: true, feedback: "Correct — specific, structured instructions tend to produce more useful output." },
                      { text: '"do the thing"', correct: false, feedback: "Vague prompts give the model little to work with, leading to generic or off-target answers." },
                      { text: '"???"', correct: false, feedback: "A prompt with no actual instruction gives the model nothing to act on." },
                    ],
                    rule: "Specific, structured prompts tend to produce more useful, on-target responses.",
                  },
                ],
              ],
            },
          ],
        },
      ],
    },
  ],
};
