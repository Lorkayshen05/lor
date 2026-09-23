"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";

const STATUSES = ["planning", "in_progress", "done"];

export async function addProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const githubUrl = String(formData.get("githubUrl") ?? "").trim();
  const demoUrl = String(formData.get("demoUrl") ?? "").trim();
  if (!title) return;

  const user = await getOrCreateDemoUser();
  await prisma.project.create({
    data: {
      userId: user.id,
      title: title.slice(0, 150),
      description: description.slice(0, 1000),
      githubUrl: githubUrl || null,
      demoUrl: demoUrl || null,
      status: "planning",
    },
  });
  revalidatePath("/projects");
}

export async function updateProjectStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "planning");
  if (!STATUSES.includes(status)) return;

  const user = await getOrCreateDemoUser();
  await prisma.project.updateMany({ where: { id, userId: user.id }, data: { status } });
  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const user = await getOrCreateDemoUser();
  await prisma.project.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/projects");
}
