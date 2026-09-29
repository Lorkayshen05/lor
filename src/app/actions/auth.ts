"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, registerUser } from "@/lib/services/auth";
import { createSession, destroySession } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formToObject, type FormState } from "@/lib/form-state";
import { safeNext } from "@/lib/utils";

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 20, 15 * 60_000).ok) return { ok: false, message: "Too many attempts. Please wait a few minutes." };
  const input = formToObject(fd);
  const r = await authenticate(input);
  if (!r.ok) return { ok: false, message: r.error };
  await createSession(r.user);
  const fallback = r.user.role === "ADMIN" ? "/admin" : r.user.role === "BUSINESS_OWNER" ? "/business/dashboard" : "/";
  redirect(safeNext(input.next, fallback));
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`register:${ip}`, 5, 60 * 60_000).ok) return { ok: false, message: "Too many sign-ups from your network. Please try again later." };
  const input = formToObject(fd);
  const r = await registerUser(input);
  if (!r.ok) return { ok: false, message: r.error, fieldErrors: r.fieldErrors };
  await createSession(r.user);
  redirect(safeNext(input.next, "/business/claim"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
