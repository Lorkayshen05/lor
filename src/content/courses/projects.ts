import type { CourseContent } from "../types";

export const projectsCourse: CourseContent = {
  slug: "projects",
  title: "Projects",
  description: "Ship real, portfolio-worthy AI projects end to end.",
  icon: "rocket",
  modules: [
    {
      slug: "capstone",
      title: "Capstone",
      lessons: [
        {
          slug: "shipping",
          title: "Shipping a Project",
          contentMd: `# Shipping\n\nA finished small project beats an unfinished ambitious one. Track status, link your repo, and ship a demo.`,
          quests: [
            {
              slug: "readiness-check",
              type: "code",
              title: "Project Readiness Check",
              description:
                "Write `is_ready_to_ship(project)` where project is a dict with keys 'has_readme', 'has_demo', 'tests_pass' (all bools). Return True only if all three are True.",
              difficulty: "easy",
              xp: 10,
              starterCode: `def is_ready_to_ship(project):\n    # your code here\n    pass\n`,
              solutionCode: `def is_ready_to_ship(project):\n    return project["has_readme"] and project["has_demo"] and project["tests_pass"]\n`,
              tests: [
                {
                  name: "all true => True",
                  code: `assert is_ready_to_ship({"has_readme": True, "has_demo": True, "tests_pass": True}) is True`,
                },
                {
                  name: "any false => False",
                  code: `assert is_ready_to_ship({"has_readme": True, "has_demo": False, "tests_pass": True}) is False`,
                },
              ],
              hints: ["Combine all three dict values with 'and'."],
            },
            {
              slug: "scope-quiz",
              type: "quiz",
              title: "Scoping a Project",
              description: "Check your understanding of shipping small, focused projects.",
              difficulty: "easy",
              xp: 10,
              hints: ["A narrower, finished project beats a broad, unfinished one.", "A demo link lets others verify your project actually works."],
              slots: [
                [
                  {
                    prompt: "Which project is more likely to get finished in two weeks?",
                    options: [
                      { text: "A single-feature chatbot that answers questions from one PDF", correct: true, feedback: "Correct — a narrow, well-scoped project is realistic to finish and ship." },
                      { text: "A full multi-agent platform replacing five existing tools", correct: false, feedback: "That's a much larger scope than two weeks realistically allows." },
                      { text: "Whichever has the most features listed", correct: false, feedback: "More features usually means more time, not more likely to finish." },
                    ],
                    rule: "A small, finished project beats a large, unfinished one — scope down first.",
                  },
                  {
                    prompt: "Why include a live demo link with your project?",
                    options: [
                      { text: "So others can verify it actually works, not just read about it", correct: true, feedback: "Correct — a working demo is proof, code alone requires trust." },
                      { text: "It's required by every GitHub repository", correct: false, feedback: "GitHub doesn't require a demo link; it's a good practice, not a platform rule." },
                      { text: "It replaces the need for a README", correct: false, feedback: "A demo and a README serve different purposes — both help, neither replaces the other." },
                    ],
                    rule: "A working demo link proves the project works, beyond just reading the code.",
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
