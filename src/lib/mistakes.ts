export type FailureInput = {
  error: string | null;
  failedTestNames: string[];
  concept: string;
  hint?: string;
};

export type FailureAnalysis = {
  error: string;
  concept: string;
  correction: string;
};

const CORRECTIONS: { match: RegExp; concept: string; correction: string }[] = [
  { match: /IndentationError|TabError/, concept: "indentation", correction: "Python uses indentation to define blocks. Indent every line inside a function, loop or if with the same 4 spaces." },
  { match: /SyntaxError/, concept: "syntax", correction: "Check the line reported above for a missing `:`, bracket or quote — Python points at the first token it could not parse." },
  { match: /NameError: name '(.+?)' is not defined/, concept: "names and scope", correction: "The name is used before it exists. Define it (or fix the spelling) before the line that uses it." },
  { match: /TypeError: unsupported operand/, concept: "types", correction: "You are combining incompatible types. Convert first, e.g. `int(value)` or `str(value)`." },
  { match: /TypeError: .*argument/, concept: "function signatures", correction: "The call does not match the definition — check the number and order of parameters." },
  { match: /IndexError/, concept: "indexing", correction: "The index is outside the sequence. Remember the last valid index is `len(values) - 1`." },
  { match: /KeyError/, concept: "dictionaries", correction: "That key is missing. Use `data.get(key, default)` when a key may not exist." },
  { match: /ZeroDivisionError/, concept: "edge cases", correction: "Guard the divisor: return early when the denominator is 0." },
  { match: /ValueError/, concept: "input handling", correction: "The value has the wrong shape or content for that operation — validate it before converting." },
  { match: /AttributeError/, concept: "objects and methods", correction: "That method does not exist on this type. Check the object you are actually holding with `type(value)`." },
  { match: /RecursionError/, concept: "recursion", correction: "Your recursion never reaches a base case. Add the terminating condition before recursing." },
  { match: /ModuleNotFoundError|ImportError/, concept: "imports", correction: "Import the module at the top of the file, e.g. `import numpy as np`." },
];

/** Turns a failed run into a stored, teachable mistake record. */
export function analyzeFailure(input: FailureInput): FailureAnalysis {
  const raw = (input.error ?? "").trim();
  const lastLine = raw ? raw.split("\n").filter(Boolean).slice(-1)[0].trim() : "";

  if (lastLine) {
    for (const rule of CORRECTIONS) {
      if (rule.match.test(lastLine)) {
        return { error: lastLine, concept: rule.concept, correction: rule.correction };
      }
    }
    return {
      error: lastLine,
      concept: input.concept,
      correction: input.hint ?? "Read the traceback bottom-up: the last line names the error, the line above shows where it happened.",
    };
  }

  const failed = input.failedTestNames.slice(0, 3).join(", ");
  return {
    error: failed ? `Failing tests: ${failed}` : "Tests did not pass",
    concept: input.concept,
    correction:
      input.hint ??
      "Your code runs but returns the wrong value. Compare the expected and actual output for the first failing test and trace one example by hand.",
  };
}
