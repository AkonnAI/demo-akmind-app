"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

const FLAVOR_TEXTS = [
  "Opening Classification Arena...",
  "Loading Narrow / General / Super profiles...",
  "Calibrating ammo-type matrix...",
  "Preparing NOVA field brief...",
  "Warning: type mismatch detected...",
];

interface Star {
  id: number;
  size: number;
  top: number;
  left: number;
  duration: number;
  delay: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 2 + 1,       // 1–3px
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: Math.random() * 2 + 1,   // 1–3s
    delay: Math.random() * 3,
  }));
}

export default function LoadingScreen({ onLoadComplete }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [flavorIndex, setFlavorIndex] = useState(0);
  const [barStarted, setBarStarted] = useState(false);

  const stars = useMemo(() => generateStars(50), []);

  // Start bar fill on next tick so CSS transition fires
  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarStarted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cycle flavor text every 500ms
  useEffect(() => {
    const id = setInterval(() => {
      setFlavorIndex((prev) => (prev + 1) % FLAVOR_TEXTS.length);
    }, 500);
    return () => clearInterval(id);
  }, []);

  // After 2500ms fade out then call onLoadComplete
  useEffect(() => {
    const id = setTimeout(() => {
      setVisible(false);
    }, 2500);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>

      <AnimatePresence onExitComplete={onLoadComplete}>
        {visible && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "#0a0a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            {/* Stars */}
            {stars.map((star) => (
              <span
                key={star.id}
                style={{
                  position: "absolute",
                  top: `${star.top}%`,
                  left: `${star.left}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
                }}
              />
            ))}

            {/* Center content */}
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              {/* AKMIND ACADEMY label */}
              <p
                style={{
                  fontFamily: "monospace",
                  color: "#6366f1",
                  fontSize: "14px",
                  letterSpacing: "6px",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                }}
              >
                AKMIND ACADEMY
              </p>

              <h1
                style={{
                  color: "#ffffff",
                  fontSize: "36px",
                  fontWeight: "bold",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                District 4
              </h1>

              <p
                style={{
                  background: "linear-gradient(90deg, #a78bfa, #fcd34d, #f87171)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  fontSize: "24px",
                  margin: "8px 0 4px",
                  fontWeight: 800,
                }}
              >
                The Classification Arena
              </p>

              <p
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  margin: 0,
                }}
              >
                Lesson 4 — Types of AI: Narrow, General & Super
              </p>

              {/* Loading bar */}
              <div
                style={{
                  marginTop: "40px",
                  width: "300px",
                  height: "6px",
                  backgroundColor: "#1e293b",
                  borderRadius: "9999px",
                  overflow: "hidden",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: barStarted ? "100%" : "0%",
                    background: "linear-gradient(to right, #7c3aed, #a855f7, #ea580c)",
                    borderRadius: "9999px",
                    transition: "width 2500ms linear",
                  }}
                />
              </div>

              {/* Flavor text */}
              <p
                style={{
                  marginTop: "16px",
                  fontSize: "13px",
                  color: "#475569",
                  fontFamily: "monospace",
                  minHeight: "20px",
                }}
              >
                {FLAVOR_TEXTS[flavorIndex]}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
