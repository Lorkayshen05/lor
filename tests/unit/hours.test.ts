import { describe, expect, it } from "vitest";
import { getOpenStatus, hasVerifiedHours } from "@/lib/hours";

// 2026-09-29 is a Tuesday. Malaysia is UTC+8.
const at = (isoUtc: string) => new Date(isoUtc);
const hours = { tue: [{ open: "09:00", close: "18:00" }], wed: [{ open: "20:00", close: "02:00" }] };
const verified = new Date("2026-01-01");

describe("getOpenStatus", () => {
  it("is unknown when hours are not verified, even if data exists", () => {
    expect(getOpenStatus(hours, null, at("2026-09-29T04:00:00Z")).state).toBe("unknown");
  });
  it("is unknown for missing or malformed hours", () => {
    expect(getOpenStatus(null, verified).state).toBe("unknown");
    expect(getOpenStatus({ tue: [{ open: "9am", close: "6pm" }] }, verified).state).toBe("unknown");
  });
  it("is open inside a range (Tue 12:00 MYT = 04:00Z)", () => {
    expect(getOpenStatus(hours, verified, at("2026-09-29T04:00:00Z")).state).toBe("open");
  });
  it("is closed after closing (Tue 19:00 MYT = 11:00Z) and at close time exactly", () => {
    expect(getOpenStatus(hours, verified, at("2026-09-29T11:00:00Z")).state).toBe("closed");
    expect(getOpenStatus(hours, verified, at("2026-09-29T10:00:00Z")).state).toBe("closed");
  });
  it("handles ranges that pass midnight (Wed 20:00–02:00)", () => {
    expect(getOpenStatus(hours, verified, at("2026-09-30T13:00:00Z")).state).toBe("open"); // Wed 21:00 MYT
    expect(getOpenStatus(hours, verified, at("2026-09-30T17:00:00Z")).state).toBe("open"); // Thu 01:00 MYT (Wed's range)
    expect(getOpenStatus(hours, verified, at("2026-09-30T19:00:00Z")).state).toBe("closed"); // Thu 03:00 MYT
  });
  it("uses Malaysia time, not the server's zone (Tue 23:00Z is already Wed 07:00 MYT)", () => {
    expect(getOpenStatus(hours, verified, at("2026-09-29T23:00:00Z")).state).toBe("closed");
  });
  it("hasVerifiedHours requires both", () => {
    expect(hasVerifiedHours(hours, verified)).toBe(true);
    expect(hasVerifiedHours(hours, null)).toBe(false);
    expect(hasVerifiedHours("nope", verified)).toBe(false);
  });
});
