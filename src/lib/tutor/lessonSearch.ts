import { COURSES } from "@/content/courses";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "this", "that", "these", "those", "of", "to", "in", "on",
  "for", "and", "or", "with", "as", "it", "its", "be", "by", "from", "at", "which", "who", "will", "can",
  "not", "but", "you", "your", "we", "our", "they", "their", "has", "have", "had", "into", "than", "then",
  "what", "how", "why", "do", "does", "did", "i", "me", "my", "so", "if", "about",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface LessonHit {
  courseTitle: string;
  lessonTitle: string;
  contentMd: string;
  score: number;
}

/** Finds the best-matching lesson for a free-text query, ignoring stopwords and weighting title matches 3x. */
export function findRelevantLesson(query: string): LessonHit | null {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return null;

  let best: LessonHit | null = null;

  for (const course of COURSES) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const titleTokens = tokenize(lesson.title);
        const bodyTokens = tokenize(lesson.contentMd);

        let score = 0;
        for (const t of queryTokens) {
          if (titleTokens.includes(t)) score += 3;
          if (bodyTokens.includes(t)) score += 1;
        }

        if (score > 0 && (!best || score > best.score)) {
          best = { courseTitle: course.title, lessonTitle: lesson.title, contentMd: lesson.contentMd, score };
        }
      }
    }
  }

  return best;
}
