/** AI Explorers demo lesson ids (see `/demo` dashboard). */
export const DEMO_LESSON_IDS_EXPLORERS = [1, 2, 3] as const;
/** AI Builders demo lesson ids. */
export const DEMO_LESSON_IDS_BUILDERS = [11, 12, 13] as const;

export const DEMO_LESSON_COUNT = 3;

const DEMO_LESSON_SET = new Set<number>([
  ...DEMO_LESSON_IDS_EXPLORERS,
  ...DEMO_LESSON_IDS_BUILDERS,
]);

export function isDemoLessonId(id: number): boolean {
  return DEMO_LESSON_SET.has(id);
}

/** Count completed lessons in whichever track has progress (max of the two tracks). */
export function countDemoLessonsInScope(lessonsComplete: number[]): number {
  const explorers = DEMO_LESSON_IDS_EXPLORERS.filter((id) =>
    lessonsComplete.includes(id)
  ).length;
  const builders = DEMO_LESSON_IDS_BUILDERS.filter((id) =>
    lessonsComplete.includes(id)
  ).length;
  return Math.max(explorers, builders);
}

/** True when either the Explorers track (1–3) or the Builders track (11–13) is fully done. */
export function allDemoLessonsComplete(lessonsComplete: number[]): boolean {
  const explorersDone = DEMO_LESSON_IDS_EXPLORERS.every((id) =>
    lessonsComplete.includes(id)
  );
  const buildersDone = DEMO_LESSON_IDS_BUILDERS.every((id) =>
    lessonsComplete.includes(id)
  );
  return explorersDone || buildersDone;
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
