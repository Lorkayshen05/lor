import { GRAMMAR_RULES } from "@/content/english";

export interface GrammarIssue {
  wrong: string;
  fix: string;
  why: string;
}

export interface AnswerCheck {
  meaningScore: number; // 0-100
  covered: string[];
  missing: string[];
  grammarIssues: GrammarIssue[];
}

export function checkAnswer(transcript: string, keyPoints: { label: string; keywords: string[] }[]): AnswerCheck {
  const lower = transcript.toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];

  for (const kp of keyPoints) {
    const hit = kp.keywords.some((k) => lower.includes(k.toLowerCase()));
    (hit ? covered : missing).push(kp.label);
  }

  const meaningScore = keyPoints.length === 0 ? 100 : Math.round((covered.length / keyPoints.length) * 100);

  const grammarIssues: GrammarIssue[] = [];
  for (const rule of GRAMMAR_RULES) {
    if (rule.pattern.test(transcript)) {
      grammarIssues.push({ wrong: rule.wrong, fix: rule.fix, why: rule.why });
    }
  }

  const trimmed = transcript.trim();
  if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
    grammarIssues.push({ wrong: "lowercase sentence start", fix: "Capitalize the first letter", why: "Sentences in English start with a capital letter." });
  }
  if (trimmed.length > 0 && !/[.!?]$/.test(trimmed)) {
    grammarIssues.push({ wrong: "missing end punctuation", fix: "Add a full stop, question mark, or exclamation mark", why: "Every sentence needs closing punctuation." });
  }

  return { meaningScore, covered, missing, grammarIssues };
}
