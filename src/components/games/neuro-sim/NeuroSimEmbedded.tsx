"use client";

import { useCallback, useEffect, useRef } from "react";
import TerminalScreen from "./screens/TerminalScreen";
import { useGameStore } from "./store/useGameStore";
import "./neuro-sim-embed.css";

type Props = {
  readonly innerLessonId: 1 | 2 | 3;
  readonly onComplete: () => void | Promise<void>;
  readonly onExit: () => void | Promise<void>;
};

export default function NeuroSimEmbedded({
  innerLessonId,
  onComplete,
  onExit,
}: Props) {
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleEmbedComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    void Promise.resolve(onCompleteRef.current()).catch(() => {});
  }, []);

  useEffect(() => {
    completedRef.current = false;
    const { setActiveLesson, setScreen } = useGameStore.getState();
    setActiveLesson(innerLessonId);
    setScreen("terminal");
    return () => {
      setScreen("boot");
      setActiveLesson(null);
    };
  }, [innerLessonId]);

  const handleExit = () => {
    void Promise.resolve(onExit()).catch(() => {});
  };

  return (
    <>
      <div
        className="neuro-sim-embed-root"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <TerminalScreen embedOnComplete={handleEmbedComplete} />
      </div>
      <button
        type="button"
        aria-label="Exit game"
        onClick={handleExit}
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
    </>
  );
}
