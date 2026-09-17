"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation";

export type ProfileState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? "",
    goal: formData.get("goal") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || null,
      goal: parsed.data.goal || null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
    create: {
      userId: user.id,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || null,
      goal: parsed.data.goal || null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
  });

  revalidatePath("/profile");
  return { success: "Profile saved." };
}
