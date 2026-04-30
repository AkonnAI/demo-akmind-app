"use client";

import {
  bootstrapNeuropolisDemo,
  type NeuropolisDemoLevel,
} from "@/neuropolis/bootstrapDemoLevel";
import { useEffect, useRef } from "react";

type Props = {
  level: NeuropolisDemoLevel;
  onComplete: () => void;
  onExit: () => void | Promise<void>;
};

export default function NeuropolisShell({ level, onComplete, onExit }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  onCompleteRef.current = onComplete;
  onExitRef.current = onExit;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const teardown = bootstrapNeuropolisDemo(el, level, () => {
      onCompleteRef.current();
    });
    teardownRef.current = teardown;

    return () => {
      teardownRef.current = null;
      teardown();
    };
  }, [level]);

  const handleExit = () => {
    teardownRef.current?.();
    teardownRef.current = null;
    void onExitRef.current();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a1a",
        zIndex: 1,
      }}
    >
      <button
        type="button"
        onClick={handleExit}
        aria-label="Exit game"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
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
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
