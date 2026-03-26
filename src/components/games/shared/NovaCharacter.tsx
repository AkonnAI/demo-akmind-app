"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface NovaProps {
  expression: "idle" | "happy" | "explaining" | "warning" | "celebrating";
  size?: number;
}

const NOVA_CSS = `
@keyframes nova-orbit {
  from { transform: rotate(0deg)   translateX(var(--orbit-r)) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
}
@keyframes nova-visor-flicker {
  0%,95%,100% { opacity:1; }
  96%         { opacity:0.4; }
  97%         { opacity:1; }
  98%         { opacity:0.6; }
}
@keyframes nova-warn-blink {
  0%,49%  { box-shadow: 0 0 14px rgba(251,191,36,0.55), inset 0 0 12px rgba(251,191,36,0.12); border-color: #fcd34d; }
  50%,100%{ box-shadow: 0 0 8px rgba(251,191,36,0.35), inset 0 0 8px rgba(251,191,36,0.06); border-color: #fbbf24; }
}
@keyframes nova-celebrate-pulse {
  0%,100% { box-shadow: 0 0 12px 3px #22d3ee, 0 0 28px 8px #6366f1; }
  50%     { box-shadow: 0 0 22px 8px #a78bfa, 0 0 50px 16px #6366f1; }
}
@keyframes nova-antenna-ping {
  0%,80%,100%{ transform: scale(1);   opacity:1; }
  40%        { transform: scale(1.8); opacity:0.5; }
}
@keyframes nova-panel-glow {
  0%,100%{ opacity:0.6; }
  50%    { opacity:1; }
}
`;

function getLed(col: number, expression: string, tick: number): string {
  const patterns: Record<string, number[][]> = {
    idle:       [[0,1,0],[0,1,0],[0,0,0],[0,1,0],[0,1,0]],
    happy:      [[1,0,1],[1,0,1],[0,0,0],[1,1,1],[0,1,0]],
    explaining: [[0,1,0],[0,1,0],[0,0,0],[0,1,1],[1,1,0]],
    warning:    [[1,1,0],[0,1,0],[0,0,0],[0,1,0],[1,1,0]],
    celebrating:[[1,1,1],[1,0,1],[0,0,0],[1,0,1],[1,1,1]],
  };
  const pat = patterns[expression] ?? patterns.idle;
  const row = Math.floor(tick / 2) % pat.length;
  return pat[row][col] ? "#fbbf24" : "rgba(251,191,36,0.2)";
}

