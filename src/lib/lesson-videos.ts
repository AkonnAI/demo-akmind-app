export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

export interface LessonVideoMeta {
  title: string;
  hasCaptions: boolean;
}

export const LESSON_VIDEOS: Record<number, LessonVideoMeta> = {
  1: { title: "History of AI", hasCaptions: false },
  2: { title: "AI vs Humans", hasCaptions: false },
  3: { title: "Types of AI", hasCaptions: false },
};

/**
 * Demo lesson ids are 1–3; the S3 bucket uses folders `lesson-2` … `lesson-4`
 * for those assets (demo 1 → lesson-2, demo 2 → lesson-3, demo 3 → lesson-4).
 */
export function cdnLessonFolderNumber(demoLessonId: number): number {
  if (demoLessonId >= 1 && demoLessonId <= 3) {
    return demoLessonId + 1;
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
