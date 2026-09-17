export type TestKindName = "STDOUT" | "EXPRESSION";

export type TestSpec = {
  id: string;
  name: string;
  kind: TestKindName;
  expression: string | null;
  expected: string;
  hidden: boolean;
};

export type TestResult = {
  id: string;
  name: string;
  passed: boolean;
  hidden: boolean;
  expected: string;
  actual: string;
  message: string;
};

export type RunResult = {
  stdout: string;
  stderr: string;
  error: string | null;
  results: TestResult[];
  passed: boolean;
  passedCount: number;
  totalCount: number;
  durationMs: number;
};

export const RESULT_MARKER = "__PLAYGAME_RESULT__";

export function emptyRunResult(message: string): RunResult {
  return {
    stdout: "",
    stderr: message,
    error: message,
    results: [],
    passed: false,
    passedCount: 0,
    totalCount: 0,
    durationMs: 0,
  };
}
