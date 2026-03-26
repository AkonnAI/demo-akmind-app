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

const NOVA_VICTORY =
  "Every class of AI filed where it belongs — outstanding work, AX.";

function useConfetti(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        color: ["#7c3aed", "#f59e0b", "#ef4444", "#a855f7", "#fcd34d"][i % 5]!,
        left: `${(i * 7 + 3) % 100}%`,
        duration: 2 + ((i * 13) % 30) / 10,
        delay: ((i * 17) % 30) / 10,
        size: 6 + (i % 4) * 2,
      })),
    [count]
  );
}

export default function VictoryScreen({ xpEarned, onCollect }: VictoryScreenProps) {
  const { playSound } = useSoundEngine();
  const confetti = useConfetti(36);
  const [showNova, setShowNova] = useState(false);
  const [novaDone, setNovaDone] = useState(false);
  const [collected, setCollected] = useState(false);

  useEffect(() => {
    try {
      playSound("victory");
    } catch {
      /* silent */
    }
    const tm = setTimeout(() => setShowNova(true), 700);
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
        background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1c1917 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "auto",
        paddingTop: 40,
        paddingBottom: showNova ? 200 : 24,
      }}
    >
      <style>{`
        @keyframes confettiFall4 {
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
            animation: `confettiFall4 ${c.duration}s ${c.delay}s ease-in infinite`,
            zIndex: 1,
          }}
        />
      ))}

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 520, padding: "0 20px", gap: 14 }}>
        <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 14, stiffness: 200 }}>
          <AXCharacter animation="celebrate" size={1.45} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 3,
              background: "linear-gradient(90deg, #a78bfa, #fbbf24, #f87171)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            CLASSIFICATION COMPLETE
          </span>
          <p style={{ margin: "8px 0 0", fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>District 4 — Types sorted</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            width: "100%",
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(167,139,250,0.45)",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>Session XP</span>
            <span style={{ fontFamily: "monospace", fontSize: 18, color: "#fbbf24", fontWeight: 900 }}>+{xpEarned} XP</span>
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
                background: "linear-gradient(to right, #7c3aed, #f59e0b)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 40px",
                fontSize: 14,
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: 2,
                cursor: collected ? "default" : "pointer",
                opacity: collected ? 0.55 : 1,
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
