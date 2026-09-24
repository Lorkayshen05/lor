import type { CourseContent } from "../types";

export const dsaSql: CourseContent = {
  slug: "dsa-sql",
  title: "DSA + SQL",
  description: "Data structures, algorithms, and SQL — the engineering skills interviews test.",
  icon: "database",
  modules: [
    {
      slug: "algorithms",
      title: "Algorithms",
      lessons: [
        {
          slug: "binary-search",
          title: "Binary Search",
          contentMd: `# Binary Search\n\nOn a sorted list, binary search halves the search space each step — O(log n) instead of O(n).`,
          quests: [
            {
              slug: "binary-search-code",
              type: "code",
              title: "Binary Search",
              description: "Write `binary_search(sorted_list, target)` returning the index of target, or -1 if not found.",
              difficulty: "medium",
              xp: 20,
              starterCode: `def binary_search(sorted_list, target):\n    # your code here\n    pass\n`,
              solutionCode: `def binary_search(sorted_list, target):\n    lo, hi = 0, len(sorted_list) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_list[mid] == target:\n            return mid\n        elif sorted_list[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n`,
              tests: [
                { name: "binary_search([1,3,5,7], 5) == 2", code: `assert binary_search([1,3,5,7], 5) == 2, f"expected index 2, got {binary_search([1,3,5,7], 5)}"` },
                { name: "not found returns -1", code: `assert binary_search([1,3,5,7], 4) == -1, f"expected -1, got {binary_search([1,3,5,7], 4)}"` },
              ],
              hints: ["Track lo/hi bounds and compare the middle element to the target each step.", "Narrow lo or hi based on whether the middle is too small or too large."],
            },
            {
              slug: "sql-joins-quiz",
              type: "quiz",
              title: "SQL Joins",
              description: "Check your understanding of SQL joins.",
              difficulty: "medium",
              xp: 20,
              hints: ["INNER JOIN keeps only matching rows from both tables.", "LEFT JOIN keeps every row from the left table."],
              slots: [
                [
                  {
                    prompt: "`SELECT * FROM a INNER JOIN b ON a.id = b.a_id` returns which rows?",
                    options: [
                      { text: "Only rows where a.id matches a b.a_id", correct: true, feedback: "Correct — INNER JOIN keeps only rows with a match in both tables." },
                      { text: "Every row from a, matched or not", correct: false, feedback: "That describes a LEFT JOIN, not an INNER JOIN." },
                      { text: "Every row from both tables, matched or not", correct: false, feedback: "That describes a FULL OUTER JOIN, which isn't what INNER JOIN does." },
                    ],
                    rule: "INNER JOIN keeps only rows that have a match in both tables.",
                  },
                  {
                    prompt: "`SELECT * FROM a LEFT JOIN b ON a.id = b.a_id` returns which rows?",
                    options: [
                      { text: "Every row from a, with NULLs where there's no match in b", correct: true, feedback: "Correct — LEFT JOIN always keeps the left table's rows, filling unmatched columns with NULL." },
                      { text: "Only rows where a.id matches a b.a_id", correct: false, feedback: "That's an INNER JOIN. LEFT JOIN keeps unmatched left rows too." },
                      { text: "Only rows from b", correct: false, feedback: "That's closer to a RIGHT JOIN behavior, not LEFT JOIN." },
                    ],
                    rule: "LEFT JOIN keeps every row from the left table, filling unmatched right-side columns with NULL.",
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
