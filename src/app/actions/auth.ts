"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validation";

/** Next signals redirects by throwing; those must never be swallowed. */
function isRedirectError(error: unknown): boolean {
  return typeof (error as { digest?: string })?.digest === "string" && (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export type FormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const limit = rateLimit(`register:${parsed.data.email}`, 5, 60_000);
  if (!limit.ok) return { error: "Too many attempts. Try again in a minute." };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: parsed.data.email }, { username: parsed.data.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    return {
      fieldErrors:
        existing.email === parsed.data.email
          ? { email: ["That email is already registered"] }
          : { username: ["That username is taken"] },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      username: parsed.data.username,
      passwordHash,
      profile: { create: { displayName: parsed.data.username } },
      streak: { create: {} },
    },
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Account created, but sign-in failed. Try logging in." };
  }

  return {};
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const limit = rateLimit(`login:${parsed.data.email}`, 10, 60_000);
  if (!limit.ok) return { error: "Too many attempts. Try again in a minute." };

  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return { error: "Wrong email or password." };
    throw error;
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
