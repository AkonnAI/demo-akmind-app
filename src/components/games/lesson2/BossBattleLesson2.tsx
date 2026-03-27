"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DialogueBox from "./DialogueBox";
import type { GameData } from "./gameTypes";
import { useSoundEngine } from "./useSoundEngine";

interface Props {
  gameData: GameData;
  onUpdateGameData: (u: Partial<GameData>) => void;
  onComplete: () => void;
  onXP: (n: number) => void;
}

const GRAVITY = 0.55;
const JUMP_VY = -13;
const AX_SPD = 3.8;
const PROJ_SPD = 11;
const AX_W = 28;
const AX_H = 42;
const BOSS_W = 92;
const BOSS_H = 118;
const PROJ_R = 6;

type Quiz = {
  prompt: string;
  options: [string, string, string];
  correct: 0 | 1 | 2;
};

const QUIZ_BY_PHASE: Record<1 | 2 | 3, Quiz> = {
  1: {
    prompt: "What year was AI officially named?",
    options: ["1950", "1956", "1960"],
    correct: 1,
  },
  2: {
    prompt: "Who beat Kasparov at chess?",
    options: ["IBM Deep Blue", "Google AlphaGo", "ChatGPT"],
    correct: 0,
  },
  3: {
    prompt: "ChatGPT reached 100M users in…",
    options: ["6 months", "60 days", "1 year"],
    correct: 1,
  },
};

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromBoss: boolean;
  dead: boolean;
  r: number;
}

