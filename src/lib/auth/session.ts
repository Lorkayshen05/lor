import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signToken, verifyToken } from "./token";
import type { Role } from "@/generated/prisma/enums";

export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function createSession(user: { id: string; sessionVersion: number }): Promise<void> {
  const token = await signToken({ sub: user.id, sv: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The signed cookie only proves *who*; role and revocation state are always re-read from the DB,
 * so demoting a user or bumping `sessionVersion` takes effect immediately.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== payload.sv) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});
