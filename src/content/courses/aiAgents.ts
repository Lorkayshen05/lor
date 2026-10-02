import type { CourseContent } from "../types";

export const aiAgents: CourseContent = {
  slug: "ai-agents",
  title: "AI Agents",
  description: "Tool use, planning, and building autonomous agents on top of LLMs.",
  icon: "bot",
  modules: [
    {
      slug: "tool-use",
      title: "Tool Use",
      lessons: [
        {
          slug: "routing",
          title: "Routing to the Right Tool",
          contentMd: `# Agent Tool Routing\n\nAn agent picks a tool based on the user's intent. A simple router matches keywords to tool names before anything fancier.`,
          quests: [
            {
              slug: "simple-router",
              type: "code",
              title: "Simple Tool Router",
              description: "Write `route(query)` returning 'calculator' if the query contains any of '+','-','*','/', else 'search'.",
              difficulty: "medium",
              xp: 20,
              starterCode: `def route(query):\n    # your code here\n    pass\n`,
              solutionCode: `def route(query):\n    if any(op in query for op in "+-*/"):\n        return "calculator"\n    return "search"\n`,
              tests: [{ name: "route('2+2') == 'calculator', route('capital of France') == 'search'", code: `assert route('2+2') == 'calculator' and route('capital of France') == 'search'` }],
              hints: ["any(op in query for op in \"+-*/\") checks all four operators at once."],
            },
            {
              slug: "agent-loop-quiz",
              type: "quiz",
              title: "The Agent Loop",
              description: "Check your understanding of how agents plan and act.",
              difficulty: "medium",
              xp: 20,
              hints: ["An agent loop repeats: think, act, observe, until the goal is done.", "Giving a tool access doesn't mean the agent must use it on every step."],
              slots: [
                [
                  {
                    prompt: "What's the core loop an AI agent runs?",
                    options: [
                      { text: "Think about the goal, choose a tool, use it, check the result, repeat", correct: true, feedback: "Correct — that plan/act/observe cycle is the core of most agent architectures." },
                      { text: "Generate one response and stop", correct: false, feedback: "That's a plain chatbot response, not an agent — agents can take multiple steps." },
                      { text: "Only ever call the same tool every time", correct: false, feedback: "Agents choose which tool fits the current step, not a fixed single tool." },
                    ],
                    rule: "An agent loop repeats plan → act → observe until the goal is reached.",
                  },
                  {
                    prompt: "An agent has both a calculator and a web-search tool. For 'what is 12 * 8?', it should:",
                    options: [
                      { text: "Use the calculator tool", correct: true, feedback: "Correct — a pure arithmetic question routes to the calculator, not search." },
                      { text: "Always use web search first", correct: false, feedback: "Search is for retrieving facts, not for doing arithmetic that a calculator handles directly." },
                      { text: "Refuse, since it has two tools", correct: false, feedback: "Having multiple tools means picking the right one, not refusing to act." },
                    ],
                    rule: "A good agent picks the tool that matches the task, not just any available tool.",
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
