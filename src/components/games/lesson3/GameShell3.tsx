"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "./LoadingScreen";
import CinematicIntro3 from "./CinematicIntro3";
import DivideStage from "./DivideStage";
import BossBattle3 from "./BossBattle3";
import VictoryScreen from "./VictoryScreen";
import DialogueBox from "./DialogueBox";
import ChaosBotCharacter from "./ChaosBotCharacter";
import NovaCharacter from "@/components/games/shared/NovaCharacter";
import GameTouchControls from "@/components/games/shared/GameTouchControls";
import { useSoundEngine } from "./useSoundEngine";
import type { GameData, GameStateLesson3, PlayerMode } from "./gameTypes";
import { INITIAL_GAME_DATA } from "./gameTypes";

interface GameShell3Props {
  onComplete: (xp: number) => void;
  onExit: () => void;
}

const BOSS_SCENES = [
  {
    character: "NOVA" as const,
    text: "AX — the Divide Keeper locks both districts apart. Match every polarity: human empathy, AI precision.",
  },
  {
    character: "CHAOS_BOT" as const,
    text: "TWO HALVES, ONE THRONE. YOU WILL NEVER SYNC IN TIME!",
  },
];

function BossIntroScene({ onComplete }: { onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const scene = BOSS_SCENES[idx];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "linear-gradient(90deg, #451a03 0%, #0a0a1a 100%)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 41 + 11) % 100}%`,
              top: `${(i * 53 + 7) % 80}%`,
              width: 2,
              height: 2,
              borderRadius: "50%",
              backgroundColor: i % 2 === 0 ? "#fb923c" : "#22d3ee",
              opacity: 0.2,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 170,
          width: "100%",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-end",
          padding: "0 60px",
        }}
      >
        <div style={{ opacity: scene.character === "NOVA" ? 1 : 0.35, transition: "opacity 0.3s" }}>
          <NovaCharacter expression="warning" size={2} />
        </div>
        <div style={{ opacity: scene.character === "CHAOS_BOT" ? 1 : 0.35, transition: "opacity 0.3s" }}>
          <ChaosBotCharacter animation={scene.character === "CHAOS_BOT" ? "roar" : "idle"} size={2} />
        </div>
      </div>
      <DialogueBox
        key={idx}
        character={scene.character === "CHAOS_BOT" ? "CHAOS_BOT" : "NOVA"}
        text={scene.text}
        onComplete={() => {
          if (idx < BOSS_SCENES.length - 1) setIdx((i) => i + 1);
          else onComplete();
        }}
      />
    </div>
  );
}

function WantedStars({ level }: { level: number }) {
  if (level === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {level >= 3 && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "#ef4444",
            letterSpacing: 1,
            fontWeight: 700,
          }}
        >
          WANTED
        </motion.span>
      )}
      {Array.from({ length: level }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: level >= 3 ? "#ef4444" : "#fbbf24" }}>
          ★
        </span>
      ))}
    </div>
  );
}

function ModePill({ mode }: { mode: PlayerMode }) {
  const human = mode === "human";
  return (
    <motion.div
      key={mode}
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1,
        border: human ? "1px solid #fb923c" : "1px solid #22d3ee",
        background: human ? "rgba(234,88,12,0.35)" : "rgba(8,145,178,0.35)",
        color: human ? "#ffedd5" : "#cffafe",
        boxShadow: human ? "0 0 14px rgba(249,115,22,0.35)" : "0 0 14px rgba(34,211,238,0.3)",
      }}
    >
      {human ? "👤 HUMAN" : "🤖 AI MODE"}
    </motion.div>
  );
}