export default function NovaCharacter({ expression, size = 1 }: NovaProps) {
  const B = 90; // base width
  const H = 110; // base height
  const W = B * size;
  const TH = H * size;

  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
    }, 180);
    return () => clearInterval(id);
  }, []);

  const isWarn = expression === "warning";
  const isCeleb = expression === "celebrating";
  const isHappy = expression === "happy";

  const headGlow = isCeleb
    ? "nova-celebrate-pulse 1s ease-in-out infinite"
    : isWarn
    ? "nova-warn-blink 0.55s step-start infinite"
    : "none";

  const headBg =
    "linear-gradient(135deg, #1a1a2e, #0f3460)";

  const borderColor = "#fbbf24";
  const orbitR = 52 * size;

  return (
    <>
      <style>{NOVA_CSS}</style>
      <motion.div
        style={{ display: "inline-block", width: W, height: TH, position: "relative" }}
        animate={{ y: [0, -8 * size, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        {/* ── Antenna ── */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: 0,
          transform: "translateX(-50%)",
          width: 3 * size,
          height: 18 * size,
          background: "linear-gradient(to bottom, #64748b, #334155)",
          borderRadius: 2,
        }} />
        <div style={{
          position: "absolute",
          left: "50%",
          top: -4 * size,
          transform: "translateX(-50%)",
          width: 10 * size,
          height: 10 * size,
          borderRadius: "50%",
          background: "#fbbf24",
          boxShadow: `0 0 ${8 * size}px rgba(251,191,36,0.9)`,
          animation: "nova-antenna-ping 1.5s ease-out infinite",
        }} />

        {/* ── Head ── */}
        <div style={{
          position: "absolute",
          top: 14 * size,
          left: "50%",
          transform: "translateX(-50%)",
          width: 72 * size,
          height: 68 * size,
          borderRadius: 14 * size,
          background: headBg,
          border: `${2 * size}px solid ${borderColor}`,
          boxShadow:
            isCeleb || isWarn
              ? undefined
              : `0 0 14px 3px rgba(251,191,36,0.25), inset 0 0 18px rgba(15,52,96,0.35)`,
          animation: headGlow,
          overflow: "hidden",
        }}>
          {/* Scanline overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(34,211,238,0.04) 3px, rgba(34,211,238,0.04) 4px)`,
            zIndex: 10,
          }} />

          {/* Visor strip */}
          <div style={{
            position: "absolute",
            top: 12 * size,
            left: 6 * size,
            right: 6 * size,
            height: 22 * size,
            borderRadius: 6 * size,
            background: `linear-gradient(to bottom, rgba(34,211,238,0.18), rgba(34,211,238,0.06))`,
            border: `1px solid rgba(34,211,238,0.35)`,
            animation: "nova-visor-flicker 4s ease-in-out infinite",
          }} />

          {/* Hexagon Eyes */}
          {[18, 42].map((ex, i) => (
            <div key={i} style={{
              position: "absolute",
              top: 16 * size,
              left: ex * size,
              width: 14 * size,
              height: 14 * size,
              background: isCeleb ? "#a78bfa" : "#22d3ee",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              boxShadow: "0 0 6px #22d3ee",
              animation: isWarn ? "nova-visor-flicker 2.5s ease-in-out infinite" : "none",
            }}>
              {/* Inner highlight */}
              <div style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                width: 8 * size, height: 8 * size,
                borderRadius: "50%",
                background: "rgba(34,211,238,0.35)",
                boxShadow: "0 0 6px #22d3ee",
              }} />
            </div>
          ))}

          {/* LED mouth — 3 cols × animated rows */}
          <div style={{
            position: "absolute",
            bottom: 12 * size,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4 * size,
          }}>
            {[0, 1, 2].map((col) => (
              <div key={col} style={{
                width: 6 * size,
                height: 6 * size,
                borderRadius: 2 * size,
                background: getLed(col, expression, tick),
                boxShadow: `0 0 ${4 * size}px ${getLed(col, expression, tick)}`,
                transition: "background 0.15s, box-shadow 0.15s",
              }} />
            ))}
          </div>

          {/* Chin detail line */}
          <div style={{
            position: "absolute",
            bottom: 5 * size,
            left: 16 * size,
            right: 16 * size,
            height: 1,
            background: `linear-gradient(to right, transparent, rgba(251,191,36,0.35), transparent)`,
          }} />
        </div>

        {/* ── Side panels ── */}
        {[-1, 1].map((side) => (
          <div key={side} style={{
            position: "absolute",
            top: 28 * size,
            left: side === -1 ? 0 : undefined,
            right: side === 1 ? 0 : undefined,
            width: 10 * size,
            height: 34 * size,
            borderRadius: side === -1 ? `${5 * size}px 0 0 ${5 * size}px` : `0 ${5 * size}px ${5 * size}px 0`,
            background: "linear-gradient(to bottom, #1e293b, #0f172a)",
            border: `1px solid rgba(251,191,36,0.45)`,
            boxShadow: "inset 0 0 8px rgba(251,191,36,0.08)",
            animation: "nova-panel-glow 2s ease-in-out infinite",
          }}>
            {[0, 1, 2].map((dot) => (
              <div key={dot} style={{
                position: "absolute",
                top: (8 + dot * 10) * size,
                left: "50%",
                transform: "translateX(-50%)",
                width: 4 * size,
                height: 4 * size,
                borderRadius: "50%",
                background: "#fbbf24",
                opacity: tick % 3 === dot ? 1 : 0.35,
                transition: "opacity 0.18s",
                boxShadow: tick % 3 === dot ? "0 0 6px rgba(251,191,36,0.85)" : "none",
              }} />
            ))}
          </div>
        ))}

        {/* ── Neck connector ── */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 22 * size,
          height: 12 * size,
          background: "linear-gradient(to bottom, #1e293b, #0f172a)",
          borderRadius: `0 0 ${6 * size}px ${6 * size}px`,
          border: `1px solid rgba(251,191,36,0.3)`,
          borderTop: "none",
        }} />

        {/* ── Orbiting sparkles ── */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 7 * size,
            height: 7 * size,
            marginTop: -3.5 * size,
            marginLeft: -3.5 * size,
            borderRadius: "50%",
            background: isCeleb ? "#a78bfa" : "#fbbf24",
            boxShadow: `0 0 ${5 * size}px ${isCeleb ? "#6366f1" : "rgba(251,191,36,0.75)"}`,
            /* @ts-expect-error CSS custom property */
            "--orbit-r": `${orbitR}px`,
            animation: `nova-orbit ${3 + i * 0.4}s linear ${-(i * (3 / 3)).toFixed(2)}s infinite`,
            opacity: isHappy ? 1 : 0.7,
          }} />
        ))}
      </motion.div>
    </>
  );
}
