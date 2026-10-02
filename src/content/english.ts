export interface EnglishExercise {
  id: string;
  kind: "listening" | "reading" | "speaking";
  title: string;
  text: string; // the passage/prompt (spoken for listening, shown for reading, spoken for speaking)
  question: string;
  keyPoints: { label: string; keywords: string[] }[];
  modelAnswer: string; // kept server-side, only ever sent to the client after a retry
  mandarinGloss?: string;
}

export const ENGLISH_EXERCISES: EnglishExercise[] = [
  {
    id: "listen-ai-agent",
    kind: "listening",
    title: "What is an AI Agent?",
    text: "An AI agent is a program that can decide what to do next by itself. It looks at a goal, chooses a tool, uses that tool, and checks if the result was good enough before deciding on the next step.",
    question: "After listening, explain what an AI agent can do that a normal chatbot cannot.",
    keyPoints: [
      { label: "decides the next step itself", keywords: ["decide", "itself", "next step"] },
      { label: "uses tools", keywords: ["tool", "use"] },
      { label: "checks its own result", keywords: ["check", "result", "good enough"] },
    ],
    modelAnswer:
      "Unlike a normal chatbot that only replies with text, an AI agent can decide what to do next, choose and use tools, and check its own results before taking another step toward a goal.",
    mandarinGloss: "AI代理是一个可以自己决定下一步做什么的程序，它会选择并使用工具，然后检查结果是否足够好。",
  },
  {
    id: "listen-streaks",
    kind: "listening",
    title: "Streaks and Habits",
    text: "A streak works because it turns a big goal into a small daily decision. You are not trying to finish the whole course today. You are only trying to not break the chain, one more day.",
    question: "Explain in your own words why a streak helps people stay consistent.",
    keyPoints: [
      { label: "breaks a big goal into a small decision", keywords: ["small", "daily", "decision"] },
      { label: "focuses on not breaking the chain", keywords: ["chain", "break", "one more day"] },
    ],
    modelAnswer:
      "A streak helps because it breaks a big goal down into a small daily decision — you only need to keep the chain going one more day, instead of thinking about the whole goal at once.",
    mandarinGloss: "连续打卡有效是因为它把一个大目标变成了每天的小决定——你只需要不中断连续记录，而不是一次想着完成整个目标。",
  },
  {
    id: "read-machine-learning",
    kind: "reading",
    title: "What is Machine Learning?",
    text: "Machine learning is a way of teaching computers to find patterns in data, instead of giving them exact step-by-step instructions. The computer looks at many examples and learns rules on its own. Over time, with more data, the model usually becomes more accurate.",
    question: "In your own words, explain how machine learning is different from normal programming.",
    keyPoints: [
      { label: "learns patterns from data", keywords: ["pattern", "data"] },
      { label: "not given exact instructions", keywords: ["instruction", "exact", "step-by-step"] },
      { label: "learns on its own", keywords: ["learn", "own", "itself"] },
    ],
    modelAnswer:
      "In normal programming, a person writes exact instructions for the computer to follow. In machine learning, the computer looks at many examples of data and learns the pattern by itself, instead of being told exact rules.",
  },
  {
    id: "read-cgpa",
    kind: "reading",
    title: "Why CGPA Matters (and Doesn't)",
    text: "CGPA measures how consistently you perform across your courses, but it does not measure how well you can build real things. Many strong engineers keep both in mind: they protect their CGPA enough to keep opportunities open, while also building projects that prove what they can actually do.",
    question: "What is the main balance the passage says students should keep?",
    keyPoints: [
      { label: "protecting CGPA", keywords: ["cgpa", "protect"] },
      { label: "building real projects", keywords: ["project", "build", "real"] },
    ],
    modelAnswer:
      "The passage says students should keep a balance between maintaining a reasonable CGPA to stay eligible for opportunities, and building real projects that prove their practical skills.",
  },
  {
    id: "speak-for-loop",
    kind: "speaking",
    title: "Explain a For Loop",
    text: "Explain what a for loop does, as if teaching a classmate who has never coded.",
    question: "Explain what a for loop does, as if teaching a classmate who has never coded.",
    keyPoints: [
      { label: "repeats code", keywords: ["repeat", "again"] },
      { label: "once per item / times", keywords: ["each", "item", "times"] },
    ],
    modelAnswer:
      "A for loop repeats a block of code once for each item in a list, or a fixed number of times, so you don't have to write the same code again and again.",
  },
  {
    id: "speak-bug-vs-error",
    kind: "speaking",
    title: "Bug vs. Error Message",
    text: "Explain the difference between a bug and an error message, in your own words.",
    question: "Explain the difference between a bug and an error message, in your own words.",
    keyPoints: [
      { label: "bug is the mistake in the code", keywords: ["bug", "mistake"] },
      { label: "error message describes what went wrong", keywords: ["error", "message", "describe"] },
    ],
    modelAnswer:
      "A bug is a mistake in the code that causes wrong behavior. An error message is what the program shows to describe what went wrong — it points you toward the bug but isn't the bug itself.",
  },
];

export interface VocabWord {
  word: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
}

export const VOCABULARY: VocabWord[] = [
  { word: "iterate", partOfSpeech: "verb", meaning: "to repeat a process, often improving it each time", example: "We iterate on the model until the accuracy is good enough." },
  { word: "threshold", partOfSpeech: "noun", meaning: "the point at which something starts to happen", example: "The alert fires once error rate crosses the threshold." },
  { word: "robust", partOfSpeech: "adjective", meaning: "strong and unlikely to fail under pressure", example: "We need a robust solution that handles bad input safely." },
  { word: "bottleneck", partOfSpeech: "noun", meaning: "the part of a process that slows everything else down", example: "Database queries were the bottleneck in our app." },
  { word: "trade-off", partOfSpeech: "noun", meaning: "a balance between two good things you can't fully have both of", example: "There's a trade-off between model accuracy and speed." },
  { word: "infer", partOfSpeech: "verb", meaning: "to work out an answer from evidence, not being told directly", example: "You can infer the function's purpose from its name." },
];

/** Grammar rules the checker flags: [pattern, fix label, why]. */
export const GRAMMAR_RULES: { pattern: RegExp; wrong: string; fix: string; why: string }[] = [
  { pattern: /\bit do\b/i, wrong: "it do", fix: "it does", why: "'it' is third-person singular, so the verb needs -s: 'does'." },
  { pattern: /\bhe don't\b|\bshe don't\b/i, wrong: "he/she don't", fix: "he/she doesn't", why: "Third-person singular subjects need 'doesn't', not 'don't'." },
  { pattern: /\bmore better\b/i, wrong: "more better", fix: "better", why: "'better' is already comparative — don't add 'more' in front of it." },
  { pattern: /\binformations\b/i, wrong: "informations", fix: "information", why: "'Information' is uncountable in English and has no plural form." },
  { pattern: /\bdiscuss about\b/i, wrong: "discuss about", fix: "discuss", why: "'Discuss' already means 'talk about' — don't add 'about' after it." },
  { pattern: /\bcan able to\b/i, wrong: "can able to", fix: "am/is/are able to (or just 'can')", why: "'Can' and 'able to' both express ability — don't combine them." },
  { pattern: /\bdidn't went\b/i, wrong: "didn't went", fix: "didn't go", why: "After 'didn't', use the base form of the verb: 'go', not 'went'." },
  { pattern: /\bi is\b/i, wrong: "I is", fix: "I am", why: "'I' pairs with 'am', not 'is'." },
];
