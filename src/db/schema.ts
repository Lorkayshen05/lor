import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

// ---------- Auth ----------

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
    xp: integer("xp").notNull().default(0), // lifetime total; level is derived from this
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(raw token) — the cookie holds the raw token, never this
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

// ---------- Curriculum ----------

export const courses = sqliteTable(
  "courses",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("book"),
    order: integer("order").notNull().default(0),
  },
  (t) => [uniqueIndex("courses_slug_idx").on(t.slug)]
);

export const modules = sqliteTable(
  "modules",
  {
    id: id(),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("modules_course_idx").on(t.courseId), uniqueIndex("modules_course_slug_idx").on(t.courseId, t.slug)]
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: id(),
    moduleId: text("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    contentMd: text("content_md").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId), uniqueIndex("lessons_module_slug_idx").on(t.moduleId, t.slug)]
);

export const quests = sqliteTable(
  "quests",
  {
    id: id(),
    lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    type: text("type", { enum: ["code", "quiz"] }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard", "boss"] }).notNull(),
    xp: integer("xp").notNull(),
    order: integer("order").notNull().default(0),
    // CODE fields
    starterCode: text("starter_code"),
    solutionCode: text("solution_code"),
    expectedStdout: text("expected_stdout"),
    tests: text("tests", { mode: "json" }).$type<{ name: string; code: string }[]>(),
    hints: text("hints", { mode: "json" }).$type<string[]>(),
  },
  (t) => [index("quests_lesson_idx").on(t.lessonId), uniqueIndex("quests_lesson_slug_idx").on(t.lessonId, t.slug)]
);

export type QuizOption = { text: string; correct: boolean; feedback: string };
export type QuizVariant = { prompt: string; options: QuizOption[]; rule: string };

export const questions = sqliteTable(
  "questions",
  {
    id: id(),
    questId: text("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull().default(0),
    variants: text("variants", { mode: "json" }).notNull().$type<QuizVariant[]>(),
  },
  (t) => [index("questions_quest_idx").on(t.questId)]
);

// ---------- Progress & Game System ----------

export const submissions = sqliteTable(
  "submissions",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questId: text("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["code", "quiz"] }).notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull(),
    verified: text("verified", { enum: ["client", "server"] }),
    stdout: text("stdout"),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    errorLine: integer("error_line"),
    hintsUsed: integer("hints_used").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("submissions_user_quest_idx").on(t.userId, t.questId)]
);

export const progress = sqliteTable(
  "progress",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questId: text("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    mastery: integer("mastery").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    hintsUsed: integer("hints_used").notNull().default(0),
    noHint: integer("no_hint", { mode: "boolean" }).notNull().default(true),
    firstTry: integer("first_try", { mode: "boolean" }).notNull().default(false),
    quizSlotsSolved: text("quiz_slots_solved", { mode: "json" }).$type<number[]>().notNull().default(sql`'[]'`),
    ...timestamps,
  },
  (t) => [uniqueIndex("progress_user_quest_idx").on(t.userId, t.questId)]
);

export const achievements = sqliteTable(
  "achievements",
  {
    id: id(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("trophy"),
  },
  (t) => [uniqueIndex("achievements_key_idx").on(t.key)]
);

export const userAchievements = sqliteTable(
  "user_achievements",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("user_achievements_idx").on(t.userId, t.achievementId)]
);

export const mistakes = sqliteTable(
  "mistakes",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    kind: text("kind").notNull(), // NameError | wrong-output | infinite-loop | grammar | ...
    count: integer("count").notNull().default(1),
    lastDetail: text("last_detail"),
    ...timestamps,
  },
  (t) => [uniqueIndex("mistakes_user_topic_kind_idx").on(t.userId, t.topic, t.kind)]
);

export const streaks = sqliteTable(
  "streaks",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    current: integer("current").notNull().default(0),
    longest: integer("longest").notNull().default(0),
    lastActiveDate: text("last_active_date"), // YYYY-MM-DD in APP_TIMEZONE
    ...timestamps,
  },
  (t) => [uniqueIndex("streaks_user_idx").on(t.userId)]
);

// ---------- CGPA ----------

export const subjects = sqliteTable(
  "subjects",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    credits: integer("credits").notNull().default(3),
    targetGrade: text("target_grade").notNull().default("B+"),
    ...timestamps,
  },
  (t) => [index("subjects_user_idx").on(t.userId)]
);

export const studyTasks = sqliteTable(
  "study_tasks",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["assignment", "exam", "revision"] }).notNull(),
    weightPct: integer("weight_pct").notNull().default(0),
    dueDate: text("due_date"), // YYYY-MM-DD
    status: text("status", { enum: ["todo", "in_progress", "done"] }).notNull().default("todo"),
    score: integer("score"), // 0-100, null until graded
    ...timestamps,
  },
  (t) => [index("study_tasks_user_idx").on(t.userId), index("study_tasks_subject_idx").on(t.subjectId)]
);

// ---------- Projects ----------

export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["idea", "building", "shipped"] }).notNull().default("idea"),
    githubUrl: text("github_url"),
    demoUrl: text("demo_url"),
    skills: text("skills", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    ...timestamps,
  },
  (t) => [index("projects_user_idx").on(t.userId)]
);

// ---------- English ----------

export const englishAttempts = sqliteTable(
  "english_attempts",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(), // references src/content/english.ts, not a DB row
    kind: text("kind", { enum: ["listening", "reading", "speaking"] }).notNull(),
    attemptNumber: integer("attempt_number").notNull().default(1),
    transcript: text("transcript").notNull(),
    meaningScore: integer("meaning_score").notNull().default(0),
    keyPointsCovered: text("key_points_covered", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    keyPointsMissing: text("key_points_missing", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    grammarIssues: text("grammar_issues", { mode: "json" })
      .$type<{ wrong: string; fix: string; why: string }[]>()
      .notNull()
      .default(sql`'[]'`),
    passed: integer("passed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("english_attempts_user_exercise_idx").on(t.userId, t.exerciseId)]
);

// ---------- Relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  progress: many(progress),
  submissions: many(submissions),
  achievements: many(userAchievements),
  mistakes: many(mistakes),
  subjects: many(subjects),
  projects: many(projects),
}));

export const coursesRelations = relations(courses, ({ many }) => ({ modules: many(modules) }));
export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));
export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
  quests: many(quests),
}));
export const questsRelations = relations(quests, ({ one, many }) => ({
  lesson: one(lessons, { fields: [quests.lessonId], references: [lessons.id] }),
  questions: many(questions),
}));
export const questionsRelations = relations(questions, ({ one }) => ({
  quest: one(quests, { fields: [questions.questId], references: [quests.id] }),
}));
export const subjectsRelations = relations(subjects, ({ many }) => ({ studyTasks: many(studyTasks) }));
export const studyTasksRelations = relations(studyTasks, ({ one }) => ({
  subject: one(subjects, { fields: [studyTasks.subjectId], references: [subjects.id] }),
}));
