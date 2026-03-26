"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AXCharacter from "@/components/games/shared/AXCharacter";
import ChaosBotCharacter from "./ChaosBotCharacter";
import NovaCharacter from "@/components/games/shared/NovaCharacter";
import DialogueBox from "./DialogueBox";

interface CinematicIntro2Props {
  onComplete: () => void;
}

const CINEMATIC_CSS = `
@keyframes ci2-float-up {
  0%   { transform: translateY(0px);   opacity: 0.7; }
  50%  { transform: translateY(-18px); opacity: 1; }
  100% { transform: translateY(0px);   opacity: 0.7; }
}
@keyframes ci2-clock-hour {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes ci2-clock-minute {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes ci2-neon-pulse {
  0%,100%{ text-shadow: 0 0 8px #fcd34d, 0 0 20px #f59e0b, 0 0 40px #f59e0b; opacity:1; }
  48%    { text-shadow: 0 0 4px #fcd34d, 0 0 10px #f59e0b; opacity:0.85; }
  50%    { text-shadow: none; opacity:0.6; }
  52%    { text-shadow: 0 0 4px #fcd34d, 0 0 10px #f59e0b; opacity:0.85; }
}
@keyframes ci2-scanline {
  0%   { background-position: 0 0; }
  100% { background-position: 0 100px; }
}
@keyframes ci2-amber-rise {
  0%   { transform: translateY(0); opacity: 0.45; }
  40%  { opacity: 0.95; }
  100% { transform: translateY(-140px); opacity: 0; }
}
`;

const PANEL_FRAME: CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  overflow: "hidden",
  cursor: "pointer",
};

const PANEL_STAGE: CSSProperties = {
  flex: 1,
  position: "relative",
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const PANEL_DIALOGUE_SLOT: CSSProperties = {
  flexShrink: 0,
  height: 200,
  position: "relative",
  width: "100%",
};

function Scanlines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5,
      backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
      animation: "ci2-scanline 4s linear infinite",
    }} />
  );
}

