import { z } from "zod";

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(24, "Username must be at most 24 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only"),
    email: z.email("Enter a valid email").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Display name is too short").max(40),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  goal: z.string().trim().max(120).optional().or(z.literal("")),
  avatarUrl: z.url("Enter a valid URL").optional().or(z.literal("")),
});

export const testResultSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  passed: z.boolean(),
  hidden: z.boolean(),
  expected: z.string(),
  actual: z.string(),
  message: z.string(),
});

export const submissionSchema = z.object({
  questId: z.string().min(1),
  code: z.string().min(1, "Write some code first").max(20_000, "Code is too long"),
  stdout: z.string().max(20_000).default(""),
  stderr: z.string().max(20_000).default(""),
  error: z.string().max(20_000).nullable().default(null),
  durationMs: z.number().int().min(0).max(120_000).default(0),
  results: z.array(testResultSchema).max(50),
});

export const hintSchema = z.object({ questId: z.string().min(1) });

export const tutorSchema = z.object({
  action: z.enum(["explain", "hint", "debug", "review", "practice", "boss"]),
  questId: z.string().min(1).optional(),
  code: z.string().max(20_000).optional(),
  error: z.string().max(5_000).optional(),
  question: z.string().max(1_000).optional(),
});

export const projectSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(1_000),
  technology: z.string().trim().max(200).default(""),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]),
  githubUrl: z.url("Enter a valid URL").optional().or(z.literal("")),
  demoUrl: z.url("Enter a valid URL").optional().or(z.literal("")),
  completion: z.coerce.number().int().min(0).max(100),
});

export const courseSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(500),
  icon: z.string().trim().min(1).max(8).default("🎯"),
  order: z.coerce.number().int().min(0).max(999).default(0),
  published: z.coerce.boolean().default(true),
});

export const questAdminSchema = z.object({
  id: z.string().min(1).optional(),
  lessonId: z.string().min(1),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(500),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "BOSS"]),
  concept: z.string().trim().min(2).max(60),
  instructions: z.string().trim().min(10).max(4_000),
  starterCode: z.string().max(10_000).default(""),
  expectedBehavior: z.string().trim().min(5).max(1_000),
  hints: z.string().max(2_000).default(""),
  solution: z.string().max(10_000).default(""),
  xp: z.coerce.number().int().min(0).max(1_000),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type TutorInput = z.infer<typeof tutorSchema>;
