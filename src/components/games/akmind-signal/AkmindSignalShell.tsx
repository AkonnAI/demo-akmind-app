"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AkmindSignalDemoLevel = 1 | 2 | 3;

type Props = {
  level: AkmindSignalDemoLevel;
  onComplete: () => void;
  onExit: () => void | Promise<void>;
};

/**
 * AI Explorers iframe shell: loads static `public/akmind-signal/signal.html`
 * with `?level=1|2|3` + `embedded=1`. When the lesson clears, the game posts
 * {@link AKMIND_SIGNAL_DONE} to this origin and we advance to the quiz phase.
 */
export const AKMIND_SIGNAL_DONE = "AKMIND_SIGNAL_LESSON_COMPLETE";

export default function AkmindSignalShell({
  level,
  onComplete,
  onExit,
}: Props) {
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  const [exitPortalHost, setExitPortalHost] = useState<HTMLElement | null>(
    null,
  );

  onCompleteRef.current = onComplete;
  onExitRef.current = onExit;

  const src = useMemo(
    () => `/akmind-signal/signal.html?level=${level}&embedded=1`,
    [level],
  );

  useEffect(() => {
    setExitPortalHost(document.body);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const handler = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.data?.type !== AKMIND_SIGNAL_DONE) return;
      onCompleteRef.current();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleExit = () => {
    void onExitRef.current();
  };

  const exitButton = (
    <button
      type="button"
      data-akmind-signal-exit="true"
      onClick={handleExit}
      aria-label="Exit game"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 1100,
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.55)",
        borderRadius: 8,
        color: "#f87171",
        fontSize: 13,
        padding: "8px 14px",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      Exit
    </button>
  );

  return (
    <>
      {exitPortalHost ? createPortal(exitButton, exitPortalHost) : null}
      <iframe
        title="AKMIND SIGNAL"
        src={src}
        allow="fullscreen"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: "#05050f",
        }}
      />
    </>
  );
}
