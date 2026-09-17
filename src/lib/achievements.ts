export type AchievementDef = {
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "FIRST_QUEST", title: "First Quest", description: "Complete your very first quest.", icon: "⚔️", xpReward: 10 },
  { code: "TEN_QUESTS", title: "Quest Veteran", description: "Complete 10 quests.", icon: "🛡️", xpReward: 30 },
  { code: "PYTHON_BEGINNER", title: "Python Beginner", description: "Complete 3 quests in the Python course.", icon: "🐍", xpReward: 20 },
  { code: "PYTHON_MASTER", title: "Python Master", description: "Complete every quest in the Python course.", icon: "👑", xpReward: 100 },
  { code: "STREAK_7", title: "7-Day Streak", description: "Practise 7 days in a row.", icon: "🔥", xpReward: 50 },
  { code: "BOSS_DEFEATED", title: "Boss Defeated", description: "Beat a boss quest.", icon: "🐲", xpReward: 60 },
  { code: "FIRST_PROJECT", title: "First Project", description: "Ship your first project.", icon: "🚀", xpReward: 40 },
];

export const ACHIEVEMENT_BY_CODE = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

export type AchievementStats = {
  completedQuests: number;
  pythonCompleted: number;
  pythonTotal: number;
  bossCompleted: number;
  streak: number;
  projects: number;
};

/** Codes the user qualifies for right now (unlocking is idempotent upstream). */
export function evaluateAchievements(stats: AchievementStats): string[] {
  const earned: string[] = [];
  if (stats.completedQuests >= 1) earned.push("FIRST_QUEST");
  if (stats.completedQuests >= 10) earned.push("TEN_QUESTS");
  if (stats.pythonCompleted >= 3) earned.push("PYTHON_BEGINNER");
  if (stats.pythonTotal > 0 && stats.pythonCompleted >= stats.pythonTotal) earned.push("PYTHON_MASTER");
  if (stats.streak >= 7) earned.push("STREAK_7");
  if (stats.bossCompleted >= 1) earned.push("BOSS_DEFEATED");
  if (stats.projects >= 1) earned.push("FIRST_PROJECT");
  return earned;
}
