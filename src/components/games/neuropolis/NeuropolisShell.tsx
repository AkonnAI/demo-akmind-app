"use client";

import {
  bootstrapNeuropolisDemo,
  type NeuropolisDemoLevel,
} from "@/neuropolis/bootstrapDemoLevel";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [exitPortalHost, setExitPortalHost] = useState<HTMLElement | null>(
    null,
  );
  onCompleteRef.current = onComplete;
  onExitRef.current = onExit;

  useEffect(() => {
    setExitPortalHost(document.body);
  }, []);

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

  const exitButton = (
    <button
      type="button"
      data-neuropolis-exit="true"
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
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0a0a1a",
          zIndex: 1,
        }}
      >
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
    </>
  );
}
