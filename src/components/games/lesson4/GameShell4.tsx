"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "./LoadingScreen";
import CinematicIntro4 from "./CinematicIntro4";
import TypeHunterStage from "./TypeHunterStage";
import BossBattle4 from "./BossBattle4";
import VictoryScreen from "./VictoryScreen";
import DialogueBox from "./DialogueBox";
import NovaCharacter from "@/components/games/shared/NovaCharacter";
import { useSoundEngine } from "./useSoundEngine";
import type { GameData, GameStateLesson4, AmmoType } from "./gameTypes";
import { INITIAL_GAME_DATA } from "./gameTypes";

interface GameShell4Props {
  onComplete: (xp: number) => void;
  onExit: () => void;
}

function BossIntro4({ onComplete }: { onComplete: () => void }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "linear-gradient(180deg,#0f172a,#1e1b4b)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", bottom: 140, left: "50%", transform: "translateX(-50%)" }}>
        <NovaCharacter expression="warning" size={2} />
      </div>
      <DialogueBox
        character="NOVA"
        text="AX — THE UNDEFINED collapses all three types into one signal. Watch its cycle. Match ammo to its phase. One wrong classification wastes time!"
        onComplete={onComplete}
      />
    </div>
  );
}

function WantedStars({ level }: { level: number }) {
  if (level === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {Array.from({ length: level }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: "#fbbf24" }}>
          ★
        </span>
      ))}
    </div>
  );
}

function AmmoHud({ ammo }: { ammo: AmmoType }) {
  if (ammo === null) {
    return <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>No ammo — press 1, 2, or 3</span>;
  }
  if (ammo === "narrow") {
    return <span style={{ color: "#c4b5fd", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>● NARROW</span>;
  }
  if (ammo === "general") {
    return <span style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>● GENERAL</span>;
  }
  return <span style={{ color: "#f87171", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>● SUPER</span>;
}

export default function GameShell4({ onComplete, onExit }: GameShell4Props) {
  const [gameState, setGameState] = useState<GameStateLesson4>("LOADING");
  const [xpEarned, setXpEarned] = useState(0);
  const [gameData, setGameData] = useState<GameData>(INITIAL_GAME_DATA);
  const [fading, setFading] = useState(false);
  const [hudAmmo, setHudAmmo] = useState<AmmoType>(null);
  const { playBgMusic, stopBgMusic, toggleMute, isMuted } = useSoundEngine();

  const addXP = (amount: number) => setXpEarned((x) => x + amount);
  const updateGameData = useCallback((updates: Partial<GameData>) => {
    setGameData((prev) => ({ ...prev, ...updates }));
  }, []);

  const transitionTo = useCallback((next: GameStateLesson4) => {
    setFading(true);
    setTimeout(() => {
      setGameState(next);
      setFading(false);
    }, 380);
  }, []);

  useEffect(() => {
    if (gameState === "VICTORY" || gameState === "COMPLETE") {
      stopBgMusic();
      return;
    }
    if (gameState !== "LOADING") {
      playBgMusic();
    }
  }, [gameState, playBgMusic, stopBgMusic]);

  useEffect(() => {
    if (gameState === "COMPLETE") onComplete(xpEarned);
  }, [gameState, xpEarned, onComplete]);

  const showHUD = gameState !== "LOADING";
  const healthPct = Math.max(0, Math.min(100, gameData.health));
  const showAmmoHud = gameState === "STAGE_1" || gameState === "BOSS_BATTLE";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AnimatePresence>
        {fading && (
          <motion.div
            key="fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, backgroundColor: "#000", zIndex: 400 }}
          />
        )}
      </AnimatePresence>

      {showHUD && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            minHeight: 52,
            backgroundColor: "rgba(15,23,42,0.94)",
            borderBottom: "1px solid rgba(167,139,250,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            zIndex: 300,
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12 }}>❤️</span>
              <div
                style={{
                  width: 120,
                  height: 8,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${healthPct}%`,
                    height: "100%",
                    backgroundColor:
                      healthPct > 50 ? "#22c55e" : healthPct > 25 ? "#f59e0b" : "#ef4444",
                    transition: "width 0.3s",
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>{gameData.health}</span>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#e9d5ff",
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              🎯 CLASSIFICATION ARENA
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b" }}>District 4</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {showAmmoHud && <AmmoHud ammo={hudAmmo} />}
            <WantedStars level={gameData.wantedLevel} />
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>XP: {xpEarned}</span>
            <button
              type="button"
              onClick={toggleMute}
              style={{
                background: "none",
                border: "1px solid rgba(167,139,250,0.35)",
                borderRadius: 4,
                color: "#94a3b8",
                fontSize: 11,
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{
                background: "none",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 4,
                color: "#f87171",
                fontSize: 11,
                padding: "2px 10px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden", position: "relative", paddingTop: showHUD ? 52 : 0 }}>
        {gameState === "LOADING" && <LoadingScreen onLoadComplete={() => transitionTo("CINEMATIC_INTRO")} />}
        {gameState === "CINEMATIC_INTRO" && <CinematicIntro4 onComplete={() => transitionTo("STAGE_1")} />}
        {gameState === "STAGE_1" && (
          <TypeHunterStage
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => {
              addXP(450);
              transitionTo("BOSS_INTRO");
            }}
            onXP={addXP}
            onAmmoChange={setHudAmmo}
          />
        )}
        {gameState === "BOSS_INTRO" && (
          <BossIntro4 onComplete={() => transitionTo("BOSS_BATTLE")} />
        )}
        {gameState === "BOSS_BATTLE" && (
          <BossBattle4
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => transitionTo("VICTORY")}
            onXP={addXP}
            onAmmoChange={setHudAmmo}
          />
        )}
        {gameState === "VICTORY" && (
          <VictoryScreen xpEarned={xpEarned} onCollect={() => transitionTo("COMPLETE")} />
        )}
      </div>

      {(gameState === "STAGE_1" || gameState === "BOSS_BATTLE") && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 250,
            background: "rgba(0,0,0,0.65)",
            color: "#e2e8f0",
            fontFamily: "monospace",
            fontSize: 11,
            padding: "6px 14px",
            borderRadius: 8,
            pointerEvents: "none",
            maxWidth: "96vw",
            textAlign: "center",
          }}
        >
          ← → Move · Space Jump · 1=Narrow · 2=General · 3=Super · Z=Shoot
        </div>
      )}
    </div>
  );
}
