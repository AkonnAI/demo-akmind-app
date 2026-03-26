"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AXCharacter from "@/components/games/shared/AXCharacter";
import DialogueBox from "./DialogueBox";
import { useSoundEngine } from "./useSoundEngine";

interface VictoryScreenProps {
  xpEarned: number;
  onCollect: () => void;
}

const CONFETTI_COLORS = ["#fb923c", "#22d3ee", "#a855f7", "#c2410c", "#0369a1", "#fcd34d"];

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
  "You united The Divide, AX. Humans bring creativity and empathy. AI brings speed and precision. Together? Unstoppable.";

function SplitGlitchTitle({ text }: { text: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 2200);
    return () => clearInterval(id);
  }, []);
  const glitch = t % 2 === 0;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 22,
          fontWeight: 900,
          background: "linear-gradient(90deg, #fb923c, #22d3ee)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {text}
      </span>
      {glitch && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontFamily: "monospace",
            fontSize: 22,
            fontWeight: 900,
            color: "#a855f7",
            letterSpacing: 3,
            textTransform: "uppercase",
            clipPath: "inset(40% 0 40% 0)",
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

export default function VictoryScreen({ xpEarned, onCollect }: VictoryScreenProps) {
  const { playSound } = useSoundEngine();
  const confetti = useConfetti(38);
  const [showNova, setShowNova] = useState(false);
  const [novaDone, setNovaDone] = useState(false);
  const [collected, setCollected] = useState(false);

  const rows = [
    { label: "The Divide Stage 1", xp: 200 },
    { label: "The Divide Stage 2", xp: 300 },
    { label: "Challenges, gates & keeper", xp: Math.max(0, xpEarned - 500) },
  ];

  useEffect(() => {
    try {
      playSound("victory");
    } catch {
      /* silent */
    }
    const tm = setTimeout(() => setShowNova(true), 850);
    return () => clearTimeout(tm);
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
        background: "linear-gradient(135deg, #451a03 0%, #0a0a1a 50%, #0d1224 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "auto",
        paddingTop: 48,
        paddingBottom: showNova ? 200 : 24,
      }}
    >
      <style>{`
        @keyframes confettiFall3 {
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
            animation: `confettiFall3 ${c.duration}s ${c.delay}s ease-in infinite`,
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
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
        >
          <AXCharacter animation="celebrate" size={1.5} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <SplitGlitchTitle text="The city unites" />
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "monospace",
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            District 3 — The Divide is healed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            width: "100%",
            backgroundColor: "rgba(10,10,26,0.92)",
            border: "1.5px solid rgba(168,85,247,0.45)",
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
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#22d3ee", fontWeight: 600 }}>
                +{xp} XP
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(168,85,247,0.25)", margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e2e8f0", fontWeight: 700 }}>TOTAL</span>
            <span style={{ fontFamily: "monospace", fontSize: 20, color: "#fbbf24", fontWeight: 900 }}>+{xpEarned} XP</span>
          </div>
        </motion.div>

        <AnimatePresence>
          {novaDone && (
            <motion.button
              key="collect"
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCollect}
              disabled={collected}
              style={{
                background: "linear-gradient(to right, #ea580c, #0891b2)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "14px 44px",
                fontSize: 15,
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: 2,
                cursor: collected ? "default" : "pointer",
                opacity: collected ? 0.55 : 1,
                boxShadow: "0 0 24px rgba(168,85,247,0.35)",
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
