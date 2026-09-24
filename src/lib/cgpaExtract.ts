const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "this", "that", "these", "those", "of", "to", "in", "on",
  "for", "and", "or", "with", "as", "it", "its", "be", "by", "from", "at", "which", "who", "will", "can",
  "not", "but", "you", "your", "we", "our", "they", "their", "has", "have", "had", "into", "than", "then",
]);

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const words = s.split(" ").filter(Boolean).length;
      // skip title/meta lines: too short, or ALL CAPS headers, or slide-number-only lines
      if (words < 5) return false;
      if (s === s.toUpperCase() && words < 8) return false;
      if (/^(slide|page|chapter|week)\s*\d+/i.test(s)) return false;
      return true;
    });
}

export interface ExtractedQuestion {
  question: string; // fill-in-the-blank, verbatim except the blank
  answer: string; // verbatim substring of the source
  quote: string; // the full original sentence, verbatim
}

function blankQuestion(sentence: string): ExtractedQuestion | null {
  const words = sentence.replace(/[.!?]$/, "").split(" ");
  let bestWord = "";
  let bestIndex = -1;
  words.forEach((w, i) => {
    const clean = w.replace(/[^a-zA-Z0-9-]/g, "");
    if (clean.length < 4 || STOPWORDS.has(clean.toLowerCase())) return;
    if (clean.length > bestWord.length) {
      bestWord = clean;
      bestIndex = i;
    }
  });
  if (!bestWord || bestIndex === -1) return null;
  const blanked = words.map((w, i) => (i === bestIndex ? w.replace(bestWord, "_____") : w)).join(" ");
  return { question: blanked, answer: bestWord, quote: sentence };
}

export interface CgpaExtraction {
  concepts: string[]; // verbatim sentences, or [] if none found
  marks: string[]; // verbatim sentences mentioning weights/marks/deadlines, or []
  practiceQuestions: ExtractedQuestion[]; // up to 4
  examQuestions: ExtractedQuestion[]; // up to 3
}

/**
 * Offline, deterministic extraction — every concept/mark/question is a
 * verbatim sentence or substring of `text`. Nothing is invented: if a
 * category has no match, the caller shows "Not in the material".
 */
export function extractStudyMaterial(text: string): CgpaExtraction {
  const sentences = splitSentences(text);

  const concepts = sentences.filter((s) => /[A-Z][a-z]+(\s+[A-Z][a-z]+){1,}/.test(s)).slice(0, 5);
  const marks = sentences.filter((s) => /\d+\s*(%|percent|marks?|points?)\b|\b(due|deadline|submit(ted)?\s+by)\b/i.test(s)).slice(0, 5);

  const questions: ExtractedQuestion[] = [];
  for (const s of sentences) {
    if (questions.length >= 7) break;
    const q = blankQuestion(s);
    if (q && !questions.some((existing) => existing.quote === q.quote)) questions.push(q);
  }

  // Defense in depth: drop anything whose quote/answer isn't actually verbatim in the source.
  const verified = questions.filter((q) => text.includes(q.quote) && text.includes(q.answer));

  return {
    concepts: concepts.filter((c) => text.includes(c)),
    marks: marks.filter((m) => text.includes(m)),
    practiceQuestions: verified.slice(0, 4),
    examQuestions: verified.slice(4, 7),
  };
}
