"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";

export async function addSubject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const targetCgpa = Number(formData.get("targetCgpa") ?? 4.0);
  if (!name) return;

  const user = await getOrCreateDemoUser();
  await prisma.subject.create({
    data: { userId: user.id, name: name.slice(0, 120), targetCgpa: Number.isFinite(targetCgpa) ? targetCgpa : 4.0 },
  });
  revalidatePath("/cgpa");
}

export async function deleteSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const user = await getOrCreateDemoUser();
  await prisma.studyTask.deleteMany({ where: { subjectId: id, userId: user.id } });
  await prisma.subject.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/cgpa");
}

export async function updateSubjectProgress(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const progress = Number(formData.get("progress") ?? 0);
  const user = await getOrCreateDemoUser();
  await prisma.subject.updateMany({
    where: { id, userId: user.id },
    data: { progress: Math.max(0, Math.min(100, progress)) },
  });
  revalidatePath("/cgpa");
}

export async function addStudyTask(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "assignment");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  if (!subjectId || !title) return;

  const user = await getOrCreateDemoUser();
  await prisma.studyTask.create({
    data: {
      userId: user.id,
      subjectId,
      title: title.slice(0, 200),
      type: ["assignment", "exam", "reading"].includes(type) ? type : "assignment",
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });
  revalidatePath("/cgpa");
}

export async function toggleStudyTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const done = formData.get("done") === "true";
  const user = await getOrCreateDemoUser();
  await prisma.studyTask.updateMany({ where: { id, userId: user.id }, data: { done: !done } });
  revalidatePath("/cgpa");
}

export async function deleteStudyTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const user = await getOrCreateDemoUser();
  await prisma.studyTask.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/cgpa");
}