export default function GameShell3({ onComplete, onExit }: GameShell3Props) {
  const [gameState, setGameState] = useState<GameStateLesson3>("LOADING");
  const [xpEarned, setXpEarned] = useState(0);
  const [gameData, setGameData] = useState<GameData>(INITIAL_GAME_DATA);
  const [fading, setFading] = useState(false);
  const [hudMode, setHudMode] = useState<PlayerMode>("ai");
  const { playBgMusic, stopBgMusic, toggleMute, isMuted } = useSoundEngine();

  const addXP = (amount: number) => setXpEarned((x) => x + amount);
  const updateGameData = useCallback((updates: Partial<GameData>) => {
    setGameData((prev) => ({ ...prev, ...updates }));
  }, []);

  const transitionTo = useCallback((next: GameStateLesson3) => {
    setFading(true);
    setTimeout(() => {
      setGameState(next);
      setFading(false);
    }, 400);
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  const showHUD = gameState !== "LOADING";
  const healthPct = Math.max(0, Math.min(100, gameData.health));
  const hudWarm = hudMode === "human";
  const touchGameplay = gameState === "STAGE_1" || gameState === "BOSS_BATTLE";

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
            backgroundColor: hudWarm ? "rgba(120,53,15,0.9)" : "rgba(10,10,26,0.9)",
            borderBottom: hudWarm ? "1px solid rgba(251,146,60,0.35)" : "1px solid rgba(34,211,238,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            zIndex: 300,
            gap: 10,
            transition: "background-color 0.35s, border-color 0.35s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12 }}>❤️</span>
              <div
                style={{
                  width: isMobile ? 80 : 120,
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
              {!isMobile && <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>{gameData.health}</span>}
            </div>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11 }}>🔫</span>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a5b4fc" }}>{gameData.ammo}</span>
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: "0 8px",
              flexWrap: "wrap",
            }}
          >
            {(gameState === "STAGE_1" || gameState === "BOSS_BATTLE") && (
              <ModePill mode={hudMode} />
            )}
            <div className="hidden sm:flex" style={{ flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#e9d5ff",
                  letterSpacing: 1,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                ⚡ THE DIVIDE — UNITE THE CITY
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  color: "#78716c",
                  letterSpacing: 1,
                  textAlign: "center",
                }}
              >
                District 3 — The Divide
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <WantedStars level={gameData.wantedLevel} />
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>
              XP: {xpEarned}
            </span>
            <button
              type="button"
              onClick={toggleMute}
              style={{
                background: "none",
                border: "1px solid rgba(168,85,247,0.35)",
                borderRadius: 4,
                color: "#94a3b8",
                fontSize: 11,
                padding: "2px 6px",
                cursor: "pointer",
                minWidth: isMobile ? 32 : undefined,
                minHeight: isMobile ? 32 : undefined,
              }}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.5)",
                borderRadius: 6,
                color: "#f87171",
                fontSize: 11,
                padding: isMobile ? "4px 8px" : "6px 12px",
                cursor: "pointer",
                fontWeight: 700,
                minWidth: isMobile ? 32 : 44,
                minHeight: isMobile ? 32 : 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ position: "relative", width: "100%", height: "calc(100vh - 48px)", marginTop: "48px", overflow: "hidden" }}>
        {gameState === "LOADING" && <LoadingScreen onLoadComplete={() => transitionTo("CINEMATIC_INTRO")} />}
        {gameState === "CINEMATIC_INTRO" && <CinematicIntro3 onComplete={() => transitionTo("STAGE_1")} />}
        {gameState === "STAGE_1" && (
          <DivideStage
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => {
              addXP(500);
              transitionTo("BOSS_INTRO");
            }}
            onXP={addXP}
            onModeChange={setHudMode}
          />
        )}
        {gameState === "BOSS_INTRO" && <BossIntroScene onComplete={() => transitionTo("BOSS_BATTLE")} />}
        {gameState === "BOSS_BATTLE" && (
          <BossBattle3
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => transitionTo("VICTORY")}
            onXP={addXP}
            onModeChange={setHudMode}
          />
        )}
        {gameState === "VICTORY" && (
          <VictoryScreen xpEarned={xpEarned} onCollect={() => transitionTo("COMPLETE")} />
        )}
      </div>

      <GameTouchControls visible={touchGameplay} variant="divide" />
    </div>
  );
}
