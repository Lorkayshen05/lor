import type { CourseContent } from "../types";

export const pandas: CourseContent = {
  slug: "pandas",
  title: "Pandas",
  description: "Wrangle real-world tabular data: DataFrames, cleaning, grouping, and analysis.",
  icon: "table",
  modules: [
    {
      slug: "dataframes",
      title: "DataFrames",
      lessons: [
        {
          slug: "rows-and-filtering",
          title: "Rows & Filtering",
          contentMd: `# Pandas Basics\n\nA DataFrame is a table of rows and columns. We model a tiny table as a list of dicts here to practice the filtering logic pandas uses under the hood.`,
          quests: [
            {
              slug: "filter-rows",
              type: "code",
              title: "Filter Rows by Age",
              description: "Write `filter_by_age(rows, min_age)` where rows is a list of dicts with an 'age' key. Return only rows where age >= min_age.",
              difficulty: "easy",
              xp: 10,
              starterCode: `def filter_by_age(rows, min_age):\n    # your code here\n    pass\n`,
              solutionCode: `def filter_by_age(rows, min_age):\n    return [r for r in rows if r["age"] >= min_age]\n`,
              tests: [
                {
                  name: "filters correctly",
                  code: `r = filter_by_age([{"age": 18},{"age": 25}], 20); assert r == [{"age": 25}], f"expected [{{'age': 25}}], got {r}"`,
                },
              ],
              hints: ["A list comprehension with an if clause keeps only matching rows.", "Compare r[\"age\"] >= min_age for each row."],
            },
            {
              slug: "groupby-quiz",
              type: "quiz",
              title: "GroupBy Concepts",
              description: "Check your understanding of grouping and aggregation.",
              difficulty: "easy",
              xp: 10,
              hints: ["groupby splits the table into groups sharing a key, then you aggregate each group.", "NaN means missing data, not zero."],
              slots: [
                [
                  {
                    prompt: "`df.groupby('city')['sales'].sum()` does what?",
                    options: [
                      { text: "Sums sales separately for each unique city", correct: true, feedback: "Correct — groupby splits rows by city, then sum() aggregates each group." },
                      { text: "Sums all sales into one total", correct: false, feedback: "That would just be df['sales'].sum() without groupby." },
                      { text: "Deletes rows with missing city", correct: false, feedback: "groupby doesn't delete data; it just groups it for aggregation." },
                    ],
                    rule: "groupby(key) splits rows into groups sharing the same key value before you aggregate.",
                  },
                  {
                    prompt: "A cell shows `NaN`. What does that mean?",
                    options: [
                      { text: "The value is missing", correct: true, feedback: "Correct — NaN (Not a Number) marks missing/unavailable data." },
                      { text: "The value is exactly zero", correct: false, feedback: "Zero would show as 0, not NaN. NaN specifically means missing." },
                      { text: "The column is text, not numeric", correct: false, feedback: "NaN can appear in numeric columns; it marks a missing value, not a type." },
                    ],
                    rule: "NaN represents missing data, and is different from zero.",
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
