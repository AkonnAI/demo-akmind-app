"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ChaosBotProps {
  animation: "idle" | "roar" | "defeat";
  size?: number;
}

// Base dimensions: 72w × 96h
const W = 72;
const H = 96;

export default function ChaosBotCharacter({ animation, size = 1 }: ChaosBotProps) {
  const [glitchX, setGlitchX] = useState(0);
  const [glitchOpacity, setGlitchOpacity] = useState(1);

  // Idle glitch: every 2s briefly shift + flicker
  useEffect(() => {
    if (animation !== "idle") return;
    const id = setInterval(() => {
      setGlitchX(-3);
      setGlitchOpacity(0.7);
      const t1 = setTimeout(() => { setGlitchX(3);  setGlitchOpacity(0.9); }, 50);
      const t2 = setTimeout(() => { setGlitchX(0);  setGlitchOpacity(1);   }, 120);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, 2000);
    return () => clearInterval(id);
  }, [animation]);

  const getAnimate = () => {
    if (animation === "roar")   return { scale: [1, 1.25, 1] };
    if (animation === "defeat") return { rotate: 90, y: 80, opacity: 0 };
    return {};
  };

  const getTransition = () => {
    if (animation === "roar")   return { repeat: Infinity, duration: 0.8, ease: "easeInOut" as const };
    if (animation === "defeat") return { duration: 1.2,    ease: "easeIn"  as const };
    return {};
  };

  return (
    <div style={{ display: "inline-block", width: W * size, height: H * size, position: "relative", overflow: "visible" }}>
      <div style={{ width: W, height: H, transform: `scale(${size})`, transformOrigin: "top left" }}>
        <motion.div
          key={animation}
          style={{
            width: W,
            height: H,
            position: "relative",
            x: animation === "idle" ? glitchX : 0,
            opacity: animation === "idle" ? glitchOpacity : 1,
          }}
          animate={getAnimate()}
          transition={getTransition()}
        >
          {/* ── Jagged crown SVG ── */}
          <svg
            viewBox="0 0 72 18"
            style={{ position: "absolute", top: 0, left: 0, width: 72, height: 18 }}
          >
            <polygon
              points="0,18 8,2 18,14 28,2 36,10 44,2 54,14 64,2 72,18"
              fill="#dc2626"
            />
          </svg>

          {/* ── Head ── */}
          <div style={{
            position: "absolute", left: 8, top: 14,
            width: 56, height: 36,
            backgroundColor: "#7f1d1d",
            borderRadius: 4,
            border: "2px solid #ef4444",
          }}>
            {/* Left X-eye */}
            <div style={{ position: "absolute", left: 8, top: 8 }}>
              <svg viewBox="0 0 18 18" style={{ width: 18, height: 18 }}>
                <line x1="2" y1="2" x2="16" y2="16" stroke="#ff0000" strokeWidth="3" strokeLinecap="round" />
                <line x1="16" y1="2" x2="2" y2="16" stroke="#ff0000" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            {/* Right X-eye */}
            <div style={{ position: "absolute", left: 30, top: 8 }}>
              <svg viewBox="0 0 18 18" style={{ width: 18, height: 18 }}>
                <line x1="2" y1="2" x2="16" y2="16" stroke="#ff0000" strokeWidth="3" strokeLinecap="round" />
                <line x1="16" y1="2" x2="2" y2="16" stroke="#ff0000" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* ── Left arm (bigger) ── */}
          <div style={{
            position: "absolute", left: -8, top: 52,
            width: 16, height: 28,
            backgroundColor: "#991b1b",
            borderRadius: 4,
            border: "1px solid #ef4444",
          }} />

          {/* ── Right arm (smaller) ── */}
          <div style={{
            position: "absolute", left: 64, top: 56,
            width: 10, height: 20,
            backgroundColor: "#991b1b",
            borderRadius: 3,
            border: "1px solid #ef4444",
          }} />

          {/* ── Body ── */}
          <div style={{
            position: "absolute", left: 4, top: 50,
            width: 64, height: 32,
            backgroundColor: "#991b1b",
            borderRadius: 4,
            border: "2px solid #ef4444",
            boxShadow: "0 0 14px rgba(220,38,38,0.7)",
            overflow: "hidden",
          }}>
            {/* Crack lines */}
            <svg viewBox="0 0 64 32" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <path d="M20 0 L24 10 L16 16 L22 32" stroke="#ff6666" strokeWidth="1.5" fill="none" opacity="0.7" />
              <path d="M44 4 L40 14 L48 20" stroke="#ff6666" strokeWidth="1" fill="none" opacity="0.5" />
            </svg>
          </div>

          {/* ── Left leg ── */}
          <div style={{
            position: "absolute", left: 8, top: 82,
            width: 20, height: 18,
            backgroundColor: "#7f1d1d",
            borderRadius: "0 0 4px 4px",
          }} />

          {/* ── Right leg ── */}
          <div style={{
            position: "absolute", left: 44, top: 82,
            width: 20, height: 18,
            backgroundColor: "#7f1d1d",
            borderRadius: "0 0 4px 4px",
          }} />
        </motion.div>
      </div>
    </div>
  );
}
