import { describe, expect, it } from "vitest";
import { analyzeFailure } from "@/lib/mistakes";

describe("mistake analysis", () => {
  it("classifies a NameError", () => {
    const analysis = analyzeFailure({
      error: 'Traceback (most recent call last):\n  File "solution.py", line 1\nNameError: name \'total\' is not defined',
      failedTestNames: [],
      concept: "functions",
    });
    expect(analysis.concept).toBe("names and scope");
    expect(analysis.error).toContain("NameError");
    expect(analysis.correction).toMatch(/spelling/);
  });

  it("classifies indentation problems", () => {
    const analysis = analyzeFailure({ error: "IndentationError: expected an indented block", failedTestNames: [], concept: "loops" });
    expect(analysis.concept).toBe("indentation");
  });

  it("falls back to the quest concept for wrong answers", () => {
    const analysis = analyzeFailure({ error: null, failedTestNames: ["total(5)", "total(0)"], concept: "functions", hint: "Use range" });
    expect(analysis.concept).toBe("functions");
    expect(analysis.error).toBe("Failing tests: total(5), total(0)");
    expect(analysis.correction).toBe("Use range");
  });

  it("handles a run with no error and no named tests", () => {
    const analysis = analyzeFailure({ error: null, failedTestNames: [], concept: "lists" });
    expect(analysis.error).toBe("Tests did not pass");
  });
});
