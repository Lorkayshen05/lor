export interface QuestQuestionView {
  id: string;
  prompt: string;
  hint: string;
}

export interface TestOutcomeView {
  id: string;
  prompt: string;
  passed: boolean;
  message: string;
}

export interface UnlockedAchievementView {
  key: string;
  title: string;
  description: string;
  icon: string;
}

export interface SubmitResponse {
  outcomes: TestOutcomeView[];
  passed: boolean;
  xpAwarded: number;
  attempts: number;
  mastery: number;
  user: { level: number; xp: number; xpToNext: number; streak: number };
  unlockedAchievements: UnlockedAchievementView[];
  nextQuestId: string | null;
  tutorMessage: string;
  error?: string;
}

export interface RunResponse {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
  error?: string;
}
