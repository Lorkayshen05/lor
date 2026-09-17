"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { syncAchievements } from "@/server/progression";
import { projectSchema } from "@/lib/validation";

export type ProjectState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };

function parseForm(formData: FormData) {
  return projectSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    technology: formData.get("technology") ?? "",
    status: formData.get("status"),
    githubUrl: formData.get("githubUrl") ?? "",
    demoUrl: formData.get("demoUrl") ?? "",
    completion: formData.get("completion") ?? 0,
  });
}

function toTechnologies(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function createProjectAction(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  await prisma.project.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      technology: toTechnologies(parsed.data.technology),
      status: parsed.data.status,
      githubUrl: parsed.data.githubUrl || null,
      demoUrl: parsed.data.demoUrl || null,
      completion: parsed.data.completion,
    },
  });

  await syncAchievements(user.id);
  revalidatePath("/projects");
  return { success: "Project added." };
}

export async function updateProjectAction(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = parseForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const result = await prisma.project.updateMany({
    where: { id, userId: user.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      technology: toTechnologies(parsed.data.technology),
      status: parsed.data.status,
      githubUrl: parsed.data.githubUrl || null,
      demoUrl: parsed.data.demoUrl || null,
      completion: parsed.data.completion,
    },
  });
  if (result.count === 0) return { error: "Project not found." };

  revalidatePath("/projects");
  return { success: "Project updated." };
}

export async function deleteProjectAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.project.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/projects");
}
