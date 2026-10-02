import { scoreToGrade } from "@/content/gradeBands";

export interface TaskLike {
  weightPct: number;
  score: number | null;
}

/** Weighted-average predicted score from graded tasks only; null if nothing graded yet. */
export function predictedScore(tasks: TaskLike[]): number | null {
  const graded = tasks.filter((t) => t.score !== null);
  const totalWeight = graded.reduce((sum, t) => sum + t.weightPct, 0);
  if (totalWeight === 0) return null;
  const weighted = graded.reduce((sum, t) => sum + t.weightPct * (t.score ?? 0), 0);
  return weighted / totalWeight;
}

export interface SubjectLike {
  credits: number;
  tasks: TaskLike[];
}

/** Credit-weighted CGPA across subjects that have at least one graded task. */
export function predictedCgpa(subjectsList: SubjectLike[]): number | null {
  const withScores = subjectsList
    .map((s) => ({ credits: s.credits, score: predictedScore(s.tasks) }))
    .filter((s): s is { credits: number; score: number } => s.score !== null);

  const totalCredits = withScores.reduce((sum, s) => sum + s.credits, 0);
  if (totalCredits === 0) return null;

  const weighted = withScores.reduce((sum, s) => sum + s.credits * scoreToGrade(s.score).gpa, 0);
  return weighted / totalCredits;
}
