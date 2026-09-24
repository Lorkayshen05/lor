export type Difficulty = "easy" | "medium" | "hard" | "boss";

export interface CodeTest {
  name: string;
  code: string; // Python assert snippet, e.g. `assert total == 55, f"total should be 55, got {total}"`
}

export interface CodeQuestContent {
  slug: string;
  type: "code";
  title: string;
  description: string;
  difficulty: Difficulty;
  xp: number;
  starterCode: string;
  solutionCode: string;
  expectedStdout?: string;
  tests: CodeTest[];
  hints: string[]; // 2-3 progressive hints
}

export interface QuizOption {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface QuizVariant {
  prompt: string;
  options: QuizOption[];
  rule: string;
}

export interface QuizQuestContent {
  slug: string;
  type: "quiz";
  title: string;
  description: string;
  difficulty: Difficulty;
  xp: number;
  slots: QuizVariant[][]; // each inner array is [variant1, variant2] for one question slot
  hints: string[];
}

export type QuestContent = CodeQuestContent | QuizQuestContent;

export interface LessonContent {
  slug: string;
  title: string;
  contentMd: string;
  quests: QuestContent[];
}

export interface ModuleContent {
  slug: string;
  title: string;
  lessons: LessonContent[];
}

export interface CourseContent {
  slug: string;
  title: string;
  description: string;
  icon: string;
  modules: ModuleContent[];
}
