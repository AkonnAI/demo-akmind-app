"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  getVideoUrl,
  getPosterUrl,
  getCaptionsUrl,
  LESSON_VIDEOS,
} from "@/lib/lesson-videos";

interface VideoPlayerProps {
  lessonId: number;
  onEnded?: () => void;
  onProgress?: (pct: number) => void;
}

export default function VideoPlayer({
  lessonId,
  onEnded,
  onProgress,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const meta = LESSON_VIDEOS[lessonId];
  const videoUrl = (() => {
    try {
      return getVideoUrl(lessonId);
    } catch {
      return null;
    }
  })();
  const posterUrl = getPosterUrl(lessonId);
  const captionsUrl = meta?.hasCaptions ? getCaptionsUrl(lessonId) : undefined;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleLoaded = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError(
        "Video failed to load. Please check your connection and try again."
      );
    };
    const handleEnded = () => onEnded?.();
    const handleTimeUpdate = () => {
      if (!onProgress || !v.duration) return;
      onProgress((v.currentTime / v.duration) * 100);
    };

    v.addEventListener("loadedmetadata", handleLoaded);
    v.addEventListener("error", handleError);
    v.addEventListener("ended", handleEnded);
    v.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      v.removeEventListener("loadedmetadata", handleLoaded);
      v.removeEventListener("error", handleError);
      v.removeEventListener("ended", handleEnded);
      v.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [onEnded, onProgress, retryKey]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryKey((k) => k + 1);
  };

  if (!videoUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-red-500/40 bg-slate-950">
        <div className="px-4 text-center text-red-300">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">Video CDN not configured.</p>
          <p className="mt-1 text-xs text-red-400/70">
            NEXT_PUBLIC_CDN_URL missing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center text-cyan-300">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading video…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <div className="px-4 text-center text-red-300">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p className="mb-3 text-sm">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs text-cyan-300 transition hover:bg-cyan-500/30"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <video
        key={retryKey}
        ref={videoRef}
        className="h-full w-full"
        controls
        preload="metadata"
        playsInline
        poster={posterUrl}
        crossOrigin="anonymous"
      >
        <source src={videoUrl} type="video/mp4" />
        {captionsUrl && (
          <track
            kind="captions"
            src={captionsUrl}
            srcLang="en"
            label="English"
            default
          />
        )}
        Your browser does not support HTML5 video.
      </video>
    </div>
  );
}
