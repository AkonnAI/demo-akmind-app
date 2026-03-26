"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NovaCharacter from "@/components/games/shared/NovaCharacter";

interface CinematicIntro4Props {
  onComplete: () => void;
}

function Caption({
  text,
  sub,
}: {
  text: string;
  sub?: string;
}) {
  return (
    <div style={{ position: "absolute", top: 32, left: 16, right: 16, zIndex: 10, textAlign: "center" }}>
      <div
        style={{
          display: "inline-block",
          background: "#facc15",
          color: "#0f172a",
          padding: "8px 20px",
          fontFamily: "monospace",
          fontWeight: 900,
          fontSize: 15,
          letterSpacing: 3,
          boxShadow: "4px 4px 0 #000",
        }}
      >
        {text}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 12,
            marginLeft: "auto",
            marginRight: "auto",
            maxWidth: 520,
            background: "rgba(0,0,0,0.88)",
            color: "#e2e8f0",
            padding: "14px 18px",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.55,
            border: "2px solid rgba(168,85,247,0.5)",
            whiteSpace: "pre-line",
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function AdvanceHint() {
  return (
    <motion.div
      animate={{ opacity: [0.35, 1, 0.35] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      style={{
        position: "absolute",
        bottom: 20,
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

export default function CinematicIntro4({ onComplete }: CinematicIntro4Props) {
  const [panel, setPanel] = useState(0);

  const advance = useCallback(() => {
    if (panel < 4) setPanel((p) => p + 1);
    else onComplete();
  }, [panel, onComplete]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [advance]);

  return (
    <div
      onClick={advance}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#020617",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <AnimatePresence mode="wait">
        {panel === 0 && (
          <motion.div
            key="p0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.35) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(234,179,8,0.25) 0%, transparent 40%), radial-gradient(ellipse at 80% 50%, rgba(220,38,38,0.3) 0%, transparent 45%), #020617",
              }}
            />
            <Caption
              text="THE CLASSIFICATION ARENA"
              sub={"Three types of AI have escaped containment. Only AX can sort them."}
            />
          </motion.div>
        )}

        {panel === 1 && (
          <motion.div
            key="p1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "#020617" }}
          >
            <Caption
              text="KNOW YOUR ENEMY"
              sub={
                "Narrow AI does one thing.\nGeneral AI does everything.\nSuper AI surpasses all humans."
              }
            />
            <div
              style={{
                position: "absolute",
                bottom: 120,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                gap: 48,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 40,
                    height: 56,
                    margin: "0 auto",
                    background: "#7c3aed",
                    borderRadius: 8,
                    border: "2px solid #a78bfa",
                  }}
                />
                <div style={{ color: "#c4b5fd", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>NARROW</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 72,
                    margin: "0 auto",
                    background: "#b45309",
                    borderRadius: 10,
                    border: "2px solid #fbbf24",
                  }}
                />
                <div style={{ color: "#fde68a", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>GENERAL</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 72,
                    height: 88,
                    margin: "0 auto",
                    background: "#991b1b",
                    borderRadius: 12,
                    border: "2px solid #f87171",
                  }}
                />
                <div style={{ color: "#fecaca", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>SUPER</div>
              </div>
            </div>
          </motion.div>
        )}

        {panel === 2 && (
          <motion.div
            key="p2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0f172a,#1e1b4b)" }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 100,
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <NovaCharacter expression="explaining" size={2.2} />
            </div>
            <Caption
              text="NOVA — FIELD BRIEF"
              sub={
                "Each enemy carries a label.\nMatch your ammo type to their type.\nWrong ammo = no damage.\nRight ammo = instant defeat."
              }
            />
          </motion.div>
        )}

        {panel === 3 && (
          <motion.div
            key="p3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "#020617" }}
          >
            <Caption
              text="YOUR WEAPONS"
              sub={"Press 1, 2, or 3 to select ammo.\nPress Z to fire."}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -30%)",
                display: "flex",
                gap: 24,
                alignItems: "flex-end",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#7c3aed",
                    margin: "0 auto 8px",
                    boxShadow: "0 0 12px #7c3aed",
                  }}
                />
                <div style={{ color: "#ddd6fe", fontFamily: "monospace", fontSize: 12 }}>
                  1 key = Narrow ammo
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#f59e0b",
                    margin: "0 auto 8px",
                    boxShadow: "0 0 12px #f59e0b",
                  }}
                />
                <div style={{ color: "#fde68a", fontFamily: "monospace", fontSize: 12 }}>
                  2 key = General ammo
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#ef4444",
                    margin: "0 auto 8px",
                    boxShadow: "0 0 16px #ef4444",
                  }}
                />
                <div style={{ color: "#fecaca", fontFamily: "monospace", fontSize: 12 }}>3 key = Super ammo</div>
              </div>
            </div>
          </motion.div>
        )}

        {panel === 4 && (
          <motion.div
            key="p4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "#020617" }}
          >
            <Caption
              text="DISTRICT 4: CLASSIFICATION ARENA"
              sub={"Identify. Select. Fire.\nClassify every AI type to win."}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AdvanceHint />
    </div>
  );
}
