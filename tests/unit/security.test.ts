import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { signToken, verifyToken } from "@/lib/auth/token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SignJWT } from "jose";

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());
  it("allows up to the limit then blocks, per key", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("a", 3, 1000, 1000 + i).ok).toBe(true);
    const blocked = rateLimit("a", 3, 1000, 1010);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit("b", 3, 1000, 1010).ok).toBe(true);
  });
  it("recovers after the window", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 1000, 1000);
    expect(rateLimit("a", 3, 1000, 2500).ok).toBe(true);
  });
});

describe("session token", () => {
  it("round-trips", async () => {
    const t = await signToken({ sub: "u1", sv: 2 });
    expect(await verifyToken(t)).toEqual({ sub: "u1", sv: 2 });
  });
  it("rejects garbage, tampering and tokens signed with another secret", async () => {
    expect(await verifyToken(undefined)).toBeNull();
    expect(await verifyToken("abc.def.ghi")).toBeNull();
    const t = await signToken({ sub: "u1", sv: 0 });
    const tampered = t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa");
    expect(await verifyToken(tampered)).toBeNull();
    const other = await new SignJWT({ sv: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("admin")
      .setExpirationTime("1h").sign(new TextEncoder().encode("another-secret-another-secret-another-secret"));
    expect(await verifyToken(other)).toBeNull();
  });
  it("rejects alg=none tokens", async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    expect(await verifyToken(`${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "admin", sv: 0 })}.`)).toBeNull();
  });
  it("rejects expired tokens", async () => {
    const t = await new SignJWT({ sv: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("u")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200).setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
    expect(await verifyToken(t)).toBeNull();
  });
});

describe("password", () => {
  it("verifies correct and rejects wrong / missing user", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
  });
});
