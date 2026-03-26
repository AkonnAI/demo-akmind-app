"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DialogueBox from "./DialogueBox";
import NovaCharacter from "@/components/games/shared/NovaCharacter";
import ChaosBotCharacter from "./ChaosBotCharacter";

interface StageCutscene2Props {
  onComplete: () => void;
}

const PANEL_1_TEXT =
  "Stage 1 complete! But the corruption goes deeper. The TIME CORRUPTOR has hidden in the modern era. 2016 to 2022 — find him there.";

const PANEL_2_TEXT =
  "You think restoring the PAST will stop me?! I control the FUTURE! Try to catch me in the modern age!";

export default function StageCutscene2({ onComplete }: StageCutscene2Props) {
  const [panel, setPanel] = useState(0);
  const consumedRef = useRef(false);
  const panelRef = useRef(panel);
  panelRef.current = panel;

  const goNext = useCallback(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    const p = panelRef.current;
    if (p === 0) {
      setPanel(1);
    } else {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    consumedRef.current = false;
  }, [panel]);

  useEffect(() => {
    const t = setTimeout(goNext, 4000);
    return () => clearTimeout(t);
  }, [panel, goNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "linear-gradient(180deg, #050208 0%, #1a0a14 100%)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.12 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 41) % 100}%`,
              top: `${(i * 67) % 100}%`,
              width: 2,
              height: 2,
              borderRadius: "50%",
              backgroundColor: "#fbbf24",
            }}
          />
        ))}
      </div>

      {panel === 0 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "38%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <NovaCharacter expression="warning" size={2.4} />
          </div>
          <DialogueBox
            key="p1"
            character="NOVA"
            expression="warning"
            text={PANEL_1_TEXT}
            startFull
            onComplete={goNext}
          />
        </>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "36%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <ChaosBotCharacter animation="idle" size={3} />
          </div>
          <DialogueBox
            key="p2"
            character="CHAOS_BOT"
            text={PANEL_2_TEXT}
            startFull
            onComplete={goNext}
          />
        </>
      )}

      <p
        style={{
          position: "fixed",
          bottom: 12,
          right: 20,
          margin: 0,
          fontFamily: "monospace",
          fontSize: 10,
          color: "rgba(148,163,184,0.6)",
          zIndex: 250,
          pointerEvents: "none",
        }}
      >
        Space — skip · auto in 4s
      </p>
    </div>
  );
}
