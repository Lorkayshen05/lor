import type { QuizVariant } from "@/db/schema";

export interface ClientQuizOption {
  text: string;
}

export interface ClientQuizVariant {
  prompt: string;
  options: ClientQuizOption[];
}

/** Strips `correct` and `feedback` before a variant is ever sent to the browser. */
export function toClientVariant(variant: QuizVariant): ClientQuizVariant {
  return { prompt: variant.prompt, options: variant.options.map((o) => ({ text: o.text })) };
}