export default function BossBattleLesson2({
  gameData,
  onUpdateGameData,
  onComplete,
  onXP,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef(0);

  const axRef = useRef({
    x: 80,
    y: 0,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    invTimer: 0,
  });
  const bossRef = useRef({
    x: 0,
    y: 0,
    hp: 9,
    maxHp: 9,
    phase: 1 as 1 | 2 | 3,
    fireTimer: 0,
    fireInterval: 200,
    hitTimer: 0,
    defeated: false,
    defeatTimer: 0,
  });
  const projRef = useRef<Projectile[]>([]);
  const floorYRef = useRef(400);
  const playerHpRef = useRef(gameData.health);
  const modeRef = useRef<"fight" | "win" | "lose">("fight");

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [bossHpPct, setBossHpPct] = useState(1);
  const [playerHpPct, setPlayerHpPct] = useState(1);
  const [overlayWin, setOverlayWin] = useState(false);
  const [loseOverlay, setLoseOverlay] = useState(false);
  const [dialogueDone, setDialogueDone] = useState(false);
  const [taunt, setTaunt] = useState<{ char: string; text: string } | null>(null);
  const taunt2TriggeredRef = useRef(false);
  const taunt3TriggeredRef = useRef(false);
  const tauntTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playSound } = useSoundEngine();

  const showTaunt = useCallback((char: string, text: string) => {
    setTaunt({ char, text });
    if (tauntTimerRef.current) clearTimeout(tauntTimerRef.current);
    tauntTimerRef.current = setTimeout(() => setTaunt(null), 4000);
  }, []);

  // Start taunt on mount
  useEffect(() => {
    const showT = showTaunt;
    const t = setTimeout(() => {
      showT("CHAOS_BOT", "You think HISTORY matters?! I AM THE FUTURE! And the future has no memory!");
    }, 800);
    return () => {
      clearTimeout(t);
      if (tauntTimerRef.current) clearTimeout(tauntTimerRef.current);
    };
  }, [showTaunt]);

  const axShoot = useCallback(() => {
    const ax = axRef.current;
    if (modeRef.current !== "fight") return;
    projRef.current.push({
      x: ax.x + (ax.facing > 0 ? AX_W : 0),
      y: ax.y + AX_H / 2,
      vx: PROJ_SPD * ax.facing,
      vy: 0,
      fromBoss: false,
      dead: false,
      r: PROJ_R,
    });
    try {
      playSound("shoot");
    } catch {
      /* silent */
    }
  }, [playSound]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if ((e.code === "KeyZ" || e.code === "ControlLeft") && !e.repeat && !quiz) {
        axShoot();
      }
      if (!quiz) return;
      let choice: 0 | 1 | 2 | null = null;
      if (e.code === "Digit1") choice = 0;
      if (e.code === "Digit2") choice = 1;
      if (e.code === "Digit3") choice = 2;
      if (choice === null) return;
      e.preventDefault();
      const q = QUIZ_BY_PHASE[bossRef.current.phase];
      if (choice === q.correct) {
        bossRef.current.hp -= 1;
        bossRef.current.hitTimer = 18;
        try {
          playSound("bossHit");
        } catch {
          /* silent */
        }
        onXP(55);
        projRef.current.push({
          x: axRef.current.x + AX_W,
          y: axRef.current.y + AX_H / 2,
          vx: PROJ_SPD,
          vy: 0,
          fromBoss: false,
          dead: false,
          r: PROJ_R + 1,
        });
        if (bossRef.current.hp <= 6 && bossRef.current.phase === 1) {
          bossRef.current.phase = 2;
          bossRef.current.fireInterval = 160;
          try {
            playSound("gateOpen");
          } catch {
            /* silent */
          }
          if (!taunt2TriggeredRef.current) {
            taunt2TriggeredRef.current = true;
            showTaunt("CHAOS_BOT", "Impossible! You actually remember these dates?! Let me make you FORGET!");
          }
        } else if (bossRef.current.hp <= 3 && bossRef.current.phase === 2) {
          bossRef.current.phase = 3;
          bossRef.current.fireInterval = 130;
          try {
            playSound("gateOpen");
          } catch {
            /* silent */
          }
          if (!taunt3TriggeredRef.current) {
            taunt3TriggeredRef.current = true;
            showTaunt("CHAOS_BOT", "STOP! If you restore history... everyone will know I was just a buggy prototype! PLEASE!");
          }
        }
        if (bossRef.current.hp <= 0) {
          bossRef.current.defeated = true;
          bossRef.current.hp = 0;
          try {
            playSound("victory");
          } catch {
            /* silent */
          }
          modeRef.current = "win";
          setOverlayWin(true);
        }
        setBossHpPct(Math.max(0, bossRef.current.hp / bossRef.current.maxHp));
      } else {
        playerHpRef.current = Math.max(0, playerHpRef.current - 18);
        setPlayerHpPct(playerHpRef.current / 100);
        axRef.current.invTimer = 60;
        try {
          playSound("wrong");
        } catch {
          /* silent */
        }
        if (playerHpRef.current <= 0) {
          modeRef.current = "lose";
          setLoseOverlay(true);
          onUpdateGameData({ health: 0 });
        }
      }
      bossRef.current.fireTimer = 0;
      setQuiz(null);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [axShoot, onUpdateGameData, onXP, playSound, quiz, showTaunt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      if (r) {
        canvas.width = r.width || 800;
        canvas.height = r.height || 500;
      }
      floorYRef.current = canvas.height * 0.78;
      const floor = floorYRef.current;
      axRef.current.y = floor - AX_H;
      bossRef.current.x = canvas.width - BOSS_W - 50;
      bossRef.current.y = floor - BOSS_H;
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frame++;
      const W = canvas.width;
      const H = canvas.height;
      const floor = floorYRef.current;
      const ax = axRef.current;
      const boss = bossRef.current;
      const keys = keysRef.current;

      ctx.save();
      ctx.fillStyle = "linear-gradient(180deg,#1a0a00,#0d0d24)";
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "#1a0a00");
      grd.addColorStop(1, "#0d0d24");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Floor
      ctx.fillStyle = "#120804";
      ctx.fillRect(0, floor, W, H - floor);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floor);
      ctx.lineTo(W, floor);
      ctx.stroke();

      if (modeRef.current === "fight" && !quiz) {
        ax.vx = 0;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) {
          ax.vx = -AX_SPD;
          ax.facing = -1;
        }
        if (keys.has("ArrowRight") || keys.has("KeyD")) {
          ax.vx = AX_SPD;
          ax.facing = 1;
        }
        if (
          (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space")) &&
          ax.onGround
        ) {
          ax.vy = JUMP_VY;
          ax.onGround = false;
        }
        ax.vy += GRAVITY;
        ax.x += ax.vx;
        ax.y += ax.vy;
        if (ax.y + AX_H >= floor) {
          ax.y = floor - AX_H;
          ax.vy = 0;
          ax.onGround = true;
        }
        ax.x = Math.max(12, Math.min(W - AX_W - 12, ax.x));
        if (ax.invTimer > 0) ax.invTimer--;

        boss.fireTimer++;
        if (!boss.defeated && boss.fireTimer >= boss.fireInterval) {
          boss.fireTimer = 0;
          setQuiz(QUIZ_BY_PHASE[boss.phase]);
        }

        for (const p of projRef.current) {
          if (p.dead) continue;
          p.x += p.vx;
          p.y += p.vy;
          if (p.fromBoss) {
            if (
              ax.invTimer === 0 &&
              p.x > ax.x &&
              p.x < ax.x + AX_W &&
              p.y > ax.y &&
              p.y < ax.y + AX_H
            ) {
              p.dead = true;
              playerHpRef.current = Math.max(0, playerHpRef.current - 12);
              setPlayerHpPct(playerHpRef.current / 100);
              ax.invTimer = 45;
              try {
                playSound("wrong");
              } catch {
                /* silent */
              }
              if (playerHpRef.current <= 0) {
                modeRef.current = "lose";
                setLoseOverlay(true);
                onUpdateGameData({ health: 0 });
              }
            }
          } else {
            if (
              !boss.defeated &&
              p.x > boss.x &&
              p.x < boss.x + BOSS_W &&
              p.y > boss.y &&
              p.y < boss.y + BOSS_H
            ) {
              p.dead = true;
              boss.hp -= 1;
              boss.hitTimer = 14;
              try {
                playSound("bossHit");
              } catch {
                /* silent */
              }
              onXP(40);
              setBossHpPct(Math.max(0, boss.hp / boss.maxHp));
              if (boss.hp <= 0) {
                boss.defeated = true;
                modeRef.current = "win";
                setOverlayWin(true);
                try {
                  playSound("victory");
                } catch {
                  /* silent */
                }
              }
            }
          }
        }
        projRef.current = projRef.current.filter(
          (p) => !p.dead && p.x > -40 && p.x < W + 40
        );

        if (!boss.defeated && !quiz) {
          if (frame % 95 === 0) {
            projRef.current.push({
              x: boss.x,
              y: boss.y + BOSS_H * 0.35,
              vx: -6 - Math.random() * 2,
              vy: Math.sin(frame / 30) * 2,
              fromBoss: true,
              dead: false,
              r: PROJ_R,
            });
          }
        }
      }

      if (boss.hitTimer > 0) boss.hitTimer--;

      // Boss body — Time Corruptor (amber) + clock hands
      const bx = boss.x;
      const by = boss.y;
      ctx.fillStyle = boss.hitTimer > 0 ? "#fde68a" : "#78350f";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.fillRect(bx, by, BOSS_W, BOSS_H);
      ctx.strokeRect(bx, by, BOSS_W, BOSS_H);

      const cx = bx + BOSS_W / 2;
      const cy = by + BOSS_H * 0.42;
      const ang = frame * 0.04;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = "#451a03";
      ctx.fillRect(-6, -32, 12, 32);
      ctx.rotate(-ang * 1.7);
      ctx.fillRect(-6, -22, 12, 22);
      ctx.restore();

      ctx.fillStyle = "#fef3c7";
      ctx.font = "bold 10px monospace";
      ctx.fillText("TIME CORRUPTOR", bx + 6, by - 8);

      // AX
      const vis = ax.invTimer === 0 || frame % 6 < 3;
      if (vis) {
        ctx.fillStyle = "#1e3a5f";
        ctx.fillRect(ax.x, ax.y, AX_W, AX_H);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(ax.x + (ax.facing > 0 ? 12 : 4), ax.y + 8, 12, 6);
      }

      for (const p of projRef.current) {
        if (p.dead) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.fromBoss ? "#fb7185" : "#38bdf8";
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(251,191,36,0.25)";
      for (let gx = 0; gx < W; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, floor);
        ctx.stroke();
      }

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [onComplete, onUpdateGameData, onXP, playSound, quiz]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0d0d24",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {/* Taunt banner */}
      <AnimatePresence>
        {taunt && (
          <motion.div
            key={taunt.text}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(10,4,2,0.92)",
              border: "1px solid #ef4444",
              borderRadius: 12,
              padding: "10px 20px",
              maxWidth: 480,
              zIndex: 60,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>
              {taunt.char}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#fef2f2" }}>
              {taunt.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: "absolute",
          top: 56,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#fecaca" }}>
          BOSS {Math.ceil(bossHpPct * 9)}/9
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#bbf7d0" }}>
          HP {Math.round(playerHpPct * 100)}
        </div>
      </div>

      <AnimatePresence>
        {quiz && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              left: "50%",
              top: "18%",
              transform: "translateX(-50%)",
              width: "min(420px,92vw)",
              background: "rgba(12,8,6,0.95)",
              border: "2px solid #fbbf24",
              borderRadius: 16,
              padding: "14px 16px",
              zIndex: 50,
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontFamily: "monospace",
                fontSize: 14,
                color: "#fef3c7",
                fontWeight: 700,
              }}
            >
              ⏱️ {quiz.prompt}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#94a3b8" }}>
              Press 1 / 2 / 3 to answer
            </p>
            {quiz.options.map((opt, i) => (
              <div
                key={opt}
                style={{
                  marginTop: 6,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "rgba(120,53,15,0.35)",
                  border: "1px solid rgba(251,191,36,0.35)",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#fffbeb",
                }}
              >
                {i + 1}. {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {overlayWin && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 140,
            zIndex: 40,
          }}
        >
          <p style={{ fontSize: 52, margin: 0 }}>🏆</p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 900,
              color: "#fbbf24",
              margin: "10px 0 0",
            }}
          >
            TIME RESTORED!
          </p>
          {!dialogueDone ? (
            <DialogueBox
              character="NOVA"
              text="The timeline is restored! Every milestone matters — from Turing’s dream to today. History cannot be erased, AX. It can only be learned from."
              onComplete={() => setDialogueDone(true)}
            />
          ) : (
            <button
              type="button"
              onClick={onComplete}
              style={{
                marginTop: 20,
                padding: "12px 32px",
                borderRadius: 14,
                border: "none",
                fontWeight: 800,
                fontFamily: "monospace",
                cursor: "pointer",
                background: "linear-gradient(90deg,#fbbf24,#d97706)",
              }}
            >
              Continue
            </button>
          )}
        </div>
      )}

      {loseOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            zIndex: 45,
          }}
        >
          <p style={{ color: "#fecaca", fontFamily: "monospace", fontSize: 20 }}>Knocked out</p>
          <button
            type="button"
            onClick={() => {
              modeRef.current = "fight";
              setLoseOverlay(false);
              playerHpRef.current = 70;
              setPlayerHpPct(0.7);
              bossRef.current = {
                ...bossRef.current,
                hp: 9,
                defeated: false,
                phase: 1,
                fireTimer: 0,
                fireInterval: 200,
              };
              setBossHpPct(1);
              projRef.current = [];
              onUpdateGameData({ health: 70 });
            }}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              background: "#f97316",
              color: "#0a0a0a",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <button
        type="button"
        onPointerDown={axShoot}
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "2px solid #38bdf8",
          background: "rgba(56,189,248,0.15)",
          color: "#e2e8f0",
          fontSize: 20,
        }}
      >
        🔫
      </button>
    </div>
  );
}
