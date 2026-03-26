"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type CharacterName = "NOVA" | "AX" | "CHAOS_BOT" | "DATA_PHANTOM" | "OVERFIT_MONSTER" | "BLANK_SLATE" | "NARRATOR";

interface DialogueBoxProps {
  character: CharacterName;
  expression?: string;
  text: string;
  onComplete: () => void;
}

const CHAR_META: Record<CharacterName, { color: string; label: string; initial: string }> = {
  NOVA:      { color: "#f59e0b", label: "NOVA",      initial: "N" },
  AX:        { color: "#4f46e5", label: "AX",        initial: "A" },
  CHAOS_BOT:    { color: "#dc2626", label: "CHAOS BOT",    initial: "C" },
  DATA_PHANTOM:     { color: "#7c3aed", label: "DATA PHANTOM",     initial: "P" },
  OVERFIT_MONSTER:  { color: "#db2777", label: "OVERFIT",          initial: "O" },
  BLANK_SLATE:      { color: "#94a3b8", label: "BLANK SLATE",      initial: "◯" },
  NARRATOR:         { color: "#64748b", label: "NARRATOR",         initial: "◈" },
};

export default function DialogueBox({ character, text, onComplete }: DialogueBoxProps) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "done">("typing");

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const showFull = useCallback(() => {
    setDisplayed(text);
    setPhase("done");
  }, [text]);

  // Typewriter effect — restarts whenever text changes
  useEffect(() => {
    setDisplayed("");
    setPhase("typing");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setPhase("done");
      }
    }, 25);
    return () => clearInterval(id);
  }, [text]);

  // Space key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (phaseRef.current === "typing") {
        showFull();
      } else {
        onComplete();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFull, onComplete]);

  const meta = CHAR_META[character];

  return (
    <motion.div
      initial={{ y: 160 }}
      animate={{ y: 0 }}
      exit={{ y: 160 }}
      transition={{ type: "spring", damping: 22, stiffness: 200 }}
      onClick={() => {
        if (phase === "typing") showFull();
        else onComplete();
      }}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 160,
        backgroundColor: "rgba(10,10,26,0.96)",
        borderTop: "2px solid #4338ca",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 24px",
        cursor: "pointer",
        zIndex: 200,
      }}
    >
      {/* ── Portrait ── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: "50%",
          backgroundColor: meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          fontWeight: 700,
          color: "#ffffff",
          boxShadow: `0 0 16px ${meta.color}88`,
          fontFamily: "monospace",
          flexShrink: 0,
        }}>
          {meta.initial}
        </div>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: meta.color, letterSpacing: 2, textTransform: "uppercase" }}>
          {meta.label}
        </span>
      </div>

      {/* ── Text area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{
          fontSize: 16,
          color: "#e2e8f0",
          fontFamily: "'Geist', monospace",
          lineHeight: 1.6,
          margin: 0,
          minHeight: 52,
        }}>
          {displayed}
          {phase === "typing" && (
            <span style={{ display: "inline-block", width: 2, height: "1em", backgroundColor: "#a5b4fc", marginLeft: 2, verticalAlign: "middle", animation: "cursor-blink 0.8s step-end infinite" }} />
          )}
        </p>

        {phase === "done" && (
          <AdvancePrompt />
        )}
      </div>

      <style>{`
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes prompt-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>
    </motion.div>
  );
}

function AdvancePrompt() {
  return (
    <p style={{
      fontSize: 11,
      fontFamily: "monospace",
      color: "#6366f1",
      marginTop: 8,
      animation: "prompt-pulse 1.2s ease-in-out infinite",
    }}>
      ▶ Press Space to continue
    </p>
  );
}
