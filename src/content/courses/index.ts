import type { CourseContent } from "../types";
import { python } from "./python";
import { numpy } from "./numpy";
import { pandas } from "./pandas";
import { mathStats } from "./mathStats";
import { dsaSql } from "./dsaSql";
import { machineLearning } from "./machineLearning";
import { deepLearning } from "./deepLearning";
import { genaiLlm } from "./genaiLlm";
import { aiAgents } from "./aiAgents";
import { projectsCourse } from "./projects";

/** The 10-stage learning path, in order. */
export const COURSES: CourseContent[] = [
  python,
  numpy,
  pandas,
  mathStats,
  dsaSql,
  machineLearning,
  deepLearning,
  genaiLlm,
  aiAgents,
  projectsCourse,
];

export const TOTAL_QUEST_COUNT = COURSES.reduce(
  (sum, c) => sum + c.modules.reduce((s, m) => s + m.lessons.reduce((s2, l) => s2 + l.quests.length, 0), 0),
  0
);
