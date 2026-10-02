/** Mastery once a quest is solved = max(40, 100 - 15*(attempts-1) - 10*hints). */
export function computeMastery(attempts: number, hints: number): number {
  return Math.max(40, 100 - 15 * (attempts - 1) - 10 * hints);
}
