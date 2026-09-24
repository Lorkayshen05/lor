import type { CourseContent } from "../types";

export const python: CourseContent = {
  slug: "python",
  title: "Python",
  description: "The language every AI engineer starts with: variables, control flow, functions, and data structures.",
  icon: "code",
  modules: [
    {
      slug: "fundamentals",
      title: "Fundamentals",
      lessons: [
        {
          slug: "variables-and-fstrings",
          title: "Variables & f-strings",
          contentMd: `# Variables & f-strings\n\nPython variables don't need a declared type:\n\n\`\`\`python\nname = "Amy"\nage = 20\n\`\`\`\n\nAn f-string embeds variables directly in text: \`f"{name} is {age}"\`.`,
          quests: [
            {
              slug: "intro-variables",
              type: "code",
              title: "Introduce Yourself",
              description:
                "Set `name` to your name and `age` to a number. Print exactly: `f\"My name is {name} and I am {age} years old.\"` Keep the variable names `name` and `age`.",
              difficulty: "easy",
              xp: 10,
              starterCode: `name = ""\nage = 0\nprint(f"My name is {name} and I am {age} years old.")\n`,
              solutionCode: `name = "Amy"\nage = 20\nprint(f"My name is {name} and I am {age} years old.")\n`,
              tests: [
                {
                  name: "name is not empty",
                  code: `assert name != "", f"name should not be empty, got {name!r}"`,
                },
                {
                  name: "age is a positive number",
                  code: `assert isinstance(age, int) and age > 0, f"age should be a positive int, got {age!r}"`,
                },
              ],
              hints: [
                "Assign a real value to `name`, e.g. name = \"Amy\".",
                "Assign a whole number to `age`, e.g. age = 20.",
                "Don't rename the variables — the tests look for `name` and `age` exactly.",
              ],
            },
          ],
        },
        {
          slug: "control-flow",
          title: "if / elif / else",
          contentMd: `# Conditionals\n\n\`\`\`python\nif score >= 80:\n    grade = "A"\nelif score >= 60:\n    grade = "B"\nelse:\n    grade = "C"\n\`\`\`\n\nConditions are checked top to bottom; only the first true branch runs.`,
          quests: [
            {
              slug: "grade-band-quiz",
              type: "quiz",
              title: "Grade Bands",
              description: "Check your understanding of if/elif/else ordering.",
              difficulty: "easy",
              xp: 10,
              hints: ["Conditions are checked top to bottom.", "Only the first true branch runs — order matters."],
              slots: [
                [
                  {
                    prompt: "score = 85. Which branch runs?\nif score >= 80: A\nelif score >= 60: B\nelse: C",
                    options: [
                      { text: "A", correct: true, feedback: "Correct — 85 >= 80, and it's the first condition checked." },
                      { text: "B", correct: false, feedback: "elif only runs if the earlier if was false. 85 >= 80 is true, so elif never runs." },
                      { text: "C", correct: false, feedback: "else only runs if every if/elif above was false. The first condition (85 >= 80) is true." },
                    ],
                    rule: "Python checks conditions top to bottom and stops at the first true one.",
                  },
                  {
                    prompt: "score = 45. Which branch runs?\nif score >= 80: A\nelif score >= 60: B\nelse: C",
                    options: [
                      { text: "A", correct: false, feedback: "45 >= 80 is false, so A's condition fails immediately." },
                      { text: "B", correct: false, feedback: "45 >= 60 is also false, so elif's condition fails too." },
                      { text: "C", correct: true, feedback: "Correct — both if and elif were false, so the else branch runs." },
                    ],
                    rule: "Python checks conditions top to bottom and stops at the first true one.",
                  },
                ],
              ],
            },
          ],
        },
        {
          slug: "loops",
          title: "Loops",
          contentMd: `# Loops\n\n\`\`\`python\ntotal = 0\nfor n in range(1, 11):\n    total += n\n\`\`\`\n\n\`range(1, 11)\` produces 1 through 10 — the end value is excluded.`,
          quests: [
            {
              slug: "sum-of-range",
              type: "code",
              title: "Sum a Range",
              description: "Write `sum_range(n)` that returns the sum of all integers from 1 to n (inclusive), using a loop (not `sum()` or a formula).",
              difficulty: "easy",
              xp: 10,
              starterCode: `def sum_range(n):\n    # your code here\n    pass\n`,
              solutionCode: `def sum_range(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n`,
              tests: [
                { name: "sum_range(10) == 55", code: `assert sum_range(10) == 55, f"total should be 55, got {sum_range(10)}"` },
                { name: "sum_range(1) == 1", code: `assert sum_range(1) == 1, f"total should be 1, got {sum_range(1)}"` },
              ],
              hints: [
                "Start a total at 0 before the loop.",
                "range(1, n + 1) includes n, since range's end is exclusive.",
                "Add i to total on every iteration, then return total after the loop.",
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "collections",
      title: "Collections & Functions",
      lessons: [
        {
          slug: "list-filtering",
          title: "Filtering Lists",
          contentMd: `# List Comprehensions\n\n\`\`\`python\nevens = [n for n in nums if n % 2 == 0]\n\`\`\`\n\nThis keeps only the numbers where the condition after \`if\` is true.`,
          quests: [
            {
              slug: "filter-evens",
              type: "code",
              title: "Filter Even Numbers",
              description: "Write `evens_only(nums)` returning a new list containing only the even numbers from `nums`, in the original order.",
              difficulty: "medium",
              xp: 20,
              starterCode: `def evens_only(nums):\n    # your code here\n    pass\n`,
              solutionCode: `def evens_only(nums):\n    return [n for n in nums if n % 2 == 0]\n`,
              tests: [
                { name: "evens_only([1,2,3,4,5,6]) == [2,4,6]", code: `assert evens_only([1,2,3,4,5,6]) == [2,4,6], f"expected [2, 4, 6], got {evens_only([1,2,3,4,5,6])}"` },
                { name: "evens_only([1,3,5]) == []", code: `assert evens_only([1,3,5]) == [], f"expected [], got {evens_only([1,3,5])}"` },
              ],
              hints: [
                "n % 2 == 0 is true only for even numbers.",
                "A list comprehension `[n for n in nums if ...]` builds the filtered list in one line.",
                "Order matters — keep the numbers in the order they appear in nums.",
              ],
            },
          ],
        },
        {
          slug: "functions-edge-cases",
          title: "Functions & Edge Cases",
          contentMd: `# Handling Edge Cases\n\nA good function handles the inputs you didn't expect — an empty list, a zero, a negative number — not just the happy path.`,
          quests: [
            {
              slug: "safe-average",
              type: "code",
              title: "Safe Average",
              description: "Write `safe_average(nums)` that returns the average of `nums`, or 0 if `nums` is empty (never crash on an empty list).",
              difficulty: "medium",
              xp: 20,
              starterCode: `def safe_average(nums):\n    # your code here\n    pass\n`,
              solutionCode: `def safe_average(nums):\n    if not nums:\n        return 0\n    return sum(nums) / len(nums)\n`,
              tests: [
                { name: "safe_average([2,4,6]) == 4", code: `assert safe_average([2,4,6]) == 4, f"expected 4, got {safe_average([2,4,6])}"` },
                { name: "safe_average([]) == 0", code: `assert safe_average([]) == 0, f"expected 0 for an empty list, got {safe_average([])}"` },
              ],
              hints: [
                "An empty list is falsy — `if not nums:` catches it.",
                "Check for the empty case before dividing by len(nums), or you'll get a ZeroDivisionError.",
                "sum(nums) / len(nums) gives the average once you know nums isn't empty.",
              ],
            },
          ],
        },
        {
          slug: "dictionaries",
          title: "Dictionaries",
          contentMd: `# Dictionaries\n\n\`\`\`python\nages = {"amy": 20}\nages["ben"] = 22\ncount = ages.get("cleo", 0)  # 0 if missing\n\`\`\``,
          quests: [
            {
              slug: "merge-inventories",
              type: "code",
              title: "Merge Inventories",
              description: "Write `merge_inventories(a, b)` that returns a new dict combining `a` and `b`, adding the counts together for any key present in both.",
              difficulty: "medium",
              xp: 20,
              starterCode: `def merge_inventories(a, b):\n    # your code here\n    pass\n`,
              solutionCode: `def merge_inventories(a, b):\n    merged = dict(a)\n    for key, value in b.items():\n        merged[key] = merged.get(key, 0) + value\n    return merged\n`,
              tests: [
                {
                  name: 'merge({"apple":2}, {"apple":3,"pear":1}) == {"apple":5,"pear":1}',
                  code: `r = merge_inventories({"apple": 2}, {"apple": 3, "pear": 1}); assert r == {"apple": 5, "pear": 1}, f"expected {{'apple': 5, 'pear': 1}}, got {r}"`,
                },
              ],
              hints: [
                "Start from a copy of a: `merged = dict(a)`.",
                "dict.get(key, 0) reads the current count, or 0 if the key isn't there yet.",
                "For each key in b, add its value onto whatever merged already has for that key.",
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "challenges",
      title: "Challenges",
      lessons: [
        {
          slug: "word-counter",
          title: "Word Counter",
          contentMd: `# Word Frequency\n\nSplitting and counting text is a building block for almost every NLP task.`,
          quests: [
            {
              slug: "word-counter-hard",
              type: "code",
              title: "Word Counter",
              description:
                "Write `word_count(text)` returning a dict mapping each lowercase word to how many times it appears. Split on whitespace, and strip `.,!?` from each word before counting.",
              difficulty: "hard",
              xp: 40,
              starterCode: `def word_count(text):\n    # your code here\n    pass\n`,
              solutionCode: `def word_count(text):\n    counts = {}\n    for raw in text.lower().split():\n        word = raw.strip(".,!?")\n        if not word:\n            continue\n        counts[word] = counts.get(word, 0) + 1\n    return counts\n`,
              tests: [
                {
                  name: 'word_count("a a b") == {"a": 2, "b": 1}',
                  code: `r = word_count("a a b"); assert r == {"a": 2, "b": 1}, f"expected {{'a': 2, 'b': 1}}, got {r}"`,
                },
                {
                  name: 'punctuation is stripped: "Cat, cat! dog." -> {"cat":2,"dog":1}',
                  code: `r = word_count("Cat, cat! dog."); assert r == {"cat": 2, "dog": 1}, f"expected {{'cat': 2, 'dog': 1}}, got {r}"`,
                },
              ],
              hints: [
                "text.lower().split() gives you lowercase words split on whitespace.",
                "str.strip(\".,!?\") removes those characters from the start and end of a word.",
                "Skip a word entirely if stripping leaves it empty (e.g. a lone \"!\").",
              ],
            },
          ],
        },
        {
          slug: "gradebook",
          title: "Gradebook",
          contentMd: `# Boss: Gradebook\n\nCombine everything from this module: dicts, loops, edge cases, and sorting.`,
          quests: [
            {
              slug: "gradebook-boss",
              type: "code",
              title: "Boss: Gradebook",
              description:
                "Write `top_student(grades)` where `grades` is a dict of name -> average score. Return the name of the student with the highest average. On a tie, return the alphabetically first name. If `grades` is empty, return None.",
              difficulty: "boss",
              xp: 100,
              starterCode: `def top_student(grades):\n    # your code here\n    pass\n`,
              solutionCode: `def top_student(grades):\n    if not grades:\n        return None\n    best_name = None\n    best_score = float("-inf")\n    for name in sorted(grades):\n        score = grades[name]\n        if score > best_score:\n            best_score = score\n            best_name = name\n    return best_name\n`,
              tests: [
                { name: 'top_student({"a": 90, "b": 95}) == "b"', code: `assert top_student({"a": 90, "b": 95}) == "b"` },
                { name: "ties resolve alphabetically", code: `assert top_student({"z": 80, "a": 80}) == "a"` },
                { name: "empty dict returns None", code: `assert top_student({}) is None` },
              ],
              hints: [
                "Handle the empty-dict case first, before looping.",
                "Iterate `sorted(grades)` so ties naturally resolve to the alphabetically first name.",
                "Only update best_name when you find a strictly higher score, not an equal one.",
              ],
            },
          ],
        },
      ],
    },
  ],
};
