import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "erwin.lius06@gmail.com";

async function main() {
  console.log("Seeding AI Quest...");

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Erwin",
      level: 1,
      xp: 0,
      xpToNext: 100,
      streak: 0,
    },
  });

  // --- Achievements ---
  const achievements = [
    { key: "first_quest", title: "First Steps", description: "Complete your first quest.", icon: "footprints" },
    { key: "streak_3", title: "On a Roll", description: "Keep a 3-day streak.", icon: "flame" },
    { key: "streak_7", title: "Unstoppable", description: "Keep a 7-day streak.", icon: "flame" },
    { key: "level_5", title: "Rising Star", description: "Reach level 5.", icon: "star" },
    { key: "ten_quests", title: "Quest Grinder", description: "Complete 10 quests.", icon: "swords" },
    { key: "boss_slayer", title: "Boss Slayer", description: "Defeat a boss quest.", icon: "trophy" },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: {}, create: a });
  }

  // --- Learning path courses ---
  const coursePlan = [
    { slug: "python", title: "Python", icon: "code", description: "The language every AI engineer starts with: syntax, control flow, functions, and data structures." },
    { slug: "numpy", title: "NumPy", icon: "grid", description: "Vectorized numerical computing — arrays, broadcasting, and the math backbone of ML." },
    { slug: "pandas", title: "Pandas", icon: "table", description: "Wrangle real-world tabular data: DataFrames, cleaning, grouping, and analysis." },
    { slug: "math-stats", title: "Math + Statistics", icon: "sigma", description: "Linear algebra, probability, and statistics — the math underneath every model." },
    { slug: "dsa-sql", title: "DSA + SQL", icon: "database", description: "Data structures, algorithms, and SQL — the engineering skills interviews test." },
    { slug: "machine-learning", title: "Machine Learning", icon: "brain", description: "Supervised & unsupervised learning, model evaluation, and classic algorithms." },
    { slug: "deep-learning", title: "Deep Learning", icon: "network", description: "Neural networks, backpropagation, CNNs, and RNNs from first principles." },
    { slug: "genai-llm", title: "GenAI / LLM", icon: "sparkles", description: "How large language models work: tokens, embeddings, transformers, prompting." },
    { slug: "ai-agents", title: "AI Agents", icon: "bot", description: "Tool use, planning, and building autonomous agents on top of LLMs." },
    { slug: "projects", title: "Projects", icon: "rocket", description: "Ship real, portfolio-worthy AI projects end to end." },
  ];

  const courses: Record<string, { id: string }> = {};
  for (let i = 0; i < coursePlan.length; i++) {
    const c = coursePlan[i];
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, description: c.description, icon: c.icon, order: i },
      create: { ...c, order: i },
    });
    courses[c.slug] = course;
  }

  // Helper to build module -> lesson -> quests, wiping old ones for idempotent reseed.
  async function buildModule(
    courseSlug: string,
    moduleTitle: string,
    order: number,
    lessonTitle: string,
    content: string,
    quests: {
      title: string;
      description: string;
      difficulty: "easy" | "medium" | "hard" | "boss";
      starterCode: string;
      solutionCode: string;
      xpReward: number;
      questions: { prompt: string; testCode: string; hint: string }[];
    }[]
  ) {
    const course = courses[courseSlug];
    let courseModule = await prisma.module.findFirst({ where: { courseId: course.id, title: moduleTitle } });
    if (!courseModule) {
      courseModule = await prisma.module.create({ data: { courseId: course.id, title: moduleTitle, order } });
    }
    let lesson = await prisma.lesson.findFirst({ where: { moduleId: courseModule.id, title: lessonTitle } });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: { moduleId: courseModule.id, title: lessonTitle, content, order: 0 },
      });
    } else {
      lesson = await prisma.lesson.update({ where: { id: lesson.id }, data: { content } });
    }

    for (let qi = 0; qi < quests.length; qi++) {
      const q = quests[qi];
      let quest = await prisma.quest.findFirst({ where: { lessonId: lesson.id, title: q.title } });
      if (!quest) {
        quest = await prisma.quest.create({
          data: {
            lessonId: lesson.id,
            title: q.title,
            description: q.description,
            difficulty: q.difficulty,
            starterCode: q.starterCode,
            solutionCode: q.solutionCode,
            xpReward: q.xpReward,
            order: qi,
          },
        });
        for (const question of q.questions) {
          await prisma.question.create({
            data: { questId: quest.id, prompt: question.prompt, testCode: question.testCode, hint: question.hint },
          });
        }
      }
    }
  }

  // --- Python: fully fleshed out with gradeable quests ---
  await buildModule(
    "python",
    "Fundamentals",
    0,
    "Variables & Loops",
    `# Variables & Loops\n\nPython variables don't need a declared type. A \`for\` loop walks through any sequence:\n\n\`\`\`python\ntotal = 0\nfor n in range(5):\n    total += n\nprint(total)\n\`\`\`\n\nTry writing your own loop below before checking the solution.`,
    [
      {
        title: "Sum of a List",
        description: "Write a function `sum_list(nums)` that returns the sum of all numbers in the list `nums` using a loop (not `sum()`).",
        difficulty: "easy",
        starterCode: `def sum_list(nums):\n    # your code here\n    pass\n`,
        solutionCode: `def sum_list(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total\n`,
        xpReward: 10,
        questions: [
          {
            prompt: "sum_list([1,2,3]) should be 6",
            testCode: `assert sum_list([1,2,3]) == 6`,
            hint: "Start a total at 0, then add each number in the loop.",
          },
          {
            prompt: "sum_list([]) should be 0",
            testCode: `assert sum_list([]) == 0`,
            hint: "An empty list means the loop body never runs — total stays at its starting value.",
          },
        ],
      },
      {
        title: "Python Loop: FizzBuzz",
        description: "Write `fizzbuzz(n)` that returns a list of strings for 1..n: 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for both, else the number as a string.",
        difficulty: "medium",
        starterCode: `def fizzbuzz(n):\n    # your code here\n    pass\n`,
        solutionCode: `def fizzbuzz(n):\n    result = []\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            result.append("FizzBuzz")\n        elif i % 3 == 0:\n            result.append("Fizz")\n        elif i % 5 == 0:\n            result.append("Buzz")\n        else:\n            result.append(str(i))\n    return result\n`,
        xpReward: 20,
        questions: [
          {
            prompt: "fizzbuzz(15) ends with FizzBuzz",
            testCode: `assert fizzbuzz(15)[-1] == "FizzBuzz"`,
            hint: "Check divisibility by 15 (both 3 and 5) before checking 3 or 5 alone.",
          },
          {
            prompt: "fizzbuzz(5) == ['1','2','Fizz','4','Buzz']",
            testCode: `assert fizzbuzz(5) == ['1','2','Fizz','4','Buzz']`,
            hint: "Non-multiples should be the number converted to a string with str().",
          },
        ],
      },
    ]
  );

  await buildModule(
    "python",
    "Functions & Data Structures",
    1,
    "Dictionaries & Functions",
    `# Dictionaries & Functions\n\nDictionaries map keys to values:\n\n\`\`\`python\nages = {"amy": 20, "ben": 22}\nages["cleo"] = 19\n\`\`\`\n\nFunctions can take default arguments and return multiple values via tuples.`,
    [
      {
        title: "Word Frequency Counter",
        description: "Write `word_count(text)` returning a dict mapping each lowercase word to how many times it appears. Split on whitespace.",
        difficulty: "medium",
        starterCode: `def word_count(text):\n    # your code here\n    pass\n`,
        solutionCode: `def word_count(text):\n    counts = {}\n    for word in text.lower().split():\n        counts[word] = counts.get(word, 0) + 1\n    return counts\n`,
        xpReward: 20,
        questions: [
          {
            prompt: 'word_count("a a b") == {"a": 2, "b": 1}',
            testCode: `assert word_count("a a b") == {"a": 2, "b": 1}`,
            hint: "Use dict.get(word, 0) to read the current count before incrementing.",
          },
        ],
      },
      {
        title: "Boss: Grade Book",
        description: "Write `top_student(grades)` where grades is a dict of name -> average score. Return the name of the student with the highest average. If tied, return the alphabetically first name.",
        difficulty: "boss",
        starterCode: `def top_student(grades):\n    # your code here\n    pass\n`,
        solutionCode: `def top_student(grades):\n    best_name = None\n    best_score = float("-inf")\n    for name in sorted(grades):\n        score = grades[name]\n        if score > best_score:\n            best_score = score\n            best_name = name\n    return best_name\n`,
        xpReward: 100,
        questions: [
          {
            prompt: 'top_student({"a": 90, "b": 95}) == "b"',
            testCode: `assert top_student({"a": 90, "b": 95}) == "b"`,
            hint: "Iterate sorted names so ties resolve alphabetically without extra logic.",
          },
          {
            prompt: "ties resolve alphabetically",
            testCode: `assert top_student({"z": 80, "a": 80}) == "a"`,
            hint: "sorted(grades) gives you names in alphabetical order to check first.",
          },
        ],
      },
    ]
  );

  // --- Lighter placeholder content for the rest of the path ---
  const rest: Record<string, { module: string; lesson: string; content: string; quest: { title: string; description: string; difficulty: "easy" | "medium" | "hard" | "boss"; starter: string; solution: string; xp: number; prompt: string; test: string; hint: string } }> = {
    numpy: {
      module: "Arrays",
      lesson: "Intro to NumPy Arrays",
      content: `# NumPy Arrays\n\nNumPy arrays are fast, fixed-type numerical containers. In this sandbox we simulate array-style logic with plain Python lists since NumPy isn't installed — the concepts (vectorized math, indexing) transfer directly once you have NumPy locally.`,
      quest: {
        title: "Element-wise Sum",
        description: "Write `add_arrays(a, b)` that returns a new list where each element is a[i] + b[i]. Assume equal length.",
        difficulty: "easy",
        starter: `def add_arrays(a, b):\n    # your code here\n    pass\n`,
        solution: `def add_arrays(a, b):\n    return [x + y for x, y in zip(a, b)]\n`,
        xp: 10,
        prompt: "add_arrays([1,2],[3,4]) == [4,6]",
        test: `assert add_arrays([1,2],[3,4]) == [4,6]`,
        hint: "zip(a, b) pairs up elements from both lists so you can add them together.",
      },
    },
    pandas: {
      module: "DataFrames",
      lesson: "Rows, Columns & Filtering",
      content: `# Pandas Basics\n\nA DataFrame is a table of rows and columns. Here we model a tiny table as a list of dicts to practice the filtering logic pandas uses under the hood.`,
      quest: {
        title: "Filter Rows",
        description: "Write `filter_by_age(rows, min_age)` where rows is a list of dicts with an 'age' key. Return only rows where age >= min_age.",
        difficulty: "easy",
        starter: `def filter_by_age(rows, min_age):\n    # your code here\n    pass\n`,
        solution: `def filter_by_age(rows, min_age):\n    return [r for r in rows if r["age"] >= min_age]\n`,
        xp: 10,
        prompt: "filters correctly",
        test: `assert filter_by_age([{"age": 18},{"age": 25}], 20) == [{"age": 25}]`,
        hint: "A list comprehension with an if clause keeps only matching rows.",
      },
    },
    "math-stats": {
      module: "Statistics",
      lesson: "Mean, Median & Variance",
      content: `# Descriptive Statistics\n\nMean is the average. Variance measures spread: the average squared distance from the mean.`,
      quest: {
        title: "Compute Mean",
        description: "Write `mean(nums)` returning the average of a non-empty list of numbers.",
        difficulty: "easy",
        starter: `def mean(nums):\n    # your code here\n    pass\n`,
        solution: `def mean(nums):\n    return sum(nums) / len(nums)\n`,
        xp: 10,
        prompt: "mean([2,4,6]) == 4",
        test: `assert mean([2,4,6]) == 4`,
        hint: "Divide the total sum by how many numbers there are.",
      },
    },
    "dsa-sql": {
      module: "Algorithms",
      lesson: "Binary Search",
      content: `# Binary Search\n\nOn a sorted list, binary search halves the search space each step — O(log n) instead of O(n).`,
      quest: {
        title: "Binary Search",
        description: "Write `binary_search(sorted_list, target)` returning the index of target, or -1 if not found.",
        difficulty: "medium",
        starter: `def binary_search(sorted_list, target):\n    # your code here\n    pass\n`,
        solution: `def binary_search(sorted_list, target):\n    lo, hi = 0, len(sorted_list) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if sorted_list[mid] == target:\n            return mid\n        elif sorted_list[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n`,
        xp: 20,
        prompt: "binary_search([1,3,5,7], 5) == 2",
        test: `assert binary_search([1,3,5,7], 5) == 2`,
        hint: "Track lo/hi bounds and compare the middle element to the target each step.",
      },
    },
    "machine-learning": {
      module: "Foundations",
      lesson: "Train/Test Split & Accuracy",
      content: `# Evaluating Models\n\nAccuracy = correct predictions / total predictions. Splitting data into train/test sets prevents a model from being graded on data it memorized.`,
      quest: {
        title: "Compute Accuracy",
        description: "Write `accuracy(preds, labels)` returning the fraction of predictions that match the true labels (0.0 to 1.0).",
        difficulty: "easy",
        starter: `def accuracy(preds, labels):\n    # your code here\n    pass\n`,
        solution: `def accuracy(preds, labels):\n    correct = sum(1 for p, l in zip(preds, labels) if p == l)\n    return correct / len(labels)\n`,
        xp: 10,
        prompt: "accuracy([1,0,1],[1,0,0]) == 2/3",
        test: `assert abs(accuracy([1,0,1],[1,0,0]) - 2/3) < 1e-9`,
        hint: "Count matches with zip(preds, labels), then divide by the total count.",
      },
    },
    "deep-learning": {
      module: "Neural Networks",
      lesson: "The Sigmoid Activation",
      content: `# Activation Functions\n\nSigmoid squashes any number into (0, 1): sigmoid(x) = 1 / (1 + e^-x). It's the building block of a neuron's output.`,
      quest: {
        title: "Implement Sigmoid",
        description: "Write `sigmoid(x)` implementing the sigmoid function using `math.exp`.",
        difficulty: "medium",
        starter: `import math\n\ndef sigmoid(x):\n    # your code here\n    pass\n`,
        solution: `import math\n\ndef sigmoid(x):\n    return 1 / (1 + math.exp(-x))\n`,
        xp: 20,
        prompt: "sigmoid(0) == 0.5",
        test: `assert abs(sigmoid(0) - 0.5) < 1e-9`,
        hint: "math.exp(-x) gives you e^-x for the denominator.",
      },
    },
    "genai-llm": {
      module: "Language Models",
      lesson: "Tokens & Context Windows",
      content: `# Tokens\n\nLLMs read text as tokens, not characters or whole words. A rough rule of thumb: 1 token ≈ 4 characters of English text.`,
      quest: {
        title: "Estimate Token Count",
        description: "Write `estimate_tokens(text)` returning `len(text) // 4` as a rough token estimate.",
        difficulty: "easy",
        starter: `def estimate_tokens(text):\n    # your code here\n    pass\n`,
        solution: `def estimate_tokens(text):\n    return len(text) // 4\n`,
        xp: 10,
        prompt: "estimate_tokens('a'*8) == 2",
        test: `assert estimate_tokens('a'*8) == 2`,
        hint: "Integer-divide the character length by 4.",
      },
    },
    "ai-agents": {
      module: "Tool Use",
      lesson: "Routing to the Right Tool",
      content: `# Agent Tool Routing\n\nAn agent picks a tool based on the user's intent. A simple router matches keywords to tool names before anything fancier.`,
      quest: {
        title: "Simple Tool Router",
        description: "Write `route(query)` returning 'calculator' if the query contains any of '+','-','*','/', else 'search'.",
        difficulty: "medium",
        starter: `def route(query):\n    # your code here\n    pass\n`,
        solution: `def route(query):\n    if any(op in query for op in "+-*/"):\n        return "calculator"\n    return "search"\n`,
        xp: 20,
        prompt: "route('2+2') == 'calculator'",
        test: `assert route('2+2') == 'calculator' and route('capital of France') == 'search'`,
        hint: "any(op in query for op in \"+-*/\") checks all four operators at once.",
      },
    },
    projects: {
      module: "Capstone",
      lesson: "Shipping a Project",
      content: `# Shipping\n\nA finished small project beats an unfinished ambitious one. Track status, link your repo, and ship a demo.`,
      quest: {
        title: "Project Readiness Check",
        description: "Write `is_ready_to_ship(project)` where project is a dict with keys 'has_readme', 'has_demo', 'tests_pass' (all bools). Return True only if all three are True.",
        difficulty: "easy",
        starter: `def is_ready_to_ship(project):\n    # your code here\n    pass\n`,
        solution: `def is_ready_to_ship(project):\n    return project["has_readme"] and project["has_demo"] and project["tests_pass"]\n`,
        xp: 10,
        prompt: "all true => True",
        test: `assert is_ready_to_ship({"has_readme": True, "has_demo": True, "tests_pass": True}) is True`,
        hint: "Combine all three dict values with 'and'.",
      },
    },
  };

  for (const [slug, def] of Object.entries(rest)) {
    await buildModule(slug, def.module, 0, def.lesson, def.content, [
      {
        title: def.quest.title,
        description: def.quest.description,
        difficulty: def.quest.difficulty,
        starterCode: def.quest.starter,
        solutionCode: def.quest.solution,
        xpReward: def.quest.xp,
        questions: [{ prompt: def.quest.prompt, testCode: def.quest.test, hint: def.quest.hint }],
      },
    ]);
  }

  // --- CGPA subjects & study tasks ---
  const subjectNames = ["Data Structures & Algorithms", "Machine Learning", "Linear Algebra", "Technical English"];
  for (const name of subjectNames) {
    const existing = await prisma.subject.findFirst({ where: { userId: user.id, name } });
    const subject =
      existing ??
      (await prisma.subject.create({
        data: { userId: user.id, name, targetCgpa: 3.7, progress: Math.floor(Math.random() * 40) + 30 },
      }));

    const taskExists = await prisma.studyTask.findFirst({ where: { subjectId: subject.id } });
    if (!taskExists) {
      await prisma.studyTask.createMany({
        data: [
          { userId: user.id, subjectId: subject.id, title: `${name}: Assignment 1`, type: "assignment", done: false },
          { userId: user.id, subjectId: subject.id, title: `${name}: Midterm Review`, type: "exam", done: false },
          { userId: user.id, subjectId: subject.id, title: `${name}: Chapter Reading`, type: "reading", done: true },
        ],
      });
    }
  }

  // --- Sample project ---
  const projectExists = await prisma.project.findFirst({ where: { userId: user.id } });
  if (!projectExists) {
    await prisma.project.create({
      data: {
        userId: user.id,
        title: "AI Study Buddy Chatbot",
        description: "A small RAG chatbot that answers questions from my lecture notes.",
        status: "in_progress",
        githubUrl: "https://github.com/example/ai-study-buddy",
        demoUrl: "",
      },
    });
  }

  // --- Sample leaderboard peers (demo data so /leaderboard isn't empty) ---
  const peers = [
    { email: "demo.alex@aiquest.dev", name: "Alex", level: 6, xp: 40, streak: 12 },
    { email: "demo.priya@aiquest.dev", name: "Priya", level: 4, xp: 20, streak: 5 },
    { email: "demo.wei@aiquest.dev", name: "Wei", level: 3, xp: 60, streak: 2 },
    { email: "demo.sam@aiquest.dev", name: "Sam", level: 2, xp: 10, streak: 0 },
  ];
  for (const peer of peers) {
    await prisma.user.upsert({
      where: { email: peer.email },
      update: {},
      create: { ...peer, xpToNext: 100 + (peer.level - 1) * 50 },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