function AmberRiseParticles({ count = 10 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${8 + (i * 41) % 84}%`,
        bottom: `${12 + (i * 17) % 35}%`,
        size: 2 + (i % 3),
        delay: `${(i * 0.31).toFixed(2)}s`,
        dur: `${2.8 + (i % 5) * 0.45}s`,
      })),
    [count]
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 4,
        overflow: "hidden",
      }}
    >
      {particles.map((p, i) => (
        <div
          key={`amber-${i}-${p.left}`}
          style={{
            position: "absolute",
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "#fbbf24",
            boxShadow: "0 0 8px rgba(251,191,36,0.85)",
            animation: `ci2-amber-rise ${p.dur} ${p.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function FloatParticles({ count = 15 }: { count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${(i * 47 + 11) % 95}%`,
      top:  `${(i * 31 + 7) % 70}%`,
      size: 3 + (i % 3) * 2,
      delay: `${(i * 0.37).toFixed(2)}s`,
      dur:   `${2.4 + (i % 5) * 0.4}s`,
    })),
  [count]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: p.left,
          top: p.top,
          width: p.size,
          height: p.size,
          borderRadius: "50%",
          background: "radial-gradient(circle, #fde68a, #f59e0b)",
          boxShadow: "0 0 6px #fbbf24",
          animation: `ci2-float-up ${p.dur} ${p.delay} ease-in-out infinite`,
          opacity: 0.7,
        }} />
      ))}
    </div>
  );
}

function CitySkyline({ stripBottom = 0 }: { stripBottom?: number }) {
  const buildings = [
    { x: 0,   w: 60,  h: 120, windows: [[8,16],[8,36],[8,56],[28,16],[28,36],[28,56]] },
    { x: 55,  w: 45,  h: 90,  windows: [[8,12],[8,30],[22,12],[22,30]] },
    { x: 95,  w: 80,  h: 170, windows: [[8,20],[8,44],[8,68],[8,92],[36,20],[36,44],[36,68],[36,92],[64,20],[64,44]] },
    { x: 170, w: 50,  h: 130, windows: [[8,14],[8,38],[8,62],[28,14],[28,38],[28,62]] },
    { x: 215, w: 70,  h: 100, windows: [[8,12],[8,30],[8,50],[28,12],[28,30],[48,12],[48,30]] },
    { x: 280, w: 55,  h: 155, windows: [[8,16],[8,40],[8,64],[8,88],[28,16],[28,40],[28,64]] },
    { x: 330, w: 90,  h: 80,  windows: [[10,12],[10,30],[30,12],[30,30],[50,12],[50,30],[70,12]] },
    { x: 415, w: 60,  h: 145, windows: [[8,16],[8,40],[8,64],[8,88],[28,16],[28,40],[28,64]] },
    { x: 470, w: 50,  h: 110, windows: [[8,12],[8,30],[8,54],[28,12],[28,30]] },
    { x: 515, w: 75,  h: 135, windows: [[8,16],[8,40],[8,64],[30,16],[30,40],[30,64],[52,16],[52,40]] },
    { x: 585, w: 55,  h: 95,  windows: [[8,14],[8,36],[8,58],[28,14],[28,36]] },
    { x: 635, w: 65,  h: 160, windows: [[8,16],[8,40],[8,64],[8,88],[30,16],[30,40],[30,64],[52,16]] },
  ];

  return (
    <svg
      viewBox="0 0 700 200"
      preserveAspectRatio="xMidYMax slice"
      style={{
        position: "absolute",
        bottom: stripBottom,
        left: 0,
        right: 0,
        width: "100%",
        height: 220,
        zIndex: 3,
      }}
    >
      {/* Sky glow behind buildings */}
      <defs>
        <radialGradient id="cityGlow" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="700" height="200" fill="url(#cityGlow)" />

      {buildings.map((b, i) => {
        const hy = 200 - b.h;
        const shade = i % 3 === 0 ? "#1e1206" : i % 3 === 1 ? "#160e04" : "#1a1108";
        return (
          <g key={i}>
            {/* Building body */}
            <rect x={b.x} y={hy} width={b.w} height={b.h}
              fill={shade} stroke="#78350f" strokeWidth="0.8" />
            {/* Antenna */}
            <line x1={b.x + b.w / 2} y1={hy} x2={b.x + b.w / 2} y2={hy - 12}
              stroke="#78350f" strokeWidth="1.5" />
            <circle cx={b.x + b.w / 2} cy={hy - 13} r="2"
              fill="#fbbf24" opacity="0.9" />
            {/* Windows */}
            {b.windows.map(([wx, wy], wi) => {
              const lit = (i + wi) % 5 !== 0;
              return (
                <rect key={wi}
                  x={b.x + wx} y={hy + wy}
                  width="10" height="8"
                  fill={lit ? "#fde68a" : "#1a0a00"}
                  opacity={lit ? 0.85 : 0.4}
                  stroke="#78350f" strokeWidth="0.4"
                />
              );
            })}
          </g>
        );
      })}

      {/* Ground strip */}
      <rect x="0" y="196" width="700" height="4" fill="#78350f" opacity="0.8" />
    </svg>
  );
}

function RotatingClock() {
  return (
    <svg
      width="180" height="180" viewBox="0 0 180 180"
      style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 0 20px rgba(251,191,36,0.5))" }}
    >
      <defs>
        <radialGradient id="clockFaceGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="55%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#1a0a00" />
        </radialGradient>
      </defs>

      {/* Face */}
      <circle cx="90" cy="90" r="84"
        fill="url(#clockFaceGrad)"
        stroke="#78350f" strokeWidth="4"
      />

      {/* Outer glow ring */}
      <circle cx="90" cy="90" r="86"
        fill="none" stroke="rgba(251,191,36,0.2)" strokeWidth="8"
      />

      {/* Hour ticks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x1 = 90 + 68 * Math.cos(a);
        const y1 = 90 + 68 * Math.sin(a);
        const x2 = 90 + 80 * Math.cos(a);
        const y2 = 90 + 80 * Math.sin(a);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#fcd34d" strokeWidth={i % 3 === 0 ? 4 : 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Hour hand — pivots exactly at (90,90) */}
      <line x1="90" y1="90" x2="90" y2="46"
        stroke="#fbbf24" strokeWidth="5" strokeLinecap="round"
        style={{ transformOrigin: "90px 90px", animation: "ci2-clock-hour 60s linear infinite" }}
      />

      {/* Minute hand — pivots exactly at (90,90) */}
      <line x1="90" y1="90" x2="90" y2="22"
        stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round"
        style={{ transformOrigin: "90px 90px", animation: "ci2-clock-minute 10s linear infinite", transform: "rotate(90deg)" }}
      />

      {/* Centre pin */}
      <circle cx="90" cy="90" r="6"
        fill="#fde68a" stroke="#78350f" strokeWidth="2"
      />
    </svg>
  );
}

function NeonDistrictSign() {
  return (
    <div style={{
      textAlign: "center",
      padding: "12px 28px",
      border: "2px solid #fbbf24",
      borderRadius: 8,
      background: "rgba(0,0,0,0.6)",
      display: "inline-block",
      boxShadow: "0 0 20px rgba(251,191,36,0.3), inset 0 0 20px rgba(251,191,36,0.05)",
    }}>
      <div style={{
        fontFamily: "monospace",
        fontWeight: 900,
        fontSize: "clamp(26px, 5vw, 42px)",
        color: "#fcd34d",
        letterSpacing: 4,
        animation: "ci2-neon-pulse 4s ease-in-out infinite",
      }}>
        DISTRICT 2
      </div>
      <div style={{
        fontFamily: "monospace",
        fontSize: 13,
        color: "#fde68a",
        letterSpacing: 4,
        marginTop: 4,
        opacity: 0.85,
      }}>
        THE HISTORY VAULT
      </div>
      <div style={{
        marginTop: 8,
        height: 2,
        background: "linear-gradient(to right, transparent, #fbbf24, transparent)",
      }} />
    </div>
  );
}

function Stars({ count = 50 }: { count?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 43 + 7) % 100}%`,
          top: `${(i * 61 + 3) % 60}%`,
          width: i % 4 === 0 ? 3 : 1,
          height: i % 4 === 0 ? 3 : 1,
          borderRadius: "50%",
          backgroundColor: "#fff",
          opacity: 0.08 + (i % 7) * 0.06,
        }} />
      ))}
    </div>
  );
}

