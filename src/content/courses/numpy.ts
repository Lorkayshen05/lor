import type { CourseContent } from "../types";

export const numpy: CourseContent = {
  slug: "numpy",
  title: "NumPy",
  description: "Vectorized numerical computing — arrays, broadcasting, and the math backbone of ML.",
  icon: "grid",
  modules: [
    {
      slug: "arrays",
      title: "Arrays",
      lessons: [
        {
          slug: "array-basics",
          title: "Array Basics",
          contentMd: `# NumPy Arrays\n\nNumPy arrays are fast, fixed-type numerical containers. This sandbox runs plain Python (Pyodide's core doesn't bundle numpy by default), so we practice the same vectorized logic with lists — the concepts transfer directly once \`import numpy\` loads on demand.`,
          quests: [
            {
              slug: "elementwise-add",
              type: "code",
              title: "Element-wise Add",
              description: "Write `add_arrays(a, b)` returning a new list where each element is a[i] + b[i]. Assume equal length.",
              difficulty: "easy",
              xp: 10,
              starterCode: `def add_arrays(a, b):\n    # your code here\n    pass\n`,
              solutionCode: `def add_arrays(a, b):\n    return [x + y for x, y in zip(a, b)]\n`,
              tests: [{ name: "add_arrays([1,2],[3,4]) == [4,6]", code: `assert add_arrays([1,2],[3,4]) == [4,6], f"expected [4, 6], got {add_arrays([1,2],[3,4])}"` }],
              hints: ["zip(a, b) pairs up matching elements from both lists.", "Add each pair inside a list comprehension."],
            },
            {
              slug: "array-sum-quiz",
              type: "quiz",
              title: "Broadcasting Basics",
              description: "Check your understanding of vectorized operations.",
              difficulty: "easy",
              xp: 10,
              hints: ["Vectorized ops apply element-by-element, no explicit loop needed.", "Shape mismatches usually raise an error rather than silently guessing."],
              slots: [
                [
                  {
                    prompt: "In NumPy, `a + b` for two same-shape arrays does what?",
                    options: [
                      { text: "Adds element-by-element", correct: true, feedback: "Correct — this is vectorized addition, no explicit loop needed." },
                      { text: "Concatenates the arrays", correct: false, feedback: "That's np.concatenate([a, b]), not the + operator on same-shape arrays." },
                      { text: "Raises an error", correct: false, feedback: "Same-shape arrays add fine — errors happen on incompatible shapes." },
                    ],
                    rule: "NumPy operators apply element-wise across arrays of the same shape.",
                  },
                  {
                    prompt: "What does `a * 2` do to a NumPy array `a`?",
                    options: [
                      { text: "Doubles every element", correct: true, feedback: "Correct — a scalar broadcasts across every element." },
                      { text: "Duplicates the array (like list * 2 in plain Python)", correct: false, feedback: "That's plain-list behavior. NumPy arrays broadcast the scalar instead." },
                      { text: "Raises a TypeError", correct: false, feedback: "Scalar multiplication is well-defined and broadcasts across the array." },
                    ],
                    rule: "A scalar multiplies (broadcasts across) every element of a NumPy array.",
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
