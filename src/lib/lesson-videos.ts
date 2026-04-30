export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

export interface LessonVideoMeta {
  title: string;
  hasCaptions: boolean;
}

export const LESSON_VIDEOS: Record<number, LessonVideoMeta> = {
  1: { title: "Welcome to AI", hasCaptions: false },
  2: { title: "History of AI", hasCaptions: false },
  3: { title: "AI vs Humans", hasCaptions: false },
  4: { title: "Types of AI", hasCaptions: false },
};

export function getVideoUrl(lessonId: number) {
  if (!CDN_URL) {
    throw new Error("NEXT_PUBLIC_CDN_URL is not configured");
  }
  return `${CDN_URL}/videos/lesson-${lessonId}/1080p.mp4`;
}

export function getPosterUrl(lessonId: number) {
  if (!CDN_URL) return undefined;
  return `${CDN_URL}/videos/lesson-${lessonId}/poster.jpg`;
}

export function getCaptionsUrl(lessonId: number) {
  if (!CDN_URL) return undefined;
  return `${CDN_URL}/videos/lesson-${lessonId}/captions.vtt`;
}
