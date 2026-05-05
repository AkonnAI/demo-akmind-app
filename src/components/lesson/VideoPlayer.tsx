"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  getVideoUrl,
  getPosterUrl,
  getCaptionsUrl,
  LESSON_VIDEOS,
} from "@/lib/lesson-videos";

/** Fraction of the timeline that must have been played (not merely seeked past) for learners. */
const WATCH_PLAYED_THRESHOLD = 0.92;

function playedWatchFraction(video: HTMLVideoElement): number {
  const d = video.duration;
  if (!d || !Number.isFinite(d) || d <= 0) return 0;
  let played = 0;
  for (let i = 0; i < video.played.length; i++) {
    played += video.played.end(i) - video.played.start(i);
  }
  return Math.min(1, played / d);
}

/** Sum of `played` TimeRanges — actual playback seconds, not scrub-only. */
function playedSecondsTotal(video: HTMLVideoElement): number {
  let played = 0;
  for (let i = 0; i < video.played.length; i++) {
    played += video.played.end(i) - video.played.start(i);
  }
  return played;
}

/** Require `minSec` unless the file is shorter — then require full duration. */
function requiredPlayedSeconds(
  video: HTMLVideoElement,
  minSec: number,
): number {
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) return minSec;
  return Math.min(minSec, d);
}

interface VideoPlayerProps {
  lessonId: number;
  onEnded?: () => void;
  onProgress?: (pct: number) => void;
  /**
   * When true, the watch gate must pass before `onWatchSatisfied` fires.
   * With `minPlayedSeconds`, the gate opens when either total real playback reaches that
   * many seconds, or the playhead reaches or passes that timestamp (seeking may count).
   */
  enforceWatchThrough?: boolean;
  /** Gate time in seconds: satisfied when playback totals this long OR currentTime crosses it. */
  minPlayedSeconds?: number;
  onWatchSatisfied?: () => void;
  /** When true, pauses the video (e.g. after minimum watch time reveals upsell UI). */
  pauseVideo?: boolean;
  /**
   * When true (after the demo watch gate), playback stays paused: controls hidden and
   * programmatic resume attempts are blocked so the learner sees the overlay CTA instead.
   */
  playbackLocked?: boolean;
}

export default function VideoPlayer({
  lessonId,
  onEnded,
  onProgress,
  enforceWatchThrough = false,
  minPlayedSeconds,
  onWatchSatisfied,
  pauseVideo = false,
  playbackLocked = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const satisfiedSent = useRef(false);
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
    satisfiedSent.current = false;
  }, [lessonId, retryKey, enforceWatchThrough, minPlayedSeconds]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tryWatchSatisfied = () => {
      if (!enforceWatchThrough || satisfiedSent.current) return;
      const minS = minPlayedSeconds;
      if (minS != null && minS > 0) {
        const need = requiredPlayedSeconds(v, minS);
        const played = playedSecondsTotal(v);
        const eps = 0.25;
        const crossedTimeMark = v.currentTime >= need - eps;
        if (played < need && !crossedTimeMark) return;
      } else if (playedWatchFraction(v) < WATCH_PLAYED_THRESHOLD) {
        return;
      }
      satisfiedSent.current = true;
      v.pause();
      onWatchSatisfied?.();
    };

    const handleLoaded = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError(
        "Video failed to load. Please check your connection and try again."
      );
    };
    const handleEnded = () => {
      onEnded?.();
      tryWatchSatisfied();
    };
    const handleTimeUpdate = () => {
      if (onProgress && v.duration) {
        onProgress((v.currentTime / v.duration) * 100);
      }
      tryWatchSatisfied();
    };

    v.addEventListener("loadedmetadata", handleLoaded);
    v.addEventListener("error", handleError);
    v.addEventListener("ended", handleEnded);
    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("seeked", tryWatchSatisfied);
    v.addEventListener("pause", tryWatchSatisfied);
    v.addEventListener("playing", tryWatchSatisfied);

    return () => {
      v.removeEventListener("loadedmetadata", handleLoaded);
      v.removeEventListener("error", handleError);
      v.removeEventListener("ended", handleEnded);
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("seeked", tryWatchSatisfied);
      v.removeEventListener("pause", tryWatchSatisfied);
      v.removeEventListener("playing", tryWatchSatisfied);
    };
  }, [
    onEnded,
    onProgress,
    onWatchSatisfied,
    enforceWatchThrough,
    minPlayedSeconds,
    retryKey,
    lessonId,
  ]);

  useEffect(() => {
    if (pauseVideo) videoRef.current?.pause();
  }, [pauseVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playbackLocked) return;
    const blockPlay = () => {
      void v.pause();
    };
    blockPlay();
    v.addEventListener("play", blockPlay);
    return () => v.removeEventListener("play", blockPlay);
  }, [playbackLocked]);

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
        key={`${lessonId}-${retryKey}`}
        ref={videoRef}
        className="h-full w-full"
        controls={!playbackLocked}
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
