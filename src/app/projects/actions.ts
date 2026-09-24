"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { checkAndUnlockAchievements } from "@/lib/game/achievements";

async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

const urlSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Link must start with http:// or https://");

const addSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).default(""),
  githubUrl: urlSchema,
  demoUrl: urlSchema,
  skills: z.string().trim().max(300).default(""),
});

export async function addProject(formData: FormData) {
  const user = await requireUser();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const skills = parsed.data.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await db.insert(projects).values({
    userId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    githubUrl: parsed.data.githubUrl || null,
    demoUrl: parsed.data.demoUrl || null,
    skills,
    status: "idea",
  });
  await checkAndUnlockAchievements(user.id);
  revalidatePath("/projects");
}

const STATUSES = ["idea", "building", "shipped"] as const;

export async function updateProjectStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "idea");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;

  await db
    .update(projects)
    .set({ status: status as (typeof STATUSES)[number] })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id))); // ownership check
  await checkAndUnlockAchievements(user.id);
  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  revalidatePath("/projects");
}
