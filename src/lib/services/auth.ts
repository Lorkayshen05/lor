import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema, fieldErrors } from "@/lib/validation/schemas";

export type AuthResult =
  | { ok: true; user: { id: string; role: "USER" | "BUSINESS_OWNER" | "ADMIN"; sessionVersion: number } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function registerUser(raw: unknown): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password } = parsed.data;
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true, role: true, sessionVersion: true },
    });
    return { ok: true, user };
  } catch (e) {
    if (typeof e === "object" && e && (e as { code?: string }).code === "P2002") {
      return { ok: false, error: "An account with this email already exists. Try logging in." };
    }
    throw e;
  }
}

/** Generic error text on purpose: never reveal whether the email exists. */
export async function authenticate(raw: unknown, now: Date = new Date()): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(raw);
  const bad: AuthResult = { ok: false, error: "Incorrect email or password." };
  if (!parsed.success) return bad;
  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  if (user?.lockedUntil && user.lockedUntil > now) {
    return { ok: false, error: "Too many failed attempts. Please try again in a few minutes." };
  }
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data: failed >= MAX_FAILED
          ? { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) }
          : { failedLogins: failed },
      });
    }
    return bad;
  }
  if (user.failedLogins > 0 || user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  return { ok: true, user: { id: user.id, role: user.role, sessionVersion: user.sessionVersion } };
}
