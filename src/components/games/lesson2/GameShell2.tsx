"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "./LoadingScreen";
import CinematicIntro2 from "./CinematicIntro2";
import NPCExploreZone2 from "./NPCExploreZone2";
import StageCutscene2 from "./StageCutscene2";
import TimelineStage from "./TimelineStage";
import BossBattleLesson2 from "./BossBattleLesson2";
import VictoryScreenLesson2 from "./VictoryScreenLesson2";
import DialogueBox from "./DialogueBox";
import ChaosBotCharacter from "./ChaosBotCharacter";
import NovaCharacter from "@/components/games/shared/NovaCharacter";
import { useSoundEngine } from "./useSoundEngine";
import type { GameData, GameStateLesson2 } from "./gameTypes";
import { INITIAL_GAME_DATA } from "./gameTypes";

interface GameShell2Props {
  onComplete: (xp: number) => void;
  onExit: () => void;
}

const BOSS_SCENES = [
  {
    character: "NOVA" as const,
    text: "AX — the Time Corruptor is anchoring on the vault. Break its quiz-shields and restore the last timeline locks!",
  },
  {
    character: "CHAOS_BOT" as const,
    text: "NO MORE ORIGIN STORY. I WILL UNWRITE AI ITSELF!",
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
        background: "linear-gradient(180deg,#1a0a00,#0d0d24)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 53 + 7) % 80}%`,
              width: 2,
              height: 2,
              borderRadius: "50%",
              backgroundColor: "#fbbf24",
              opacity: 0.15 + (i % 5) * 0.06,
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

export default function GameShell2({ onComplete, onExit }: GameShell2Props) {
  const [gameState, setGameState] = useState<GameStateLesson2>("LOADING");
  const [xpEarned, setXpEarned] = useState(0);
  const [gameData, setGameData] = useState<GameData>(INITIAL_GAME_DATA);
  const [fading, setFading] = useState(false);
  const { playBgMusic, stopBgMusic, toggleMute, isMuted } = useSoundEngine();

  const addXP = (amount: number) => setXpEarned((x) => x + amount);
  const updateGameData = useCallback((updates: Partial<GameData>) => {
    setGameData((prev) => ({ ...prev, ...updates }));
  }, []);

  const transitionTo = useCallback((next: GameStateLesson2) => {
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

  const showHUD = gameState !== "LOADING";
  const healthPct = Math.max(0, Math.min(100, gameData.health));

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
            backgroundColor: "rgba(0,0,0,0.92)",
            borderBottom: "1px solid rgba(251,191,36,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            zIndex: 300,
            gap: 12,
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
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11 }}>🔫</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#fcd34d" }}>{gameData.ammo}</span>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "0 8px",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#fbbf24",
                letterSpacing: 1.2,
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              ⏰ HISTORY VAULT — RESTORE THE TIMELINE
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
              District 2 — The History Vault
            </span>
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
                border: "1px solid rgba(251,191,36,0.35)",
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

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {gameState === "LOADING" && <LoadingScreen onLoadComplete={() => transitionTo("CINEMATIC_INTRO")} />}
        {gameState === "CINEMATIC_INTRO" && (
          <CinematicIntro2 onComplete={() => transitionTo("NPC_EXPLORE")} />
        )}
        {gameState === "NPC_EXPLORE" && (
          <NPCExploreZone2 onComplete={() => transitionTo("STAGE_1")} onXP={addXP} />
        )}
        {gameState === "STAGE_1" && (
          <TimelineStage
            stage={1}
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => {
              addXP(200);
              transitionTo("STAGE_CUTSCENE");
            }}
            onXP={addXP}
          />
        )}
        {gameState === "STAGE_CUTSCENE" && (
          <StageCutscene2 onComplete={() => transitionTo("STAGE_2")} />
        )}
        {gameState === "STAGE_2" && (
          <TimelineStage
            stage={2}
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => {
              addXP(300);
              transitionTo("BOSS_INTRO");
            }}
            onXP={addXP}
          />
        )}
        {gameState === "BOSS_INTRO" && <BossIntroScene onComplete={() => transitionTo("BOSS_BATTLE")} />}
        {gameState === "BOSS_BATTLE" && (
          <BossBattleLesson2
            gameData={gameData}
            onUpdateGameData={updateGameData}
            onComplete={() => transitionTo("VICTORY")}
            onXP={addXP}
          />
        )}
        {gameState === "VICTORY" && (
          <VictoryScreenLesson2 xpEarned={xpEarned} onCollect={() => transitionTo("COMPLETE")} />
        )}
      </div>
    </div>
  );
}