export default function CinematicIntro2({ onComplete }: CinematicIntro2Props) {
  const [panelIdx, setPanelIdx] = useState(0);

  const advance = () => {
    if (panelIdx < 4) setPanelIdx((p) => p + 1);
    else onComplete();
  };

  const panels = [
    /* Panel 0 — NEUROPOLIS HISTORY VAULT intro with city skyline */
    <div
      key={0}
      style={{
        ...PANEL_FRAME,
        background: "linear-gradient(165deg, #3d2b1f 0%, #1a0a00 45%, #0d0d24 100%)",
      }}
    >
      <style>{CINEMATIC_CSS}</style>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Stars count={60} />
        <FloatParticles count={15} />
        <CitySkyline stripBottom={200} />
        <Scanlines />
      </div>
      <div style={PANEL_STAGE} />
      <div style={PANEL_DIALOGUE_SLOT}>
        <DialogueBox
          dock="panel"
          character="NARRATOR"
          text="NEUROPOLIS HISTORY VAULT — Someone has erased AI history. The timeline is collapsing."
          onComplete={advance}
          startFull
        />
      </div>
    </div>,

    /* Panel 1 — ChaosBot reveal */
    <div
      key={1}
      style={{
        ...PANEL_FRAME,
        background: "radial-gradient(ellipse at center, #2e1a0a 0%, #0d0d24 100%)",
      }}
    >
      <style>{CINEMATIC_CSS}</style>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Stars count={40} />
        <FloatParticles count={10} />
        <Scanlines />
      </div>
      <div style={{ ...PANEL_STAGE, zIndex: 6 }}>
        <div style={{ transform: "translateY(-6%)" }}>
          <ChaosBotCharacter animation="roar" size={2.4} />
        </div>
      </div>
      <div style={PANEL_DIALOGUE_SLOT}>
        <DialogueBox
          dock="panel"
          character="NARRATOR"
          text="AX-7. Year 2047. NOVA detected anomalies in the history database — key AI milestones have been deleted."
          onComplete={advance}
          startFull
        />
      </div>
    </div>,

    /* Panel 2 — Time Corruptor reveal (clock + NOVA) */
    <div
      key={2}
      style={{
        ...PANEL_FRAME,
        background:
          "radial-gradient(circle at center, rgba(120,53,15,0.4) 0%, #050510 70%)",
      }}
    >
      <style>{CINEMATIC_CSS}</style>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Stars count={35} />
        <AmberRiseParticles count={10} />
        <Scanlines />
      </div>
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          zIndex: 6,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "25%",
            bottom: 0,
            transform: "translateX(-50%)",
          }}
        >
          <NovaCharacter expression="warning" size={0.9} />
        </div>
        <div
          style={{
            position: "absolute",
            left: "75%",
            bottom: 20,
            transform: "translateX(-50%)",
          }}
        >
          <RotatingClock />
        </div>
      </div>
      <div style={PANEL_DIALOGUE_SLOT}>
        <DialogueBox
          dock="panel"
          character="NOVA"
          text="THE TIME CORRUPTOR — a rogue AI that fears being replaced. It's deleting its own origin story."
          onComplete={advance}
          startFull
        />
      </div>
    </div>,

    /* Panel 3 — Mission briefing with AX + NOVA */
    <div
      key={3}
      style={{
        ...PANEL_FRAME,
        background: "radial-gradient(ellipse at center, #2d1b0a 0%, #070712 100%)",
      }}
    >
      <style>{CINEMATIC_CSS}</style>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Stars count={45} />
        <FloatParticles count={12} />
        <Scanlines />
      </div>
      <div style={{ ...PANEL_STAGE, gap: 40, zIndex: 6 }}>
        <AXCharacter animation="idle" size={0.8} />
        <NovaCharacter expression="explaining" size={0.8} />
      </div>
      <div style={PANEL_DIALOGUE_SLOT}>
        <DialogueBox
          dock="panel"
          character="NOVA"
          text="AX — run through the timeline. Land on the correct years. Restore history before it's gone forever."
          onComplete={advance}
          startFull
        />
      </div>
    </div>,

    /* Panel 4 — DISTRICT 2 entrance with neon sign */
    <div
      key={4}
      style={{
        ...PANEL_FRAME,
        background: "linear-gradient(180deg, #1a0a00 0%, #0d0d24 100%)",
      }}
    >
      <style>{CINEMATIC_CSS}</style>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Stars count={55} />
        <FloatParticles count={14} />
        <Scanlines />
      </div>
      <div style={{ ...PANEL_STAGE, flexDirection: "column", zIndex: 6 }}>
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", zIndex: 8 }}>
          <NeonDistrictSign />
        </div>
        <div
          style={{
            position: "absolute",
            left: 48,
            bottom: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <AXCharacter animation="idle" size={1.4} />
          <div
            style={{
              width: 220,
              height: 12,
              background: "#78350f",
              borderRadius: 6,
              border: "2px solid #fbbf24",
              opacity: 0.9,
            }}
          />
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
            Timeline platform start →
          </span>
        </div>
      </div>
      <div style={PANEL_DIALOGUE_SLOT}>
        <DialogueBox
          dock="panel"
          character="AX"
          text="DISTRICT 2: THE HISTORY VAULT — Run. Jump. Land on the right year. Save AI history."
          onComplete={advance}
          startFull
        />
      </div>
    </div>,
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={panelIdx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ position: "absolute", inset: 0 }}
      >
        {panels[panelIdx]}
      </motion.div>
    </AnimatePresence>
  );
}
