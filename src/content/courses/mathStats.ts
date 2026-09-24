import type { CourseContent } from "../types";

export const mathStats: CourseContent = {
  slug: "math-stats",
  title: "Math + Statistics",
  description: "Linear algebra, probability, and statistics — the math underneath every model.",
  icon: "sigma",
  modules: [
    {
      slug: "descriptive-stats",
      title: "Descriptive Statistics",
      lessons: [
        {
          slug: "mean-variance",
          title: "Mean & Variance",
          contentMd: `# Descriptive Statistics\n\nMean is the average. Variance measures spread: the average squared distance from the mean.`,
          quests: [
            {
              slug: "compute-mean",
              type: "code",
              title: "Compute Mean",
              description: "Write `mean(nums)` returning the average of a non-empty list of numbers.",
              difficulty: "easy",
              xp: 10,
              starterCode: `def mean(nums):\n    # your code here\n    pass\n`,
              solutionCode: `def mean(nums):\n    return sum(nums) / len(nums)\n`,
              tests: [{ name: "mean([2,4,6]) == 4", code: `assert mean([2,4,6]) == 4, f"expected 4, got {mean([2,4,6])}"` }],
              hints: ["Divide the total sum by how many numbers there are."],
            },
            {
              slug: "probability-quiz",
              type: "quiz",
              title: "Probability Basics",
              description: "Check your understanding of basic probability.",
              difficulty: "easy",
              xp: 10,
              hints: ["Independent events multiply their probabilities.", "A probability is always between 0 and 1."],
              slots: [
                [
                  {
                    prompt: "Two fair coin flips. P(both heads)?",
                    options: [
                      { text: "0.25", correct: true, feedback: "Correct — independent events multiply: 0.5 × 0.5 = 0.25." },
                      { text: "0.5", correct: false, feedback: "0.5 is the chance of one head, not both. Multiply the two independent probabilities." },
                      { text: "1.0", correct: false, feedback: "A probability of 1.0 means certain — two flips landing heads isn't guaranteed." },
                    ],
                    rule: "For independent events, P(A and B) = P(A) × P(B).",
                  },
                  {
                    prompt: "A fair 6-sided die. P(rolling a 4)?",
                    options: [
                      { text: "1/6", correct: true, feedback: "Correct — one favorable outcome out of six equally likely outcomes." },
                      { text: "1/4", correct: false, feedback: "There are 6 possible outcomes, not 4 — the die has 6 sides." },
                      { text: "4/6", correct: false, feedback: "That would be the chance of rolling any of 4 specific numbers, not just a single 4." },
                    ],
                    rule: "For equally likely outcomes, probability = favorable outcomes / total outcomes.",
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
