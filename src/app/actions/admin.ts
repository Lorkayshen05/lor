"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { courseSchema, questAdminSchema } from "@/lib/validation";
import { XP_BY_DIFFICULTY } from "@/lib/xp";

export type AdminState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };

export async function upsertCourseAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = courseSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon") || "🎯",
    order: formData.get("order") ?? 0,
    published: formData.get("published") === "on" || formData.get("published") === "true",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  await prisma.course.upsert({
    where: { slug: parsed.data.slug },
    update: parsed.data,
    create: parsed.data,
  });

  revalidatePath("/admin");
  revalidatePath("/courses");
  return { success: `Course "${parsed.data.title}" saved.` };
}

export async function deleteCourseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/courses");
}

export async function upsertQuestAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = questAdminSchema.safeParse({
    id: formData.get("id") || undefined,
    lessonId: formData.get("lessonId"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description"),
    difficulty: formData.get("difficulty"),
    concept: formData.get("concept"),
    instructions: formData.get("instructions"),
    starterCode: formData.get("starterCode") ?? "",
    expectedBehavior: formData.get("expectedBehavior"),
    hints: formData.get("hints") ?? "",
    solution: formData.get("solution") ?? "",
    xp: formData.get("xp") || XP_BY_DIFFICULTY[(formData.get("difficulty") as keyof typeof XP_BY_DIFFICULTY) ?? "EASY"],
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const lesson = await prisma.lesson.findUnique({ where: { id: parsed.data.lessonId }, select: { id: true } });
  if (!lesson) return { error: "Lesson not found." };

  const hints = parsed.data.hints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const data = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    difficulty: parsed.data.difficulty,
    concept: parsed.data.concept,
    instructions: parsed.data.instructions,
    starterCode: parsed.data.starterCode,
    expectedBehavior: parsed.data.expectedBehavior,
    hints,
    solution: parsed.data.solution,
    xp: parsed.data.xp,
    order: parsed.data.order,
  };

  await prisma.quest.upsert({
    where: { lessonId_slug: { lessonId: lesson.id, slug: parsed.data.slug } },
    update: data,
    create: { ...data, lessonId: lesson.id },
  });

  revalidatePath("/admin");
  return { success: `Quest "${parsed.data.title}" saved.` };
}

export async function deleteQuestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.quest.delete({ where: { id } });
  revalidatePath("/admin");
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "USER";
  if (userId === admin.id) return; // never lock yourself out
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}
