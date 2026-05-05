/** Live stats for NOVA in the public demo (no DynamoDB). */

import {
  countDemoLessonsInScope,
  DEMO_LESSON_COUNT,
} from "@/lib/demo-lesson-scope";

export type DemoLiveStats = {
  xp: number;
  streak: number;
  badges: number;
  modulesCompleted: number;
  lessonsCompleted: number;
  currentModule: number;
  currentLesson: string;
  level: number;
  recentQuizScore: number;
  enrolledProgram: string;
  lastActivity: string;
  badgeList: string[];
};

function demoStreakFromLessons(lessonsComplete: number[]): number {
  let s = 0;
  for (let i = 1; i <= 3; i++) {
    if (lessonsComplete.includes(i)) s++;
    else break;
  }
  return s;
}

function averageQuizScore(
  quizScores?: Record<string, number> | null
): number {
  if (!quizScores || typeof quizScores !== "object") return 0;
  const vals = Object.values(quizScores).filter(
    (n): n is number => typeof n === "number" && n > 0
  );
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function lessonsDoneCount(
  lessonsComplete: number | number[] | undefined
): number {
  if (Array.isArray(lessonsComplete))
    return countDemoLessonsInScope(lessonsComplete);
  if (typeof lessonsComplete === "number")
    return lessonsComplete <= DEMO_LESSON_COUNT ? lessonsComplete : DEMO_LESSON_COUNT;
  return 0;
}

function lessonsArray(lessonsComplete: number | number[] | undefined): number[] {
  if (Array.isArray(lessonsComplete)) return lessonsComplete;
  return [];
}

export function buildDemoLiveStats(input: {
  xp?: number;
  lessonsComplete?: number | number[];
  currentModule?: number;
  currentLesson?: string;
  quizScores?: Record<string, number> | null;
  badgeEarned?: boolean;
}): DemoLiveStats {
  const arr = lessonsArray(input.lessonsComplete);
  const n = lessonsDoneCount(input.lessonsComplete);
  const xp = input.xp ?? 0;

  return {
    xp,
    streak: demoStreakFromLessons(arr),
    badges: input.badgeEarned ? 1 : 0,
    modulesCompleted: n >= 3 ? 1 : 0,
    lessonsCompleted: n,
    currentModule: input.currentModule ?? 1,
    currentLesson: input.currentLesson || "exploring the demo",
    level: Math.floor(xp / 1000),
    recentQuizScore: averageQuizScore(input.quizScores),
    enrolledProgram: "Akmind Free Demo",
    lastActivity: new Date().toISOString(),
    badgeList: input.badgeEarned ? ["Demo explorer"] : [],
  };
}
