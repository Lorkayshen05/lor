import type { CourseContent } from "../types";

export const deepLearning: CourseContent = {
  slug: "deep-learning",
  title: "Deep Learning",
  description: "Neural networks, backpropagation, CNNs, and RNNs from first principles.",
  icon: "network",
  modules: [
    {
      slug: "neural-networks",
      title: "Neural Networks",
      lessons: [
        {
          slug: "activation-functions",
          title: "Activation Functions",
          contentMd: `# Activation Functions\n\nSigmoid squashes any number into (0, 1): sigmoid(x) = 1 / (1 + e^-x). It's the building block of a neuron's output.`,
          quests: [
            {
              slug: "implement-sigmoid",
              type: "code",
              title: "Implement Sigmoid",
              description: "Write `sigmoid(x)` implementing the sigmoid function using `math.exp`.",
              difficulty: "medium",
              xp: 20,
              starterCode: `import math\n\ndef sigmoid(x):\n    # your code here\n    pass\n`,
              solutionCode: `import math\n\ndef sigmoid(x):\n    return 1 / (1 + math.exp(-x))\n`,
              tests: [{ name: "sigmoid(0) == 0.5", code: `assert abs(sigmoid(0) - 0.5) < 1e-9, f"expected 0.5, got {sigmoid(0)}"` }],
              hints: ["math.exp(-x) gives you e^-x for the denominator.", "sigmoid(0) should be exactly 0.5 — use that to check your formula."],
            },
            {
              slug: "backprop-quiz",
              type: "quiz",
              title: "Backpropagation Basics",
              description: "Check your understanding of how neural networks learn.",
              difficulty: "hard",
              xp: 40,
              hints: ["Backprop uses the chain rule to compute how each weight affects the loss.", "Gradient descent nudges weights in the direction that reduces loss."],
              slots: [
                [
                  {
                    prompt: "What does backpropagation compute?",
                    options: [
                      { text: "How much each weight contributed to the error", correct: true, feedback: "Correct — backprop computes the gradient of the loss with respect to each weight, via the chain rule." },
                      { text: "The final prediction of the network", correct: false, feedback: "That's the forward pass. Backprop runs after, to compute gradients." },
                      { text: "A random shuffle of the weights", correct: false, feedback: "Backprop is a precise gradient calculation, not randomness." },
                    ],
                    rule: "Backpropagation uses the chain rule to compute each weight's gradient with respect to the loss.",
                  },
                  {
                    prompt: "After computing gradients, what does gradient descent do?",
                    options: [
                      { text: "Nudges each weight slightly against its gradient to reduce loss", correct: true, feedback: "Correct — weights move in the direction that decreases the loss." },
                      { text: "Deletes the weights with the smallest gradient", correct: false, feedback: "Gradient descent updates weights, it doesn't delete them." },
                      { text: "Picks new random weights each step", correct: false, feedback: "Updates are directed by the gradient, not random." },
                    ],
                    rule: "Gradient descent updates each weight in the direction that reduces the loss.",
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
