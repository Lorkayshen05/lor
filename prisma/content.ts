export type SeedTest = {
  name: string;
  kind: "STDOUT" | "EXPRESSION";
  expression?: string;
  expected: string;
  hidden?: boolean;
};

export type SeedQuest = {
  slug: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "BOSS";
  concept: string;
  instructions: string;
  starterCode: string;
  expectedBehavior: string;
  hints: string[];
  solution: string;
  tests: SeedTest[];
};

export type SeedLesson = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  quests: SeedQuest[];
};

export type SeedModule = {
  slug: string;
  title: string;
  description: string;
  lessons: SeedLesson[];
};

export type SeedCourse = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  modules: SeedModule[];
};

const pythonCourse: SeedCourse = {
  slug: "python",
  title: "Python Fundamentals",
  description: "Syntax, control flow, functions and data structures — the base layer for every AI skill.",
  icon: "🐍",
  modules: [
    {
      slug: "basics",
      title: "Basics",
      description: "Output, variables, conditionals and loops.",
      lessons: [
        {
          slug: "output-and-variables",
          title: "Output and variables",
          summary: "Printing values and storing them in names.",
          content:
            "`print()` writes to stdout. A variable is a name bound to a value: `player = \"Ada\"`. f-strings interpolate values into text: `f\"Welcome, {player}!\"`.",
          quests: [
            {
              slug: "hello-quest",
              title: "Hello, PlayGame!",
              description: "Your first line of Python.",
              difficulty: "EASY",
              concept: "print()",
              instructions: "Print exactly `Hello, PlayGame!` — capitalisation and punctuation matter.",
              starterCode: "# Print the greeting below\n",
              expectedBehavior: "stdout is `Hello, PlayGame!`",
              hints: ["`print(\"text\")` writes text to stdout.", "The string must match exactly, including the comma and `!`."],
              solution: 'print("Hello, PlayGame!")\n',
              tests: [{ name: "prints the greeting", kind: "STDOUT", expected: "Hello, PlayGame!" }],
            },
            {
              slug: "greet-player",
              title: "Greet the player",
              description: "Use a variable inside an f-string.",
              difficulty: "EASY",
              concept: "f-strings",
              instructions:
                "Create a variable `player` holding `\"Ada\"`, then print `Welcome, Ada! Your quest begins.` using an f-string.",
              starterCode: 'player = ""\n# print the welcome line\n',
              expectedBehavior: "stdout is `Welcome, Ada! Your quest begins.`",
              hints: ["Assign first: `player = \"Ada\"`.", "`print(f\"Welcome, {player}! Your quest begins.\")`"],
              solution: 'player = "Ada"\nprint(f"Welcome, {player}! Your quest begins.")\n',
              tests: [
                { name: "prints the welcome line", kind: "STDOUT", expected: "Welcome, Ada! Your quest begins." },
                { name: "player variable is set", kind: "EXPRESSION", expression: "player", expected: "'Ada'" },
              ],
            },
          ],
        },
        {
          slug: "control-flow",
          title: "Control flow",
          summary: "Branching with if/else and repeating with loops.",
          content:
            "`if`, `elif` and `else` choose a branch. `for i in range(1, 16):` repeats over 1..15. `%` is the remainder operator: `n % 2 == 0` means n is even.",
          quests: [
            {
              slug: "even-or-odd",
              title: "Even or odd",
              description: "Write your first function with a branch.",
              difficulty: "EASY",
              concept: "conditionals",
              instructions:
                "Define `classify(n)` that returns the string `\"even\"` when `n` is even and `\"odd\"` otherwise.",
              starterCode: "def classify(n):\n    pass\n",
              expectedBehavior: "`classify(4)` → `'even'`, `classify(7)` → `'odd'`",
              hints: ["Use `n % 2 == 0` to test for even.", "`return` a string from each branch — do not print it."],
              solution: 'def classify(n):\n    if n % 2 == 0:\n        return "even"\n    return "odd"\n',
              tests: [
                { name: "classify(4) is even", kind: "EXPRESSION", expression: "classify(4)", expected: "'even'" },
                { name: "classify(7) is odd", kind: "EXPRESSION", expression: "classify(7)", expected: "'odd'" },
                { name: "classify(0) is even", kind: "EXPRESSION", expression: "classify(0)", expected: "'even'", hidden: true },
              ],
            },
            {
              slug: "fizzbuzz",
              title: "FizzBuzz",
              description: "The classic loop + branch drill.",
              difficulty: "MEDIUM",
              concept: "loops",
              instructions:
                "Print the numbers 1 to 15, one per line. Print `Fizz` for multiples of 3, `Buzz` for multiples of 5 and `FizzBuzz` for multiples of both.",
              starterCode: "for n in range(1, 16):\n    pass\n",
              expectedBehavior: "15 lines: 1, 2, Fizz, 4, Buzz, ... , FizzBuzz",
              hints: ["Check the multiple-of-15 case first.", "`range(1, 16)` stops before 16."],
              solution:
                'for n in range(1, 16):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)\n',
              tests: [
                {
                  name: "prints the FizzBuzz sequence",
                  kind: "STDOUT",
                  expected: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
                },
              ],
            },
          ],
        },
        {
          slug: "functions",
          title: "Functions",
          summary: "Package logic behind a name and return a value.",
          content:
            "`def total(n):` defines a function. Everything indented under it is the body, and `return` hands a value back to the caller.",
          quests: [
            {
              slug: "sum-to-n",
              title: "Sum to N",
              description: "Accumulate a running total.",
              difficulty: "MEDIUM",
              concept: "functions",
              instructions: "Define `total(n)` returning the sum of all integers from 1 to `n`. Return `0` when `n < 1`.",
              starterCode: "def total(n):\n    pass\n",
              expectedBehavior: "`total(5)` → `15`, `total(0)` → `0`",
              hints: ["Start an accumulator at 0 and add each number.", "`range(1, n + 1)` includes `n`."],
              solution: "def total(n):\n    result = 0\n    for i in range(1, n + 1):\n        result += i\n    return result\n",
              tests: [
                { name: "total(5)", kind: "EXPRESSION", expression: "total(5)", expected: "15" },
                { name: "total(0)", kind: "EXPRESSION", expression: "total(0)", expected: "0" },
                { name: "total(100)", kind: "EXPRESSION", expression: "total(100)", expected: "5050", hidden: true },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "data-structures",
      title: "Data structures",
      description: "Lists, dictionaries and text processing.",
      lessons: [
        {
          slug: "lists-and-dicts",
          title: "Lists and dicts",
          summary: "Aggregate numbers and count things.",
          content:
            "Lists hold ordered values (`[1, 2, 3]`); dicts map keys to values (`{\"a\": 1}`). `sum()`, `min()`, `max()` and `len()` cover most aggregation work.",
          quests: [
            {
              slug: "list-stats",
              title: "List stats",
              description: "Summarise a list of numbers.",
              difficulty: "MEDIUM",
              concept: "lists",
              instructions:
                "Define `stats(nums)` returning a dict with keys `min`, `max` and `mean`. Round `mean` to 2 decimals. Return `{}` for an empty list.",
              starterCode: "def stats(nums):\n    pass\n",
              expectedBehavior: "`stats([1, 2, 3, 4])` → `{'min': 1, 'max': 4, 'mean': 2.5}`",
              hints: ["`sum(nums) / len(nums)` is the mean.", "`round(value, 2)` rounds to two decimals."],
              solution:
                'def stats(nums):\n    if not nums:\n        return {}\n    return {"min": min(nums), "max": max(nums), "mean": round(sum(nums) / len(nums), 2)}\n',
              tests: [
                { name: "stats of [1,2,3,4]", kind: "EXPRESSION", expression: "stats([1, 2, 3, 4])", expected: "{'min': 1, 'max': 4, 'mean': 2.5}" },
                { name: "empty list", kind: "EXPRESSION", expression: "stats([])", expected: "{}" },
                { name: "rounds the mean", kind: "EXPRESSION", expression: "stats([1, 2, 2])['mean']", expected: "1.67", hidden: true },
              ],
            },
            {
              slug: "word-count",
              title: "Word count",
              description: "Build a frequency dictionary.",
              difficulty: "HARD",
              concept: "dicts",
              instructions:
                "Define `word_count(text)` returning a dict of lowercase word → count. Split on whitespace and strip `.,!?` from the ends of each word.",
              starterCode: "def word_count(text):\n    pass\n",
              expectedBehavior: "`word_count(\"Hi hi, there!\")` → `{'hi': 2, 'there': 1}`",
              hints: ["`text.lower().split()` gives lowercase tokens.", "`token.strip(\".,!?\")` removes punctuation from both ends.", "`counts[word] = counts.get(word, 0) + 1` accumulates."],
              solution:
                'def word_count(text):\n    counts = {}\n    for token in text.lower().split():\n        word = token.strip(".,!?")\n        if not word:\n            continue\n        counts[word] = counts.get(word, 0) + 1\n    return counts\n',
              tests: [
                { name: "counts repeated words", kind: "EXPRESSION", expression: 'word_count("Hi hi, there!")', expected: "{'hi': 2, 'there': 1}" },
                { name: "empty text", kind: "EXPRESSION", expression: 'word_count("")', expected: "{}" },
                { name: "ignores case and punctuation", kind: "EXPRESSION", expression: 'word_count("AI. ai ai?")', expected: "{'ai': 3}", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "python-boss",
          title: "Boss: text analyser",
          summary: "Combine loops, dicts and formatting under one function.",
          content: "Boss quests combine everything in the module. Read the spec carefully and return exactly the requested shape.",
          quests: [
            {
              slug: "text-analyser",
              title: "Boss: Text analyser",
              description: "One function, four statistics.",
              difficulty: "BOSS",
              concept: "integration",
              instructions:
                "Define `analyze(text)` returning a dict with:\n- `words`: number of words\n- `unique`: number of distinct lowercase words\n- `longest`: the longest word (first one wins on a tie)\n- `avg_len`: mean word length rounded to 2 decimals\n\nStrip `.,!?` from word ends and lowercase before comparing. Return `{'words': 0, 'unique': 0, 'longest': '', 'avg_len': 0.0}` for empty text.",
              starterCode: "def analyze(text):\n    pass\n",
              expectedBehavior: "`analyze(\"AI is fun. AI is power!\")` → `{'words': 6, 'unique': 4, 'longest': 'power', 'avg_len': 2.67}`",
              hints: ["Clean the tokens once into a list, then compute each statistic from that list.", "`max(words, key=len)` returns the first longest word.", "`sum(len(w) for w in words) / len(words)` is the mean length."],
              solution:
                'def analyze(text):\n    words = [t.strip(".,!?").lower() for t in text.split()]\n    words = [w for w in words if w]\n    if not words:\n        return {"words": 0, "unique": 0, "longest": "", "avg_len": 0.0}\n    return {\n        "words": len(words),\n        "unique": len(set(words)),\n        "longest": max(words, key=len),\n        "avg_len": round(sum(len(w) for w in words) / len(words), 2),\n    }\n',
              tests: [
                { name: "analyses a sentence", kind: "EXPRESSION", expression: 'analyze("AI is fun. AI is power!")', expected: "{'words': 6, 'unique': 4, 'longest': 'power', 'avg_len': 2.67}" },
                { name: "handles empty text", kind: "EXPRESSION", expression: 'analyze("")', expected: "{'words': 0, 'unique': 0, 'longest': '', 'avg_len': 0.0}" },
                { name: "ties keep the first longest", kind: "EXPRESSION", expression: 'analyze("data code")["longest"]', expected: "'data'", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const numpyCourse: SeedCourse = {
  slug: "numpy",
  title: "NumPy",
  description: "Vectorised arrays, broadcasting and numerical thinking — the engine under every ML library.",
  icon: "🔢",
  modules: [
    {
      slug: "arrays",
      title: "Arrays",
      description: "Creating arrays and computing with them without loops.",
      lessons: [
        {
          slug: "ndarray-basics",
          title: "ndarray basics",
          summary: "Create arrays and use vectorised operations.",
          content:
            "`np.array([1, 2, 3])` builds an ndarray. Operations apply element-wise: `a * 2`, `a + b`, `a.mean()`, `a.std()`. `np.arange(1, 6)` builds 1..5.",
          quests: [
            {
              slug: "create-array",
              title: "Create an array",
              description: "Your first ndarray.",
              difficulty: "EASY",
              concept: "ndarray",
              instructions: "Import numpy as `np` and create `arr` containing the integers 1 to 5.",
              starterCode: "import numpy as np\n\narr = None\n",
              expectedBehavior: "`arr.tolist()` → `[1, 2, 3, 4, 5]`",
              hints: ["`np.arange(1, 6)` produces 1..5.", "`np.array([1, 2, 3, 4, 5])` also works."],
              solution: "import numpy as np\n\narr = np.arange(1, 6)\n",
              tests: [
                { name: "arr holds 1..5", kind: "EXPRESSION", expression: "arr.tolist()", expected: "[1, 2, 3, 4, 5]" },
                { name: "arr is an ndarray", kind: "EXPRESSION", expression: "type(arr).__name__", expected: "'ndarray'" },
              ],
            },
            {
              slug: "standardize",
              title: "Standardise a vector",
              description: "Z-score normalisation, the most common ML preprocessing step.",
              difficulty: "MEDIUM",
              concept: "vectorisation",
              instructions:
                "Define `standardize(a)` returning `(a - mean) / std` as a numpy array. Return the array unchanged when its standard deviation is 0.",
              starterCode: "import numpy as np\n\n\ndef standardize(a):\n    pass\n",
              expectedBehavior: "`standardize(np.array([1, 2, 3]))` → `[-1.2247, 0.0, 1.2247]`",
              hints: ["`a.mean()` and `a.std()` are methods on the array.", "Guard against a zero standard deviation before dividing."],
              solution:
                "import numpy as np\n\n\ndef standardize(a):\n    spread = a.std()\n    if spread == 0:\n        return a\n    return (a - a.mean()) / spread\n",
              tests: [
                { name: "standardises [1,2,3]", kind: "EXPRESSION", expression: "[round(float(x), 4) for x in standardize(np.array([1, 2, 3]))]", expected: "[-1.2247, 0.0, 1.2247]" },
                { name: "constant input is unchanged", kind: "EXPRESSION", expression: "[float(x) for x in standardize(np.array([5.0, 5.0]))]", expected: "[5.0, 5.0]", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "broadcasting",
          title: "Broadcasting",
          summary: "Combine arrays of different shapes without loops.",
          content:
            "NumPy stretches smaller shapes across larger ones. `m * v` multiplies each row by `v`; `m * v[:, None]` multiplies each row by one scalar per row.",
          quests: [
            {
              slug: "scale-rows",
              title: "Scale rows",
              description: "Broadcast a per-row weight across a matrix.",
              difficulty: "HARD",
              concept: "broadcasting",
              instructions:
                "Define `scale_rows(m, v)` that multiplies row `i` of matrix `m` by `v[i]`, returning a numpy array. No Python loops.",
              starterCode: "import numpy as np\n\n\ndef scale_rows(m, v):\n    pass\n",
              expectedBehavior: "`scale_rows(np.array([[1, 2], [3, 4]]), np.array([10, 100]))` → `[[10, 20], [300, 400]]`",
              hints: ["`v` has shape `(n,)` but you need `(n, 1)`.", "`v[:, None]` or `v.reshape(-1, 1)` adds the missing axis."],
              solution: "import numpy as np\n\n\ndef scale_rows(m, v):\n    return m * v[:, None]\n",
              tests: [
                { name: "scales each row", kind: "EXPRESSION", expression: "scale_rows(np.array([[1, 2], [3, 4]]), np.array([10, 100])).tolist()", expected: "[[10, 20], [300, 400]]" },
                { name: "works for 3 rows", kind: "EXPRESSION", expression: "scale_rows(np.ones((3, 2)), np.array([1, 2, 3])).tolist()", expected: "[[1.0, 1.0], [2.0, 2.0], [3.0, 3.0]]", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const pandasCourse: SeedCourse = {
  slug: "pandas",
  title: "Pandas",
  description: "Load, filter, group and aggregate tabular data — the day job of every data scientist.",
  icon: "🐼",
  modules: [
    {
      slug: "dataframes",
      title: "DataFrames",
      description: "Building frames, selecting rows and aggregating groups.",
      lessons: [
        {
          slug: "series-and-frames",
          title: "Series and frames",
          summary: "Create a DataFrame and inspect it.",
          content:
            "`pd.DataFrame({\"name\": [...], \"score\": [...]})` builds a table from columns. `df.shape` is `(rows, columns)`; `df.sort_values(\"score\", ascending=False)` orders it.",
          quests: [
            {
              slug: "build-frame",
              title: "Build a DataFrame",
              description: "From a dict of columns to a table.",
              difficulty: "EASY",
              concept: "DataFrame",
              instructions:
                "Import pandas as `pd` and build `df` with columns `name` = `[\"ada\", \"linus\", \"grace\"]` and `score` = `[90, 70, 95]`.",
              starterCode: "import pandas as pd\n\ndf = None\n",
              expectedBehavior: "`df.shape` → `(3, 2)` with columns `name` and `score`",
              hints: ["Pass a dict of lists to `pd.DataFrame`.", "Keys become column names."],
              solution: 'import pandas as pd\n\ndf = pd.DataFrame({"name": ["ada", "linus", "grace"], "score": [90, 70, 95]})\n',
              tests: [
                { name: "three rows, two columns", kind: "EXPRESSION", expression: "list(df.shape)", expected: "[3, 2]" },
                { name: "column names", kind: "EXPRESSION", expression: "list(df.columns)", expected: "['name', 'score']" },
              ],
            },
            {
              slug: "top-scores",
              title: "Top scores",
              description: "Sort and slice a frame.",
              difficulty: "MEDIUM",
              concept: "sorting",
              instructions:
                "Define `top_names(df, n)` returning a list of the `n` names with the highest `score`, highest first.",
              starterCode: "import pandas as pd\n\n\ndef top_names(df, n):\n    pass\n",
              expectedBehavior: "With scores 90/70/95 and `n=2` → `['grace', 'ada']`",
              hints: ["`df.sort_values(\"score\", ascending=False)` orders the rows.", "`.head(n)[\"name\"].tolist()` extracts the names."],
              solution:
                'import pandas as pd\n\n\ndef top_names(df, n):\n    return df.sort_values("score", ascending=False).head(n)["name"].tolist()\n',
              tests: [
                { name: "top 2 names", kind: "EXPRESSION", expression: 'top_names(pd.DataFrame({"name": ["ada", "linus", "grace"], "score": [90, 70, 95]}), 2)', expected: "['grace', 'ada']" },
                { name: "n larger than the frame", kind: "EXPRESSION", expression: 'top_names(pd.DataFrame({"name": ["ada"], "score": [1]}), 5)', expected: "['ada']", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "groupby",
          title: "Group by",
          summary: "Split, apply, combine.",
          content: "`df.groupby(\"team\")[\"score\"].mean()` computes one number per group and returns a Series you can turn into a dict.",
          quests: [
            {
              slug: "average-by",
              title: "Average by group",
              description: "Split-apply-combine in one line.",
              difficulty: "HARD",
              concept: "groupby",
              instructions:
                "Define `average_by(df, key, value)` returning a dict mapping each group in column `key` to the mean of column `value`, rounded to 2 decimals.",
              starterCode: "import pandas as pd\n\n\ndef average_by(df, key, value):\n    pass\n",
              expectedBehavior: "Teams `a`/`b` with scores 10,20 and 30 → `{'a': 15.0, 'b': 30.0}`",
              hints: ["`df.groupby(key)[value].mean()` gives a Series.", "`.round(2).to_dict()` converts it."],
              solution: "import pandas as pd\n\n\ndef average_by(df, key, value):\n    return df.groupby(key)[value].mean().round(2).to_dict()\n",
              tests: [
                { name: "means per team", kind: "EXPRESSION", expression: 'average_by(pd.DataFrame({"team": ["a", "a", "b"], "score": [10, 20, 30]}), "team", "score")', expected: "{'a': 15.0, 'b': 30.0}" },
                { name: "rounds to 2 decimals", kind: "EXPRESSION", expression: 'average_by(pd.DataFrame({"team": ["a", "a", "a"], "score": [1, 2, 2]}), "team", "score")["a"]', expected: "1.67", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const statsCourse: SeedCourse = {
  slug: "math-stats",
  title: "Math & Statistics",
  description: "Descriptive statistics, probability and Bayes — the vocabulary models are written in.",
  icon: "📊",
  modules: [
    {
      slug: "descriptive",
      title: "Descriptive statistics",
      description: "Centre and spread of a dataset.",
      lessons: [
        {
          slug: "central-tendency",
          title: "Centre and spread",
          summary: "Mean, median and variance from scratch.",
          content:
            "The mean is `sum(x) / n`. The median is the middle value of the sorted data (mean of the two middle values when n is even). Population variance is the mean squared distance from the mean.",
          quests: [
            {
              slug: "mean-median",
              title: "Mean and median",
              description: "Two ways to describe the centre.",
              difficulty: "EASY",
              concept: "central tendency",
              instructions:
                "Define `mean(nums)` and `median(nums)` without importing anything. Round both to 2 decimals. Return `0.0` for an empty list.",
              starterCode: "def mean(nums):\n    pass\n\n\ndef median(nums):\n    pass\n",
              expectedBehavior: "`mean([1, 2, 3, 4])` → `2.5`, `median([3, 1, 2])` → `2.0`",
              hints: ["Sort a copy before taking the median: `values = sorted(nums)`.", "For even `n` average the two middle values."],
              solution:
                "def mean(nums):\n    if not nums:\n        return 0.0\n    return round(sum(nums) / len(nums), 2)\n\n\ndef median(nums):\n    if not nums:\n        return 0.0\n    values = sorted(nums)\n    mid = len(values) // 2\n    if len(values) % 2 == 1:\n        return round(float(values[mid]), 2)\n    return round((values[mid - 1] + values[mid]) / 2, 2)\n",
              tests: [
                { name: "mean of [1,2,3,4]", kind: "EXPRESSION", expression: "mean([1, 2, 3, 4])", expected: "2.5" },
                { name: "median of [3,1,2]", kind: "EXPRESSION", expression: "median([3, 1, 2])", expected: "2.0" },
                { name: "median of an even list", kind: "EXPRESSION", expression: "median([4, 1, 3, 2])", expected: "2.5", hidden: true },
              ],
            },
            {
              slug: "variance",
              title: "Variance and std",
              description: "Measure the spread.",
              difficulty: "MEDIUM",
              concept: "variance",
              instructions:
                "Define `variance(nums)` (population variance) and `std(nums)` (its square root), both rounded to 4 decimals. Return `0.0` for lists shorter than 2.",
              starterCode: "def variance(nums):\n    pass\n\n\ndef std(nums):\n    pass\n",
              expectedBehavior: "`variance([1, 2, 3, 4])` → `1.25`, `std([1, 2, 3, 4])` → `1.1180`",
              hints: ["Compute the mean first, then average the squared differences.", "`value ** 0.5` is the square root — no import needed."],
              solution:
                "def variance(nums):\n    if len(nums) < 2:\n        return 0.0\n    m = sum(nums) / len(nums)\n    return round(sum((x - m) ** 2 for x in nums) / len(nums), 4)\n\n\ndef std(nums):\n    return round(variance(nums) ** 0.5, 4)\n",
              tests: [
                { name: "variance of [1,2,3,4]", kind: "EXPRESSION", expression: "variance([1, 2, 3, 4])", expected: "1.25" },
                { name: "std of [1,2,3,4]", kind: "EXPRESSION", expression: "std([1, 2, 3, 4])", expected: "1.118" },
                { name: "single value", kind: "EXPRESSION", expression: "variance([7])", expected: "0.0", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "probability",
          title: "Probability",
          summary: "Counting outcomes and updating beliefs.",
          content:
            "Probability of an event = favourable outcomes / total outcomes. Bayes' rule updates a prior with evidence: `P(A|B) = P(B|A)P(A) / P(B)`.",
          quests: [
            {
              slug: "dice-probability",
              title: "Dice probability",
              description: "Enumerate the sample space.",
              difficulty: "MEDIUM",
              concept: "probability",
              instructions:
                "Define `prob_sum(target)` returning the probability that two fair six-sided dice sum to `target`, rounded to 4 decimals.",
              starterCode: "def prob_sum(target):\n    pass\n",
              expectedBehavior: "`prob_sum(7)` → `0.1667`, `prob_sum(13)` → `0.0`",
              hints: ["There are 36 equally likely outcomes.", "Two nested `range(1, 7)` loops enumerate them all."],
              solution:
                "def prob_sum(target):\n    hits = 0\n    for a in range(1, 7):\n        for b in range(1, 7):\n            if a + b == target:\n                hits += 1\n    return round(hits / 36, 4)\n",
              tests: [
                { name: "sum of 7", kind: "EXPRESSION", expression: "prob_sum(7)", expected: "0.1667" },
                { name: "impossible sum", kind: "EXPRESSION", expression: "prob_sum(13)", expected: "0.0" },
                { name: "sum of 2", kind: "EXPRESSION", expression: "prob_sum(2)", expected: "0.0278", hidden: true },
              ],
            },
            {
              slug: "bayes-rule",
              title: "Bayes' rule",
              description: "Update a prior with evidence.",
              difficulty: "HARD",
              concept: "Bayes",
              instructions:
                "Define `bayes(prior, tpr, fpr)` returning `P(disease | positive test)` rounded to 4 decimals, where `tpr` = P(positive|disease) and `fpr` = P(positive|no disease).",
              starterCode: "def bayes(prior, tpr, fpr):\n    pass\n",
              expectedBehavior: "`bayes(0.01, 0.99, 0.05)` → `0.1667`",
              hints: ["The denominator is `prior * tpr + (1 - prior) * fpr`.", "Return 0.0 if the denominator is 0."],
              solution:
                "def bayes(prior, tpr, fpr):\n    evidence = prior * tpr + (1 - prior) * fpr\n    if evidence == 0:\n        return 0.0\n    return round(prior * tpr / evidence, 4)\n",
              tests: [
                { name: "rare disease, imperfect test", kind: "EXPRESSION", expression: "bayes(0.01, 0.99, 0.05)", expected: "0.1667" },
                { name: "perfect test", kind: "EXPRESSION", expression: "bayes(0.5, 1.0, 0.0)", expected: "1.0", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const dsaCourse: SeedCourse = {
  slug: "dsa",
  title: "Data Structures & Algorithms",
  description: "Search, hashing, recursion and complexity — how to make code fast enough to matter.",
  icon: "🧠",
  modules: [
    {
      slug: "searching",
      title: "Searching and hashing",
      description: "Logarithmic search and O(1) lookups.",
      lessons: [
        {
          slug: "binary-search",
          title: "Binary search",
          summary: "Halve the search space every step.",
          content:
            "On sorted data, compare the middle element and discard half the range each iteration — O(log n) instead of O(n).",
          quests: [
            {
              slug: "binary-search-index",
              title: "Binary search",
              description: "Find an index in O(log n).",
              difficulty: "MEDIUM",
              concept: "binary search",
              instructions: "Define `search(values, target)` on a sorted list, returning the index of `target` or `-1`.",
              starterCode: "def search(values, target):\n    pass\n",
              expectedBehavior: "`search([1, 3, 5, 7], 5)` → `2`, `search([1, 3], 2)` → `-1`",
              hints: ["Keep `low` and `high` pointers.", "`mid = (low + high) // 2`.", "Move `low = mid + 1` or `high = mid - 1` depending on the comparison."],
              solution:
                "def search(values, target):\n    low, high = 0, len(values) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if values[mid] == target:\n            return mid\n        if values[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n",
              tests: [
                { name: "finds an element", kind: "EXPRESSION", expression: "search([1, 3, 5, 7], 5)", expected: "2" },
                { name: "missing element", kind: "EXPRESSION", expression: "search([1, 3], 2)", expected: "-1" },
                { name: "empty list", kind: "EXPRESSION", expression: "search([], 1)", expected: "-1", hidden: true },
              ],
            },
            {
              slug: "two-sum",
              title: "Two sum",
              description: "Trade memory for speed with a dict.",
              difficulty: "MEDIUM",
              concept: "hash maps",
              instructions:
                "Define `two_sum(nums, target)` returning the indices `[i, j]` of two values summing to `target` (`i < j`), or `[]` when none exist. Use a single pass with a dict.",
              starterCode: "def two_sum(nums, target):\n    pass\n",
              expectedBehavior: "`two_sum([2, 7, 11], 9)` → `[0, 1]`",
              hints: ["Store `value -> index` as you scan.", "For each value check whether `target - value` was already seen."],
              solution:
                "def two_sum(nums, target):\n    seen = {}\n    for index, value in enumerate(nums):\n        need = target - value\n        if need in seen:\n            return [seen[need], index]\n        seen[value] = index\n    return []\n",
              tests: [
                { name: "finds the pair", kind: "EXPRESSION", expression: "two_sum([2, 7, 11], 9)", expected: "[0, 1]" },
                { name: "no pair", kind: "EXPRESSION", expression: "two_sum([1, 2], 10)", expected: "[]" },
                { name: "later pair", kind: "EXPRESSION", expression: "two_sum([3, 2, 4], 6)", expected: "[1, 2]", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "recursion",
          title: "Recursion and memoisation",
          summary: "Cache repeated subproblems.",
          content: "A recursive function calls itself on a smaller input. Memoisation stores already-computed results so exponential work collapses to linear.",
          quests: [
            {
              slug: "fib-memo",
              title: "Memoised Fibonacci",
              description: "Turn exponential into linear.",
              difficulty: "HARD",
              concept: "memoisation",
              instructions: "Define `fib(n)` returning the n-th Fibonacci number (`fib(0) = 0`, `fib(1) = 1`) using memoisation so `fib(60)` is instant.",
              starterCode: "def fib(n):\n    pass\n",
              expectedBehavior: "`fib(10)` → `55`, `fib(60)` → `1548008755920`",
              hints: ["A dict cache keyed by `n` works.", "`functools.lru_cache` is the built-in shortcut."],
              solution:
                "def fib(n, cache=None):\n    if cache is None:\n        cache = {}\n    if n < 2:\n        return n\n    if n in cache:\n        return cache[n]\n    cache[n] = fib(n - 1, cache) + fib(n - 2, cache)\n    return cache[n]\n",
              tests: [
                { name: "fib(10)", kind: "EXPRESSION", expression: "fib(10)", expected: "55" },
                { name: "fib(0)", kind: "EXPRESSION", expression: "fib(0)", expected: "0" },
                { name: "fib(60) is fast", kind: "EXPRESSION", expression: "fib(60)", expected: "1548008755920", hidden: true },
              ],
            },
            {
              slug: "top-k-frequent",
              title: "Boss: Top-K frequent",
              description: "Counting, sorting and tie-breaking in one function.",
              difficulty: "BOSS",
              concept: "integration",
              instructions:
                "Define `top_k(items, k)` returning the `k` most frequent items, most frequent first. Break ties alphabetically. Return `[]` when `k < 1`.",
              starterCode: "def top_k(items, k):\n    pass\n",
              expectedBehavior: "`top_k(['a', 'b', 'a', 'c', 'b', 'a'], 2)` → `['a', 'b']`",
              hints: ["Count with a dict first.", "`sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))` sorts by count then name."],
              solution:
                "def top_k(items, k):\n    if k < 1:\n        return []\n    counts = {}\n    for item in items:\n        counts[item] = counts.get(item, 0) + 1\n    ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))\n    return [item for item, _ in ordered[:k]]\n",
              tests: [
                { name: "top 2", kind: "EXPRESSION", expression: "top_k(['a', 'b', 'a', 'c', 'b', 'a'], 2)", expected: "['a', 'b']" },
                { name: "alphabetical tie-break", kind: "EXPRESSION", expression: "top_k(['b', 'a'], 2)", expected: "['a', 'b']" },
                { name: "k below 1", kind: "EXPRESSION", expression: "top_k(['a'], 0)", expected: "[]", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const mlCourse: SeedCourse = {
  slug: "machine-learning",
  title: "Machine Learning",
  description: "Linear models, gradient descent and the metrics that tell you whether a model is any good.",
  icon: "🤖",
  modules: [
    {
      slug: "supervised",
      title: "Supervised learning",
      description: "Fit a line, then fit it with gradient descent.",
      lessons: [
        {
          slug: "linear-regression",
          title: "Linear regression",
          summary: "Prediction, loss and the gradient step.",
          content:
            "A linear model predicts `y = w * x + b`. Mean squared error measures how wrong it is. Gradient descent nudges `w` and `b` down the error surface, one small step at a time.",
          quests: [
            {
              slug: "predict-and-loss",
              title: "Predict and score",
              description: "Forward pass plus loss function.",
              difficulty: "MEDIUM",
              concept: "loss functions",
              instructions:
                "Define `predict(xs, w, b)` returning a list of predictions, and `mse(preds, ys)` returning the mean squared error rounded to 4 decimals.",
              starterCode: "def predict(xs, w, b):\n    pass\n\n\ndef mse(preds, ys):\n    pass\n",
              expectedBehavior: "`predict([1, 2], 2, 1)` → `[3, 5]`, `mse([3, 5], [2, 5])` → `0.5`",
              hints: ["A list comprehension gives the predictions in one line.", "MSE averages `(pred - actual) ** 2`."],
              solution:
                "def predict(xs, w, b):\n    return [w * x + b for x in xs]\n\n\ndef mse(preds, ys):\n    if not preds:\n        return 0.0\n    return round(sum((p - y) ** 2 for p, y in zip(preds, ys)) / len(preds), 4)\n",
              tests: [
                { name: "predictions", kind: "EXPRESSION", expression: "predict([1, 2], 2, 1)", expected: "[3, 5]" },
                { name: "mean squared error", kind: "EXPRESSION", expression: "mse([3, 5], [2, 5])", expected: "0.5" },
                { name: "perfect fit scores 0", kind: "EXPRESSION", expression: "mse([1, 2], [1, 2])", expected: "0.0", hidden: true },
              ],
            },
            {
              slug: "gradient-descent",
              title: "Train with gradient descent",
              description: "Learn the parameters instead of guessing them.",
              difficulty: "HARD",
              concept: "gradient descent",
              instructions:
                "Define `fit(xs, ys, lr=0.01, epochs=1000)` that starts from `w = 0.0`, `b = 0.0` and returns `(w, b)` rounded to 2 decimals after training with batch gradient descent on mean squared error.",
              starterCode: "def fit(xs, ys, lr=0.01, epochs=1000):\n    pass\n",
              expectedBehavior: "On `y = 2x` the fit returns roughly `(2.0, 0.0)`",
              hints: ["dW = `2/n * sum((pred - y) * x)`, dB = `2/n * sum(pred - y)`.", "Update after computing both gradients: `w -= lr * dW`."],
              solution:
                "def fit(xs, ys, lr=0.01, epochs=1000):\n    w, b, n = 0.0, 0.0, len(xs)\n    for _ in range(epochs):\n        preds = [w * x + b for x in xs]\n        dw = sum(2 * (p - y) * x for p, y, x in zip(preds, ys, xs)) / n\n        db = sum(2 * (p - y) for p, y in zip(preds, ys)) / n\n        w -= lr * dw\n        b -= lr * db\n    return round(w, 2), round(b, 2)\n",
              tests: [
                { name: "learns y = 2x", kind: "EXPRESSION", expression: "fit([1, 2, 3, 4], [2, 4, 6, 8], 0.01, 5000)", expected: "(2.0, 0.0)" },
                { name: "learns an intercept", kind: "EXPRESSION", expression: "fit([1, 2, 3, 4], [3, 5, 7, 9], 0.01, 5000)", expected: "(2.0, 1.0)", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "evaluation",
          title: "Model evaluation",
          summary: "Accuracy is not enough.",
          content:
            "Accuracy = correct / total. On imbalanced data use precision (`TP / (TP + FP)`), recall (`TP / (TP + FN)`) and their harmonic mean, F1.",
          quests: [
            {
              slug: "accuracy",
              title: "Accuracy",
              description: "The first metric everyone learns.",
              difficulty: "EASY",
              concept: "accuracy",
              instructions: "Define `accuracy(y_true, y_pred)` returning the fraction of matching labels, rounded to 4 decimals. Return `0.0` for empty input.",
              starterCode: "def accuracy(y_true, y_pred):\n    pass\n",
              expectedBehavior: "`accuracy([1, 0, 1], [1, 0, 0])` → `0.6667`",
              hints: ["`zip` pairs the two lists.", "`sum(a == b for a, b in zip(...))` counts matches."],
              solution:
                "def accuracy(y_true, y_pred):\n    if not y_true:\n        return 0.0\n    correct = sum(1 for a, b in zip(y_true, y_pred) if a == b)\n    return round(correct / len(y_true), 4)\n",
              tests: [
                { name: "two of three correct", kind: "EXPRESSION", expression: "accuracy([1, 0, 1], [1, 0, 0])", expected: "0.6667" },
                { name: "empty input", kind: "EXPRESSION", expression: "accuracy([], [])", expected: "0.0", hidden: true },
              ],
            },
            {
              slug: "precision-recall-f1",
              title: "Precision, recall, F1",
              description: "The metrics that survive imbalanced data.",
              difficulty: "MEDIUM",
              concept: "classification metrics",
              instructions:
                "Define `report(y_true, y_pred)` for binary labels (1 = positive) returning a dict with `precision`, `recall` and `f1`, each rounded to 4 decimals. Use `0.0` whenever a denominator is 0.",
              starterCode: "def report(y_true, y_pred):\n    pass\n",
              expectedBehavior: "`report([1, 1, 0, 0], [1, 0, 1, 0])` → `{'precision': 0.5, 'recall': 0.5, 'f1': 0.5}`",
              hints: ["Count TP, FP and FN in one pass.", "F1 = `2 * p * r / (p + r)` when `p + r > 0`."],
              solution:
                'def report(y_true, y_pred):\n    tp = sum(1 for a, b in zip(y_true, y_pred) if a == 1 and b == 1)\n    fp = sum(1 for a, b in zip(y_true, y_pred) if a == 0 and b == 1)\n    fn = sum(1 for a, b in zip(y_true, y_pred) if a == 1 and b == 0)\n    precision = tp / (tp + fp) if tp + fp else 0.0\n    recall = tp / (tp + fn) if tp + fn else 0.0\n    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0\n    return {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4)}\n',
              tests: [
                { name: "balanced example", kind: "EXPRESSION", expression: "report([1, 1, 0, 0], [1, 0, 1, 0])", expected: "{'precision': 0.5, 'recall': 0.5, 'f1': 0.5}" },
                { name: "no positives predicted", kind: "EXPRESSION", expression: "report([1, 0], [0, 0])", expected: "{'precision': 0.0, 'recall': 0.0, 'f1': 0.0}", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const dlCourse: SeedCourse = {
  slug: "deep-learning",
  title: "Deep Learning",
  description: "Activations, forward passes and the perceptron learning rule — neural networks from first principles.",
  icon: "🧬",
  modules: [
    {
      slug: "neural-networks",
      title: "Neural networks",
      description: "From a single neuron to a trained classifier.",
      lessons: [
        {
          slug: "activations",
          title: "Activations",
          summary: "The non-linearity that makes depth useful.",
          content:
            "`sigmoid(x) = 1 / (1 + e^-x)` squashes any number into (0, 1). `relu(x) = max(0, x)` keeps positives and zeroes negatives — cheap and the default in deep nets.",
          quests: [
            {
              slug: "sigmoid",
              title: "Sigmoid",
              description: "Squash a number into a probability.",
              difficulty: "EASY",
              concept: "activation functions",
              instructions: "Define `sigmoid(x)` returning `1 / (1 + e^-x)` rounded to 4 decimals. You may `import math`.",
              starterCode: "import math\n\n\ndef sigmoid(x):\n    pass\n",
              expectedBehavior: "`sigmoid(0)` → `0.5`, `sigmoid(2)` → `0.8808`",
              hints: ["`math.exp(-x)` computes e^-x.", "Round the final result with `round(value, 4)`."],
              solution: "import math\n\n\ndef sigmoid(x):\n    return round(1 / (1 + math.exp(-x)), 4)\n",
              tests: [
                { name: "sigmoid(0)", kind: "EXPRESSION", expression: "sigmoid(0)", expected: "0.5" },
                { name: "sigmoid(2)", kind: "EXPRESSION", expression: "sigmoid(2)", expected: "0.8808" },
                { name: "sigmoid(-2)", kind: "EXPRESSION", expression: "sigmoid(-2)", expected: "0.1192", hidden: true },
              ],
            },
            {
              slug: "dense-forward",
              title: "Dense layer forward pass",
              description: "Weights, bias and ReLU.",
              difficulty: "MEDIUM",
              concept: "forward pass",
              instructions:
                "Define `forward(inputs, weights, bias)` where `weights` is a list of neuron weight vectors. Return one ReLU-activated output per neuron.",
              starterCode: "def forward(inputs, weights, bias):\n    pass\n",
              expectedBehavior: "`forward([1, 2], [[1, 1], [-1, -1]], [0, 0])` → `[3, 0]`",
              hints: ["Dot product: `sum(i * w for i, w in zip(inputs, neuron))`.", "ReLU is `max(0, value)`."],
              solution:
                "def forward(inputs, weights, bias):\n    outputs = []\n    for neuron, b in zip(weights, bias):\n        total = sum(i * w for i, w in zip(inputs, neuron)) + b\n        outputs.append(max(0, total))\n    return outputs\n",
              tests: [
                { name: "relu clips the negative neuron", kind: "EXPRESSION", expression: "forward([1, 2], [[1, 1], [-1, -1]], [0, 0])", expected: "[3, 0]" },
                { name: "bias is added", kind: "EXPRESSION", expression: "forward([1], [[2]], [5])", expected: "[7]", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "training",
          title: "Training a neuron",
          summary: "The perceptron learning rule.",
          content:
            "For each example: predict, compute the error `y - prediction`, then move every weight by `lr * error * input`. Repeat for several epochs and a linearly separable problem is solved.",
          quests: [
            {
              slug: "perceptron",
              title: "Train a perceptron",
              description: "Learn the AND gate from data.",
              difficulty: "HARD",
              concept: "perceptron rule",
              instructions:
                "Define `train(samples, labels, lr=0.1, epochs=20)` starting from zero weights and zero bias, using a step activation (1 when the total is `>= 0`, else 0). Return `predict_all(samples, weights, bias)` compatible weights as `(weights, bias)`. Also define `predict_all(samples, weights, bias)` returning the list of predictions.",
              starterCode: "def predict_all(samples, weights, bias):\n    pass\n\n\ndef train(samples, labels, lr=0.1, epochs=20):\n    pass\n",
              expectedBehavior: "After training on the AND gate, `predict_all` returns `[0, 0, 0, 1]`",
              hints: ["Step activation: `1 if total >= 0 else 0`.", "Update rule: `w[i] += lr * error * x[i]`, `bias += lr * error`.", "Start weights as a list of zeros the same length as one sample."],
              solution:
                "def step(total):\n    return 1 if total >= 0 else 0\n\n\ndef predict_all(samples, weights, bias):\n    return [step(sum(x * w for x, w in zip(sample, weights)) + bias) for sample in samples]\n\n\ndef train(samples, labels, lr=0.1, epochs=20):\n    weights = [0.0] * len(samples[0])\n    bias = 0.0\n    for _ in range(epochs):\n        for sample, label in zip(samples, labels):\n            prediction = step(sum(x * w for x, w in zip(sample, weights)) + bias)\n            error = label - prediction\n            if error:\n                weights = [w + lr * error * x for w, x in zip(weights, sample)]\n                bias += lr * error\n    return weights, bias\n",
              tests: [
                {
                  name: "learns the AND gate",
                  kind: "EXPRESSION",
                  expression:
                    "predict_all([[0, 0], [0, 1], [1, 0], [1, 1]], *train([[0, 0], [0, 1], [1, 0], [1, 1]], [0, 0, 0, 1]))",
                  expected: "[0, 0, 0, 1]",
                },
                {
                  name: "learns the OR gate",
                  kind: "EXPRESSION",
                  expression:
                    "predict_all([[0, 0], [0, 1], [1, 0], [1, 1]], *train([[0, 0], [0, 1], [1, 0], [1, 1]], [0, 1, 1, 1]))",
                  expected: "[0, 1, 1, 1]",
                  hidden: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const genaiCourse: SeedCourse = {
  slug: "generative-ai",
  title: "Generative AI & LLMs",
  description: "Tokens, embeddings, sampling and retrieval — how large language models actually behave.",
  icon: "✨",
  modules: [
    {
      slug: "llm-foundations",
      title: "LLM foundations",
      description: "Text in, vectors out, tokens back.",
      lessons: [
        {
          slug: "tokens-and-embeddings",
          title: "Tokens and embeddings",
          summary: "Turn text into numbers you can compare.",
          content:
            "Models read tokens, not words. Embeddings place text in a vector space where cosine similarity measures meaning: `cos = dot(a, b) / (|a| * |b|)`.",
          quests: [
            {
              slug: "tokenizer",
              title: "Simple tokenizer",
              description: "Split text the way a bag-of-words model would.",
              difficulty: "EASY",
              concept: "tokenisation",
              instructions:
                "Define `tokenize(text)` returning a list of lowercase word tokens with `.,!?;:` stripped from both ends, dropping empty tokens.",
              starterCode: "def tokenize(text):\n    pass\n",
              expectedBehavior: "`tokenize(\"Hello, LLM world!\")` → `['hello', 'llm', 'world']`",
              hints: ["`text.lower().split()` first.", "`token.strip('.,!?;:')` removes the punctuation."],
              solution:
                "def tokenize(text):\n    tokens = [t.strip(\".,!?;:\") for t in text.lower().split()]\n    return [t for t in tokens if t]\n",
              tests: [
                { name: "tokenises a sentence", kind: "EXPRESSION", expression: 'tokenize("Hello, LLM world!")', expected: "['hello', 'llm', 'world']" },
                { name: "empty string", kind: "EXPRESSION", expression: 'tokenize("")', expected: "[]", hidden: true },
              ],
            },
            {
              slug: "cosine-similarity",
              title: "Cosine similarity",
              description: "Compare two embeddings.",
              difficulty: "MEDIUM",
              concept: "embeddings",
              instructions: "Define `cosine(a, b)` returning the cosine similarity of two equal-length vectors, rounded to 4 decimals. Return `0.0` if either vector is all zeros.",
              starterCode: "def cosine(a, b):\n    pass\n",
              expectedBehavior: "`cosine([1, 0], [1, 0])` → `1.0`, `cosine([1, 0], [0, 1])` → `0.0`",
              hints: ["Dot product: `sum(x * y for x, y in zip(a, b))`.", "Magnitude: `sum(x * x for x in a) ** 0.5`."],
              solution:
                "def cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    norm_a = sum(x * x for x in a) ** 0.5\n    norm_b = sum(y * y for y in b) ** 0.5\n    if norm_a == 0 or norm_b == 0:\n        return 0.0\n    return round(dot / (norm_a * norm_b), 4)\n",
              tests: [
                { name: "identical vectors", kind: "EXPRESSION", expression: "cosine([1, 0], [1, 0])", expected: "1.0" },
                { name: "orthogonal vectors", kind: "EXPRESSION", expression: "cosine([1, 0], [0, 1])", expected: "0.0" },
                { name: "zero vector", kind: "EXPRESSION", expression: "cosine([0, 0], [1, 1])", expected: "0.0", hidden: true },
              ],
            },
          ],
        },
        {
          slug: "prompting-and-sampling",
          title: "Prompting and sampling",
          summary: "Structure the input, control the randomness.",
          content:
            "A prompt template keeps inputs consistent. Sampling turns scores into probabilities with softmax; temperature flattens (high) or sharpens (low) the distribution.",
          quests: [
            {
              slug: "prompt-template",
              title: "Prompt template",
              description: "Render a reusable prompt safely.",
              difficulty: "MEDIUM",
              concept: "prompt engineering",
              instructions:
                "Define `render(template, **values)` replacing every `{key}` placeholder with the matching value, leaving unknown placeholders untouched.",
              starterCode: "def render(template, **values):\n    pass\n",
              expectedBehavior: "`render(\"Explain {topic} to a {level}\", topic=\"RAG\", level=\"beginner\")` → `'Explain RAG to a beginner'`",
              hints: ["Loop over `values.items()` and use `str.replace`.", "Build the placeholder as `\"{\" + key + \"}\"`."],
              solution:
                'def render(template, **values):\n    output = template\n    for key, value in values.items():\n        output = output.replace("{" + key + "}", str(value))\n    return output\n',
              tests: [
                { name: "fills placeholders", kind: "EXPRESSION", expression: 'render("Explain {topic} to a {level}", topic="RAG", level="beginner")', expected: "'Explain RAG to a beginner'" },
                { name: "leaves unknown placeholders", kind: "EXPRESSION", expression: 'render("Hi {name}, {missing}", name="Ada")', expected: "'Hi Ada, {missing}'", hidden: true },
              ],
            },
            {
              slug: "softmax-temperature",
              title: "Softmax with temperature",
              description: "Turn logits into sampling probabilities.",
              difficulty: "HARD",
              concept: "sampling",
              instructions:
                "Define `softmax(logits, temperature=1.0)` returning probabilities rounded to 4 decimals. Divide the logits by the temperature and subtract the maximum before exponentiating for numerical stability.",
              starterCode: "import math\n\n\ndef softmax(logits, temperature=1.0):\n    pass\n",
              expectedBehavior: "`softmax([1, 1])` → `[0.5, 0.5]`; a low temperature sharpens the distribution",
              hints: ["Scale first: `scaled = [x / temperature for x in logits]`.", "Subtract `max(scaled)` before `math.exp` to avoid overflow.", "Divide each exponential by their sum."],
              solution:
                "import math\n\n\ndef softmax(logits, temperature=1.0):\n    scaled = [x / temperature for x in logits]\n    peak = max(scaled)\n    exps = [math.exp(x - peak) for x in scaled]\n    total = sum(exps)\n    return [round(e / total, 4) for e in exps]\n",
              tests: [
                { name: "uniform logits", kind: "EXPRESSION", expression: "softmax([1, 1])", expected: "[0.5, 0.5]" },
                { name: "low temperature sharpens", kind: "EXPRESSION", expression: "softmax([1, 2], 0.5)", expected: "[0.1192, 0.8808]" },
                { name: "stable for large logits", kind: "EXPRESSION", expression: "softmax([1000, 1000])", expected: "[0.5, 0.5]", hidden: true },
              ],
            },
            {
              slug: "mini-rag",
              title: "Boss: Mini RAG retriever",
              description: "Bag-of-words retrieval end to end.",
              difficulty: "BOSS",
              concept: "retrieval",
              instructions:
                "Define `retrieve(query, docs, k=1)` returning the `k` documents most similar to `query`, best first. Score with cosine similarity over lowercase word-count vectors built from the union of both vocabularies. Break ties by the document's original order.",
              starterCode: "def retrieve(query, docs, k=1):\n    pass\n",
              expectedBehavior: "`retrieve('python lists', ['python lists are ordered', 'neural nets learn'])` → `['python lists are ordered']`",
              hints: ["Build a count dict per text, then vectorise over the shared vocabulary.", "Reuse the cosine formula from the embeddings quest.", "`sorted(scored, key=lambda item: -item[0])` keeps ties in their original order."],
              solution:
                'def counts(text):\n    result = {}\n    for token in text.lower().split():\n        word = token.strip(".,!?;:")\n        if word:\n            result[word] = result.get(word, 0) + 1\n    return result\n\n\ndef cosine(a, b):\n    vocab = set(a) | set(b)\n    dot = sum(a.get(w, 0) * b.get(w, 0) for w in vocab)\n    norm_a = sum(v * v for v in a.values()) ** 0.5\n    norm_b = sum(v * v for v in b.values()) ** 0.5\n    if norm_a == 0 or norm_b == 0:\n        return 0.0\n    return dot / (norm_a * norm_b)\n\n\ndef retrieve(query, docs, k=1):\n    query_counts = counts(query)\n    scored = [(cosine(query_counts, counts(doc)), index, doc) for index, doc in enumerate(docs)]\n    scored.sort(key=lambda item: (-item[0], item[1]))\n    return [doc for _, _, doc in scored[:k]]\n',
              tests: [
                { name: "retrieves the relevant doc", kind: "EXPRESSION", expression: "retrieve('python lists', ['python lists are ordered', 'neural nets learn'])", expected: "['python lists are ordered']" },
                { name: "returns k documents in rank order", kind: "EXPRESSION", expression: "retrieve('neural nets', ['python lists are ordered', 'neural nets learn'], 2)", expected: "['neural nets learn', 'python lists are ordered']" },
                { name: "no overlap keeps original order", kind: "EXPRESSION", expression: "retrieve('zzz', ['a b', 'c d'], 2)", expected: "['a b', 'c d']", hidden: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const SEED_COURSES: SeedCourse[] = [
  pythonCourse,
  numpyCourse,
  pandasCourse,
  statsCourse,
  dsaCourse,
  mlCourse,
  dlCourse,
  genaiCourse,
];
