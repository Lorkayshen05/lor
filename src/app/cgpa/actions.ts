"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { subjects, studyTasks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";

async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

const subjectSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(150),
  credits: z.coerce.number().int().min(1).max(10),
  targetGrade: z.string().trim().min(1).max(5),
});

export async function addSubject(formData: FormData) {
  const user = await requireUser();
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await db.insert(subjects).values({ userId: user.id, ...parsed.data });
  revalidatePath("/cgpa");
}

export async function deleteSubject(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.delete(studyTasks).where(and(eq(studyTasks.subjectId, id), eq(studyTasks.userId, user.id)));
  await db.delete(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, user.id))); // ownership check
  revalidatePath("/cgpa");
}

const taskSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["assignment", "exam", "revision"]),
  weightPct: z.coerce.number().int().min(0).max(100),
  dueDate: z.string().optional(),
});

export async function addTask(formData: FormData) {
  const user = await requireUser();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  // ownership check: the subject must belong to this user
  const subject = await db.query.subjects.findFirst({ where: and(eq(subjects.id, parsed.data.subjectId), eq(subjects.userId, user.id)) });
  if (!subject) return;

  await db.insert(studyTasks).values({ userId: user.id, ...parsed.data, dueDate: parsed.data.dueDate || null });
  revalidatePath("/cgpa");
}

export async function updateTaskScore(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const scoreRaw = formData.get("score");
  const score = scoreRaw === "" || scoreRaw === null ? null : Math.max(0, Math.min(100, Number(scoreRaw)));
  await db
    .update(studyTasks)
    .set({ score, status: score !== null ? "done" : "todo" })
    .where(and(eq(studyTasks.id, id), eq(studyTasks.userId, user.id)));
  revalidatePath("/cgpa");
}

export async function deleteTask(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.delete(studyTasks).where(and(eq(studyTasks.id, id), eq(studyTasks.userId, user.id)));
  revalidatePath("/cgpa");
}
