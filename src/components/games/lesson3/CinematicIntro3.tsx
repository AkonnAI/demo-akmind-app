"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AXCharacter from "@/components/games/shared/AXCharacter";
import NovaCharacter from "@/components/games/shared/NovaCharacter";

interface CinematicIntro3Props {
  onComplete: () => void;
}

function CaptionBox({
  text,
  sub,
  pos = "top",
}: {
  text: string;
  sub?: string;
  pos?: "top" | "bottom";
}) {
  return (
    <div
      style={{
        position: "absolute",
        ...(pos === "top" ? { top: 24 } : { bottom: 100 }),
        left: 20,
        right: 20,
        zIndex: 10,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          backgroundColor: "#a855f7",
          color: "#0a0a1a",
          padding: "6px 14px",
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "inline-block",
          marginBottom: 6,
          boxShadow: "3px 3px 0 #000",
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            color: "#e0e7ff",
            padding: "8px 14px",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.5,
            display: "block",
            border: "2px solid rgba(168,85,247,0.45)",
            maxWidth: 620,
            boxShadow: "3px 3px 0 rgba(0,0,0,0.5)",
            whiteSpace: "pre-line",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function AdvanceHint() {
  return (
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "monospace",
        fontSize: 11,
        color: "#94a3b8",
        letterSpacing: 2,
        zIndex: 20,
      }}
    >
      ▶ SPACE OR CLICK TO CONTINUE
    </motion.div>
  );
}

function HumanSilhouette() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #fdba74, #c2410c)",
          border: "3px solid #7c2d12",
        }}
      />
      <div
        style={{
          width: 56,
          height: 72,
          borderRadius: "12px 12px 8px 8px",
          background: "linear-gradient(180deg, #9a3412, #451a03)",
          border: "3px solid #7c2d12",
        }}
      />
    </div>
  );
}

function KeyGlow({ label, warm }: { label: string; warm: boolean }) {
  return (
    <motion.div
      animate={{
        boxShadow: warm
          ? ["0 0 12px #f97316", "0 0 28px #fb923c", "0 0 12px #f97316"]
          : ["0 0 12px #22d3ee", "0 0 28px #67e8f9", "0 0 12px #22d3ee"],
      }}
      transition={{ repeat: Infinity, duration: 1.8 }}
      style={{
        fontFamily: "monospace",
        fontWeight: 900,
        fontSize: 20,
        padding: "14px 22px",
        borderRadius: 12,
        border: warm ? "2px solid #ea580c" : "2px solid #0891b2",
        background: warm ? "rgba(234,88,12,0.25)" : "rgba(8,145,178,0.25)",
        color: warm ? "#fed7aa" : "#cffafe",
      }}
    >
      {label}
    </motion.div>
  );
}

export default function CinematicIntro3({ onComplete }: CinematicIntro3Props) {
  const [panelIdx, setPanelIdx] = useState(0);

  const advance = () => {
    if (panelIdx < 4) setPanelIdx((p) => p + 1);
    else onComplete();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const panels = [
    <div
      key={0}
      role="presentation"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
      }}
      onClick={advance}
    >
      <div style={{ flex: 1, background: "#451a03" }} />
      <div style={{ flex: 1, background: "#0a0a1a" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 48%, rgba(168,85,247,0.12) 50%, transparent 52%)" }} />
      <CaptionBox
        text="THE DIVIDE"
        sub={`A city torn in two.\nHumans on one side. AI on the other.`}
      />
      <AdvanceHint />
    </div>,

    <div
      key={1}
      role="presentation"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "linear-gradient(90deg, #451a03 0%, #1e1b4b 50%, #0a0a1a 100%)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={advance}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 8%",
          paddingTop: 48,
        }}
      >
        <HumanSilhouette />
        <AXCharacter animation="idle" size={1.8} />
      </div>
      <CaptionBox
        text="NEITHER SIDE UNDERSTANDS THE OTHER"
        sub={`Humans fear AI.\nAI cannot understand humans.\nThe city is breaking apart.`}
      />
      <AdvanceHint />
    </div>,

    <div
      key={2}
      role="presentation"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "radial-gradient(ellipse at center, #312e81 0%, #0a0a1a 70%)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={advance}
    >
      <div style={{ paddingTop: "18%", display: "flex", justifyContent: "center" }}>
        <NovaCharacter expression="warning" size={2.2} />
      </div>
      <CaptionBox
        text="BUT AX IS DIFFERENT"
        pos="bottom"
        sub={`Half logic. Half intuition.\nAX can cross The Divide.\nOnly AX can end this war.`}
      />
      <AdvanceHint />
    </div>,

    <div
      key={3}
      role="presentation"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #431407 0%, #0f172a 100%)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={advance}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-55%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          zIndex: 8,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.75)",
            border: "2px solid #a855f7",
            color: "#e2e8f0",
            padding: "14px 20px",
            fontFamily: "monospace",
            fontSize: 13,
            maxWidth: 440,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          Switch between Human Mode and AI Mode. Each side has different challenges. Use the right mode or you will fail.
        </div>
        <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
          <KeyGlow label="H" warm />
          <KeyGlow label="A" warm={false} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 32, right: 40, opacity: 0.9 }}>
        <NovaCharacter expression="warning" size={1.1} />
      </div>
      <CaptionBox text="DUAL MODE" sub="H = Human (warm). A = AI (cyan)." />
      <AdvanceHint />
    </div>,

    <div
      key={4}
      role="presentation"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "linear-gradient(90deg, #451a03 0%, #0a0a1a 100%)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={advance}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 4,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, transparent, #a855f7, transparent)",
          boxShadow: "0 0 20px #a855f7",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "16%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <AXCharacter animation="idle" size={1.5} />
      </div>
      <CaptionBox
        text="DISTRICT 3: THE DIVIDE"
        sub={`H = Human Mode. A = AI Mode.\nCross both sides. Unite the city.`}
      />
      <AdvanceHint />
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
        style={{ position: "absolute", inset: 0, paddingTop: 48 }}
      >
        {panels[panelIdx]}
      </motion.div>
    </AnimatePresence>
  );
}
