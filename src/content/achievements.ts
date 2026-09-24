export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_quest", title: "First Steps", description: "Complete your first quest.", icon: "footprints" },
  { key: "five_quests", title: "Getting Warmed Up", description: "Complete 5 quests.", icon: "flame" },
  { key: "twenty_quests", title: "Quest Grinder", description: "Complete 20 quests.", icon: "swords" },
  { key: "boss_slayer", title: "Boss Slayer", description: "Defeat a boss quest.", icon: "trophy" },
  { key: "no_hint_solve", title: "Sharp Mind", description: "Solve a quest without using any hints.", icon: "brain" },
  { key: "first_try_solve", title: "Nailed It", description: "Pass a quest on your very first attempt.", icon: "star" },
  { key: "streak_3", title: "On a Roll", description: "Keep a 3-day streak.", icon: "flame" },
  { key: "streak_7", title: "Unstoppable", description: "Keep a 7-day streak.", icon: "flame" },
  { key: "level_5", title: "Rising Star", description: "Reach level 5.", icon: "star" },
  { key: "five_english", title: "Wordsmith", description: "Complete 5 English practice exercises.", icon: "book" },
  { key: "first_project", title: "Idea Person", description: "Add your first project.", icon: "rocket" },
  { key: "shipped_project", title: "Shipped It", description: "Mark a project as shipped.", icon: "rocket" },
  { key: "all_python", title: "Pythonista", description: "Complete every Python quest.", icon: "code" },
];
