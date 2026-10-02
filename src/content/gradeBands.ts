/** APU-style grade bands: minimum score (0-100) -> {letter, gpa}. Edit freely. */
export const GRADE_BANDS: { min: number; letter: string; gpa: number }[] = [
  { min: 80, letter: "A+", gpa: 4.0 },
  { min: 75, letter: "A", gpa: 3.7 },
  { min: 70, letter: "B+", gpa: 3.3 },
  { min: 65, letter: "B", gpa: 3.0 },
  { min: 60, letter: "C+", gpa: 2.7 },
  { min: 55, letter: "C", gpa: 2.3 },
  { min: 50, letter: "C-", gpa: 2.0 },
  { min: 40, letter: "D", gpa: 1.7 },
  { min: 0, letter: "F", gpa: 0 },
];

export function scoreToGrade(score: number): { letter: string; gpa: number } {
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return { letter: band.letter, gpa: band.gpa };
  }
  return { letter: "F", gpa: 0 };
}
