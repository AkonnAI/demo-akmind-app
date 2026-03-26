"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AXCharacter from "@/components/games/shared/AXCharacter";
import DialogueBox from "./DialogueBox";
import { useSoundEngine } from "./useSoundEngine";

interface VictoryScreenLesson2Props {
  xpEarned: number;
  onCollect: () => void;
}

const CONFETTI_COLORS = ["#f59e0b", "#fbbf24", "#78350f", "#ea580c", "#fcd34d", "#a16207", "#22d3ee"];

function useConfetti(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${(i * 7 + 3) % 100}%`,
        duration: 2 + ((i * 13) % 30) / 10,
        delay: ((i * 17) % 30) / 10,
        size: 6 + (i % 4) * 2,
      })),
    [count]
  );
}

const NOVA_VICTORY =
  "You restored AI history, AX! Every milestone matters — from Turing's dream to ChatGPT's reality. District 3 awaits — The Divide.";

function GlitchTitle({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 2200);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 22,
          fontWeight: 900,
          color: "#fbbf24",
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {text}
      </span>
      {glitch && (
        <>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 900,
              color: "#fcd34d",
              letterSpacing: 3,
              textTransform: "uppercase",
              clipPath: "inset(0 0 60% 0)",
              transform: "translate(-2px,0)",
              pointerEvents: "none",
            }}
          >
            {text}
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 900,
              color: "#ea580c",
              letterSpacing: 3,
              textTransform: "uppercase",
              clipPath: "inset(55% 0 0 0)",
              transform: "translate(2px,0)",
              pointerEvents: "none",
            }}
          >
            {text}
          </span>
        </>
      )}
    </div>
  );
}

export default function VictoryScreenLesson2({
  xpEarned,
  onCollect,
}: VictoryScreenLesson2Props) {
  const { playSound } = useSoundEngine();
  const confetti = useConfetti(36);
  const [showNova, setShowNova] = useState(false);
  const [novaDone, setNovaDone] = useState(false);
  const [collected, setCollected] = useState(false);

  const rows = [
    { label: "Timeline Stage 1 complete", xp: 200 },
    { label: "Timeline Stage 2 complete", xp: 300 },
    { label: "Milestone landings & boss", xp: Math.max(0, xpEarned - 500) },
  ];

  useEffect(() => {
    try {
      playSound("victory");
    } catch {
      /* silent */
    }
    const t = setTimeout(() => setShowNova(true), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCollect = () => {
    if (collected) return;
    setCollected(true);
    try {
      playSound("xpCollect");
    } catch {
      /* silent */
    }
    onCollect();
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "linear-gradient(180deg,#1a0a00 0%,#0d0d24 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "auto",
        paddingTop: 48,
        paddingBottom: showNova ? 200 : 24,
      }}
    >
      <style>{`
        @keyframes confettiFall2 {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {confetti.map((c) => (
        <div
          key={c.id}
          style={{
            position: "fixed",
            top: 0,
            left: c.left,
            width: c.size,
            height: c.size,
            borderRadius: 2,
            backgroundColor: c.color,
            pointerEvents: "none",
            animation: `confettiFall2 ${c.duration}s ${c.delay}s ease-in infinite`,
            zIndex: 1,
          }}
        />
      ))}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: 560,
          padding: "0 20px",
          gap: 16,
        }}
      >
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
        >
          <AXCharacter animation="celebrate" size={1.5} />
        </motion.div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ textAlign: "center" }}
        >
          <GlitchTitle text="History vault restored" />
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "monospace",
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            District 2 — The History Vault is secure again.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            width: "100%",
            backgroundColor: "rgba(15,8,4,0.92)",
            border: "1.5px solid rgba(251,191,36,0.45)",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          {rows.map(({ label, xp }, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: i < rows.length - 1 ? 8 : 0,
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{label}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                +{xp} XP
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(251,191,36,0.25)", margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e2e8f0", fontWeight: 700 }}>TOTAL</span>
            <span style={{ fontFamily: "monospace", fontSize: 20, color: "#fbbf24", fontWeight: 900 }}>+{xpEarned} XP</span>
          </div>
        </motion.div>

        <AnimatePresence>
          {novaDone && (
            <motion.button
              key="collect"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCollect}
              disabled={collected}
              style={{
                background: "linear-gradient(to right, #d97706, #fbbf24)",
                color: "#1a0a00",
                border: "none",
                borderRadius: 14,
                padding: "14px 44px",
                fontSize: 15,
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: 2,
                cursor: collected ? "default" : "pointer",
                opacity: collected ? 0.55 : 1,
                boxShadow: "0 0 24px rgba(251,191,36,0.35)",
              }}
            >
              ⚡ Continue to quiz
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNova && !novaDone && (
          <DialogueBox character="NOVA" text={NOVA_VICTORY} onComplete={() => setNovaDone(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
