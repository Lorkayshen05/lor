import { describe, expect, it } from "vitest";
import { formatMyr, jsonLdString, normalizeMyPhone, safeHttpUrl, safeNext, slugify } from "@/lib/utils";

describe("utils", () => {
  it("normalises Malaysian phone numbers", () => {
    expect(normalizeMyPhone("012-345 6789")).toBe("60123456789");
    expect(normalizeMyPhone("+60 12-345 6789")).toBe("60123456789");
    expect(normalizeMyPhone("03-7877 1234")).toBe("60378771234");
    expect(normalizeMyPhone("12345")).toBeNull();
    expect(normalizeMyPhone("+65 9123 4567")).toBeNull();
    expect(normalizeMyPhone("")).toBeNull();
  });
  it("only allows http(s) URLs", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
  it("escapes < in JSON-LD", () => {
    expect(jsonLdString({ a: "</script><script>alert(1)" })).not.toContain("<");
  });
  it("formats money from sen", () => {
    expect(formatMyr(4900)).toBe("RM49");
    expect(formatMyr(1250)).toBe("RM12.50");
    expect(formatMyr(null)).toBe("");
  });
  it("slugifies", () => expect(slugify("  Taman OUG – Kuala Lumpur! ")).toBe("taman-oug-kuala-lumpur"));
  it("safeNext blocks open redirects", () => {
    expect(safeNext("/business/dashboard")).toBe("/business/dashboard");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext(null, "/x")).toBe("/x");
  });
});

import { truncateAtWord } from "@/lib/seo";
describe("truncateAtWord", () => {
  it("leaves short text alone and cuts long text at a word boundary", () => {
    expect(truncateAtWord("short text", 50)).toBe("short text");
    const out = truncateAtWord("word ".repeat(60).trim(), 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith("…")).toBe(true);
    expect(out.replace("…", "").endsWith("word")).toBe(true);
  });
});
