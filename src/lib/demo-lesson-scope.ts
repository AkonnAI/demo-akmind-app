/** Demo program ships exactly three lessons (see `/demo` dashboard). */
export const DEMO_LESSON_IDS = [1, 2, 3] as const;
export const DEMO_LESSON_COUNT = DEMO_LESSON_IDS.length;

const DEMO_LESSON_SET = new Set<number>(DEMO_LESSON_IDS);

export function isDemoLessonId(id: number): boolean {
  return DEMO_LESSON_SET.has(id);
}

/** Count how many of the three demo lessons are in `lessonsComplete` (ignores stray IDs). */
export function countDemoLessonsInScope(lessonsComplete: number[]): number {
  return DEMO_LESSON_IDS.filter((id) => lessonsComplete.includes(id)).length;
}

export function allDemoLessonsComplete(lessonsComplete: number[]): boolean {
  return DEMO_LESSON_IDS.every((id) => lessonsComplete.includes(id));
}

/** Keep order, dedupe, drop IDs outside the demo (e.g. legacy `4`). */
export function sanitizeDemoLessonsComplete(lessonsComplete: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of lessonsComplete) {
    if (!DEMO_LESSON_SET.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
