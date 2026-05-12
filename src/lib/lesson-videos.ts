export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

export interface LessonVideoMeta {
  title: string;
  hasCaptions: boolean;
}

export const LESSON_VIDEOS: Record<number, LessonVideoMeta> = {
  1: { title: "History of AI", hasCaptions: false },
  2: { title: "AI vs Humans", hasCaptions: false },
  3: { title: "Types of AI", hasCaptions: false },
  11: { title: "AI Builders — Lesson 1", hasCaptions: false },
  12: { title: "AI Builders — Lesson 2", hasCaptions: false },
  13: { title: "AI Builders — Lesson 3", hasCaptions: false },
};

/**
 * Demo Explorers ids 1–3 map to CDN folders `lesson-2` … `lesson-4`.
 * AI Builders demo ids 11–13 use folders `lesson-11` … `lesson-13`.
 */
export function cdnLessonFolderNumber(demoLessonId: number): number {
  if (demoLessonId >= 1 && demoLessonId <= 3) {
    return demoLessonId + 1;
  }
  if (demoLessonId >= 11 && demoLessonId <= 13) {
    return demoLessonId;
  }
  return demoLessonId;
}

export function getVideoUrl(lessonId: number) {
  if (!CDN_URL) {
    throw new Error("NEXT_PUBLIC_CDN_URL is not configured");
  }
  const folder = cdnLessonFolderNumber(lessonId);
  return `${CDN_URL}/videos/lesson-${folder}/1080p.mp4`;
}

export function getPosterUrl(lessonId: number) {
  if (!CDN_URL) return undefined;
  const folder = cdnLessonFolderNumber(lessonId);
  return `${CDN_URL}/videos/lesson-${folder}/poster.jpg`;
}

export function getCaptionsUrl(lessonId: number) {
  if (!CDN_URL) return undefined;
  const folder = cdnLessonFolderNumber(lessonId);
  return `${CDN_URL}/videos/lesson-${folder}/captions.vtt`;
}
