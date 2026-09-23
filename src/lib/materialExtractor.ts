export interface GeneratedQuestion {
  question: string;
  answer: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "this", "that", "these", "those", "of", "to", "in", "on",
  "for", "and", "or", "with", "as", "it", "its", "be", "by", "from", "at", "which", "who", "will", "can",
  "not", "but", "you", "your", "we", "our", "they", "their", "has", "have", "had", "into", "than", "then",
]);

/**
 * Turns pasted lecture/assignment text into fill-in-the-blank practice
 * questions by blanking out a key term already present in the sentence —
 * every answer is a verbatim substring of the source material, never an
 * invented fact, matching the "never invent unsupported material" rule.
 */
export function extractPracticeQuestions(rawText: string, max = 5): GeneratedQuestion[] {
  const sentences = rawText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const words = s.split(" ").length;
      return words >= 6 && words <= 32;
    });

  const questions: GeneratedQuestion[] = [];

  for (const sentence of sentences) {
    if (questions.length >= max) break;
    const words = sentence.replace(/[.!?]$/, "").split(" ");

    let bestWord = "";
    let bestIndex = -1;
    words.forEach((w, i) => {
      const clean = w.replace(/[^a-zA-Z0-9-]/g, "");
      if (clean.length < 4) return;
      if (STOPWORDS.has(clean.toLowerCase())) return;
      if (clean.length > bestWord.length) {
        bestWord = clean;
        bestIndex = i;
      }
    });

    if (!bestWord || bestIndex === -1) continue;

    const blanked = words
      .map((w, i) => (i === bestIndex ? w.replace(bestWord, "_____") : w))
      .join(" ");

    questions.push({ question: blanked, answer: bestWord });
  }

  return questions;
}
