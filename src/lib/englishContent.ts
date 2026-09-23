export interface Passage {
  id: string;
  title: string;
  text: string;
  question: string;
  keywords: string[];
  modelAnswer: string;
}

export const READING_PASSAGES: Passage[] = [
  {
    id: "r1",
    title: "What is Machine Learning?",
    text: "Machine learning is a way of teaching computers to find patterns in data, instead of giving them exact step-by-step instructions. The computer looks at many examples and learns rules on its own. Over time, with more data, the model usually becomes more accurate.",
    question: "In your own words, explain how machine learning is different from normal programming.",
    keywords: ["pattern", "data", "instructions", "learns"],
    modelAnswer:
      "In normal programming, a person writes exact instructions for the computer to follow. In machine learning, the computer looks at many examples of data and learns the pattern by itself, instead of being told exact rules.",
  },
  {
    id: "r2",
    title: "Why CGPA Matters (and Doesn't)",
    text: "CGPA measures how consistently you perform across your courses, but it does not measure how well you can build real things. Many strong engineers keep both in mind: they protect their CGPA enough to keep opportunities open, while also building projects that prove what they can actually do.",
    question: "What is the main balance the passage says students should keep?",
    keywords: ["cgpa", "projects", "balance"],
    modelAnswer:
      "The passage says students should keep a balance between maintaining a reasonable CGPA to stay eligible for opportunities, and building real projects that prove their practical skills.",
  },
];

export const LISTENING_PASSAGES: Passage[] = [
  {
    id: "l1",
    title: "Listening: What is an AI Agent?",
    text: "An AI agent is a program that can decide what to do next by itself. It can look at a goal, choose a tool, use that tool, and check if the result was good enough before deciding on the next step.",
    question: "After listening, explain what an AI agent can do that a normal chatbot cannot.",
    keywords: ["decide", "tool", "goal", "step"],
    modelAnswer:
      "Unlike a normal chatbot that only replies with text, an AI agent can decide what to do next, choose and use tools, and check its own results before taking another step toward a goal.",
  },
  {
    id: "l2",
    title: "Listening: Streaks and Habits",
    text: "A streak works because it turns a big goal into a small daily decision. You are not trying to finish the whole course today. You are only trying to not break the chain, one more day.",
    question: "Explain in your own words why a streak helps people stay consistent.",
    keywords: ["daily", "small", "chain", "consistent"],
    modelAnswer:
      "A streak helps because it breaks a big goal down into a small daily decision — you only need to keep the chain going one more day, instead of thinking about the whole goal at once.",
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

export interface SpeakingPrompt {
  id: string;
  prompt: string;
  keywords: string[];
  modelAnswer: string;
}

export const SPEAKING_PROMPTS: SpeakingPrompt[] = [
  {
    id: "s1",
    prompt: "Explain what a for loop does, as if teaching a classmate who has never coded.",
    keywords: ["repeat", "loop", "each"],
    modelAnswer: "A for loop repeats a block of code once for each item in a list, or a fixed number of times, so you don't have to write the same code again and again.",
  },
  {
    id: "s2",
    prompt: "Explain what your streak and XP system does in AI Quest, in simple English.",
    keywords: ["streak", "xp", "level"],
    modelAnswer: "The streak counts how many days in a row I've been active, and XP is points I earn from completing quests. Enough XP levels me up, which keeps learning feeling like a game.",
  },
  {
    id: "s3",
    prompt: "Explain the difference between a bug and an error message, in your own words.",
    keywords: ["bug", "error", "message"],
    modelAnswer: "A bug is a mistake in the code that causes wrong behavior. An error message is what the program shows to describe what went wrong — it points you toward the bug but isn't the bug itself.",
  },
];
