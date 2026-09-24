import { z } from "zod";

export const pyErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  line: z.number().nullable(),
});

export const pyTestResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  message: z.string(),
});

export const pyRunResultSchema = z.object({
  stdout: z.string(),
  error: pyErrorSchema.nullable(),
  tests: z.array(pyTestResultSchema),
  expectedOk: z.boolean(),
  timedOut: z.boolean().default(false),
});

export type PyError = z.infer<typeof pyErrorSchema>;
export type PyTestResult = z.infer<typeof pyTestResultSchema>;
export type PyRunResult = z.infer<typeof pyRunResultSchema>;

/** Maps a Python exception type to a short, plain-English explanation for students. */
export const ERROR_EXPLANATIONS: Record<string, string> = {
  NameError: "You used a name (variable or function) that hasn't been defined yet. Check the spelling and that you defined it before using it.",
  SyntaxError: "Python couldn't parse this line — often a missing colon, bracket, or quote.",
  IndentationError: "The spacing at the start of a line doesn't match what Python expects. Python uses indentation to know what's inside a block.",
  TypeError: "You used a value in a way its type doesn't support, e.g. adding a number to a string.",
  IndexError: "You tried to access a position in a list that doesn't exist — check the list's length.",
  KeyError: "You tried to access a dictionary key that isn't there. Use .get(key, default) to avoid crashing.",
  ZeroDivisionError: "You divided by zero — check for that case before dividing.",
  AttributeError: "You called a method or accessed a property that doesn't exist on that object.",
  ValueError: "A value was the right type but not a valid value for what you tried to do with it, e.g. int(\"abc\").",
  RecursionError: "The function called itself too many times without stopping — check your base case.",
};
