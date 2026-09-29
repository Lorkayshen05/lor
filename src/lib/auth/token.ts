import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bs_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type TokenPayload = { sub: string; sv: number };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  if (process.env.NODE_ENV === "production" && secret.startsWith("dev-only")) {
    throw new Error("AUTH_SECRET is still the development placeholder");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sv: payload.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifyToken(token: string | undefined): Promise<TokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") return null;
    return { sub: payload.sub, sv: payload.sv };
  } catch {
    return null;
  }
}
