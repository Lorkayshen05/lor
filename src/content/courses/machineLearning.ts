import type { CourseContent } from "../types";

export const machineLearning: CourseContent = {
  slug: "machine-learning",
  title: "Machine Learning",
  description: "Supervised & unsupervised learning, model evaluation, and classic algorithms.",
  icon: "brain",
  modules: [
    {
      slug: "foundations",
      title: "Foundations",
      lessons: [
        {
          slug: "evaluation",
          title: "Evaluating Models",
          contentMd: `# Evaluating Models\n\nAccuracy = correct predictions / total predictions. Splitting data into train/test sets prevents a model from being graded on data it memorized.`,
          quests: [
            {
              slug: "compute-accuracy",
              type: "code",
              title: "Compute Accuracy",
              description: "Write `accuracy(preds, labels)` returning the fraction of predictions that match the true labels (0.0 to 1.0).",
              difficulty: "easy",
              xp: 10,
              starterCode: `def accuracy(preds, labels):\n    # your code here\n    pass\n`,
              solutionCode: `def accuracy(preds, labels):\n    correct = sum(1 for p, l in zip(preds, labels) if p == l)\n    return correct / len(labels)\n`,
              tests: [{ name: "accuracy([1,0,1],[1,0,0]) == 2/3", code: `r = accuracy([1,0,1],[1,0,0]); assert abs(r - 2/3) < 1e-9, f"expected ~0.6667, got {r}"` }],
              hints: ["Count matches with zip(preds, labels).", "Divide the match count by the total number of labels."],
            },
            {
              slug: "overfitting-quiz",
              type: "quiz",
              title: "Overfitting",
              description: "Check your understanding of overfitting and train/test splits.",
              difficulty: "medium",
              xp: 20,
              hints: ["Overfitting means the model memorized the training data instead of learning general patterns.", "A held-out test set reveals overfitting that training accuracy alone hides."],
              slots: [
                [
                  {
                    prompt: "Training accuracy is 99%, test accuracy is 60%. What's happening?",
                    options: [
                      { text: "Overfitting — the model memorized training data", correct: true, feedback: "Correct — a big gap between train and test accuracy is the classic overfitting signature." },
                      { text: "Underfitting — the model is too simple", correct: false, feedback: "Underfitting would show low accuracy on both training and test data, not a big gap." },
                      { text: "The model is working perfectly", correct: false, feedback: "A 39-point drop on unseen data is a red flag, not a sign of success." },
                    ],
                    rule: "A large gap between training and test accuracy signals overfitting.",
                  },
                  {
                    prompt: "Why hold out a separate test set instead of evaluating only on training data?",
                    options: [
                      { text: "To check the model generalizes to data it hasn't seen", correct: true, feedback: "Correct — the test set estimates real-world performance on unseen data." },
                      { text: "To make training faster", correct: false, feedback: "Splitting data doesn't speed up training; it's about honest evaluation." },
                      { text: "Training accuracy is always inaccurate", correct: false, feedback: "Training accuracy is accurate for the training set — it just doesn't tell you about unseen data." },
                    ],
                    rule: "A held-out test set measures how well a model generalizes to new, unseen data.",
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
