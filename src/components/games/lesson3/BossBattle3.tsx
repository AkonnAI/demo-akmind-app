"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DialogueBox from "./DialogueBox";
import type { GameData, PlayerMode } from "./gameTypes";
import { useSoundEngine } from "./useSoundEngine";

interface Props {
  gameData: GameData;
  onUpdateGameData: (u: Partial<GameData>) => void;
  onComplete: () => void;
  onXP: (n: number) => void;
  onModeChange?: (m: PlayerMode) => void;
}

const GRAVITY = 0.55;
const JUMP_VY = -12.5;
const AX_SPD = 3.6;
const PROJ_SPD = 10;
const AX_W = 44;
const AX_H = 64;
const BOSS_W = 100;
const BOSS_H = 140;
const BOSS_PHASE1_HP = 9;

type Phase = 1 | 2 | 3;

interface PBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromBoss: boolean;
  warm: boolean;
  dead: boolean;
  r: number;
}

interface FloatingText {
  x: number;
  y: number;
  life: number;
  text: string;
  dy: number;
}

function drawEyeX(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stroke: string
) {
  const h = size / 2;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - h, cy - h);
  ctx.lineTo(cx + h, cy + h);
  ctx.moveTo(cx + h, cy - h);
  ctx.lineTo(cx - h, cy + h);
  ctx.stroke();
}

export default function BossBattle3({
  gameData,
  onUpdateGameData,
  onComplete,
  onXP,
  onModeChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<PlayerMode>("ai");
  const [phase, setPhase] = useState<Phase>(1);
  const phaseRef = useRef<Phase>(1);
  phaseRef.current = phase;

  const [briefCountdown, setBriefCountdown] = useState(5);
  const [showBriefing, setShowBriefing] = useState(true);
  const showBriefingRef = useRef(true);
  showBriefingRef.current = showBriefing;

  const [phaseBanner, setPhaseBanner] = useState<null | "p2" | "p3">(null);
  const phaseBannerRef = useRef<null | "p2" | "p3">(null);
  phaseBannerRef.current = phaseBanner;

  const [hitFlash, setHitFlash] = useState(false);
  const [wrongHitMsg, setWrongHitMsg] = useState<string | null>(null);
  const wrongHitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const axRef = useRef({
    x: 80,
    y: 300,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    inv: 0,
  });
  const bossRef = useRef({
    x: 400,
    y: 200,
    hp: BOSS_PHASE1_HP,
    maxHp: BOSS_PHASE1_HP,
    hit: 0,
    leftHp: 6,
    rightHp: 6,
    split: false,
    mergedHp: 12,
  });
  const projRef = useRef<PBullet[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const keysRef = useRef(new Set<string>());
  const fireTRef = useRef(0);
  const shootNRef = useRef(0);
  const shootCdRef = useRef(0);
  const flagsRef = useRef({ win: false, lose: false });
  const floorYRef = useRef(400);
  const rafRef = useRef(0);
  const playerHpRef = useRef(gameData.health);
  const [playerHpPct, setPlayerHpPct] = useState(gameData.health / 100);
  const [bossPct, setBossPct] = useState(1);
  const [novaLine, setNovaLine] = useState<string | null>(null);
  const [winOpen, setWinOpen] = useState(false);
  const [loseOpen, setLoseOpen] = useState(false);
  const [invert, setInvert] = useState(false);

  const wrongHitFbRef = useRef<(msg: string) => void>(() => {});

  const { playSound } = useSoundEngine();

  useEffect(() => {
    flagsRef.current = { win: winOpen, lose: loseOpen };
  }, [winOpen, loseOpen]);

  useEffect(() => {
    if (!showBriefing) return;
    if (briefCountdown <= 0) {
      setShowBriefing(false);
      return;
    }
    const t = setTimeout(() => setBriefCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showBriefing, briefCountdown]);

  const applyMode = useCallback(
    (m: PlayerMode) => {
      modeRef.current = m;
      onModeChange?.(m);
    },
    [onModeChange]
  );

  const showWrongHitFeedback = useCallback((msg: string) => {
    if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current);
    if (wrongHitTimerRef.current) clearTimeout(wrongHitTimerRef.current);
    setHitFlash(true);
    hitFlashTimerRef.current = setTimeout(() => setHitFlash(false), 300);
    setWrongHitMsg(msg);
    wrongHitTimerRef.current = setTimeout(() => setWrongHitMsg(null), 1500);
  }, []);

  wrongHitFbRef.current = showWrongHitFeedback;

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      if (e.code === "KeyH") {
        e.preventDefault();
        applyMode("human");
      }
      if (e.code === "KeyA") {
        e.preventDefault();
        applyMode("ai");
      }
      keysRef.current.add(e.code);
    };
    const u = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, [applyMode]);

  const damagePlayer = useCallback(
    (n: number) => {
      const h = Math.max(0, playerHpRef.current - n);
      playerHpRef.current = h;
      setPlayerHpPct(h / 100);
      onUpdateGameData({ health: h });
      axRef.current.inv = 40;
      try {
        playSound("wrong");
      } catch {
        /* silent */
      }
      if (h <= 0) {
        flagsRef.current.lose = true;
        setLoseOpen(true);
      }
    },
    [onUpdateGameData, playSound]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      const W = Math.max(640, r?.width ?? 800);
      const H = Math.max(400, r?.height ?? 500);
      canvas.width = W;
      canvas.height = H;
      const floor = H * 0.78;
      floorYRef.current = floor;
      axRef.current.y = floor - AX_H;
      axRef.current.x = W * 0.3;
      bossRef.current.x = W / 2 - BOSS_W / 2;
      bossRef.current.y = floor - BOSS_H;
    };
    resize();
    window.addEventListener("resize", resize);

    let fr = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      fr++;
      const W = canvas.width;
      const H = canvas.height;
      const floor = floorYRef.current;
      const ax = axRef.current;
      const b = bossRef.current;
      const keys = keysRef.current;
      const ph = phaseRef.current;
      const modeNow = modeRef.current;
      const briefingOn = showBriefingRef.current;
      const bannerOn = phaseBannerRef.current;

      if (ph === 3 && fr % 110 === 0 && !briefingOn && !bannerOn) {
        setInvert(true);
        setTimeout(() => setInvert(false), 220);
      }

      ctx.save();
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#2a0a0a");
      sky.addColorStop(0.5, "#1a0a2a");
      sky.addColorStop(1, "#0a0a1a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const mid = W / 2;
      ctx.strokeStyle = "rgba(168,85,247,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mid, 0);
      ctx.lineTo(mid, floor);
      ctx.stroke();

      ctx.fillStyle = "#0c0c14";
      ctx.fillRect(0, floor, W, H - floor);

      const fg = flagsRef.current;
      const pausedForUi = briefingOn || bannerOn;

      if (!fg.win && !fg.lose && !pausedForUi) {
        if (shootCdRef.current > 0) shootCdRef.current--;
        ax.vx = 0;
        if (keys.has("ArrowLeft")) {
          ax.vx = -AX_SPD;
          ax.facing = -1;
        }
        if (keys.has("ArrowRight")) {
          ax.vx = AX_SPD;
          ax.facing = 1;
        }
        if ((keys.has("ArrowUp") || keys.has("Space")) && ax.onGround) {
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
        ax.x = Math.max(16, Math.min(W - AX_W - 16, ax.x));
        if (ax.inv > 0) ax.inv--;

        fireTRef.current++;
        if (ph === 1 && b.hp > 0 && fireTRef.current % 55 === 0) {
          const warm = (fireTRef.current / 55) % 2 === 0;
          const bx = b.x + BOSS_W / 2;
          const by = b.y + BOSS_H * 0.35;
          const dx = ax.x + AX_W / 2 - bx;
          const dy = ax.y + AX_H / 2 - by;
          const L = Math.sqrt(dx * dx + dy * dy) || 1;
          projRef.current.push({
            x: bx,
            y: by,
            vx: (dx / L) * 4.2,
            vy: (dy / L) * 4.2,
            fromBoss: true,
            warm,
            dead: false,
            r: 10,
          });
        }

        if (ph === 2 && b.split) {
          if (fireTRef.current % 40 === 0) {
            projRef.current.push({
              x: W * 0.22,
              y: floor - 120,
              vx: 4,
              vy: 0,
              fromBoss: true,
              warm: true,
              dead: false,
              r: 10,
            });
          }
          if (fireTRef.current % 40 === 20) {
            projRef.current.push({
              x: W * 0.78,
              y: floor - 120,
              vx: -4,
              vy: 0,
              fromBoss: true,
              warm: false,
              dead: false,
              r: 10,
            });
          }
        }

        if (ph === 3 && b.mergedHp > 0 && fireTRef.current % 35 === 0) {
          const bx = b.x + BOSS_W / 2;
          const by = b.y + BOSS_H * 0.3;
          projRef.current.push({
            x: bx,
            y: by,
            vx: -5,
            vy: 0.5,
            fromBoss: true,
            warm: true,
            dead: false,
            r: 10,
          });
          projRef.current.push({
            x: bx,
            y: by + 20,
            vx: -5,
            vy: -0.5,
            fromBoss: true,
            warm: false,
            dead: false,
            r: 10,
          });
          if (fr % 200 === 0) {
            setNovaLine("AX — you are both! Use everything!");
            setTimeout(() => setNovaLine(null), 2500);
          }
        }

        if (keys.has("KeyZ") && shootCdRef.current <= 0) {
          shootCdRef.current = 14;
          shootNRef.current += 1;
          projRef.current.push({
            x: ax.x + (ax.facing > 0 ? AX_W : 0),
            y: ax.y + AX_H / 2,
            vx: PROJ_SPD * ax.facing,
            vy: 0,
            fromBoss: false,
            warm: modeNow === "human",
            dead: false,
            r: 5,
          });
          try {
            playSound("shoot");
          } catch {
            /* silent */
          }
        }

        const axCx = ax.x + AX_W / 2;
        const axCy = ax.y + AX_H / 2;

        for (const p of projRef.current) {
          if (p.dead) continue;
          p.x += p.vx;
          p.y += p.vy;
          if (p.fromBoss) {
            const pr = p.r;
            const dist = Math.hypot(p.x - axCx, p.y - axCy);
            if (ax.inv === 0 && dist < pr + Math.min(AX_W, AX_H) * 0.35) {
              let hits = true;
              if (p.warm && modeNow === "human") hits = false;
              if (!p.warm && modeNow === "ai") hits = false;
              p.dead = true;
              if (hits) {
                if (p.warm) {
                  wrongHitFbRef.current("SWITCH TO HUMAN MODE! (H key)");
                } else {
                  wrongHitFbRef.current("SWITCH TO AI MODE! (A key)");
                }
                damagePlayer(11);
              } else {
                floatTextsRef.current.push({
                  x: ax.x + AX_W / 2,
                  y: ax.y - 8,
                  life: 42,
                  text: "+dodge!",
                  dy: -1.2,
                });
              }
            }
          } else {
            if (ph === 1 && b.hp > 0) {
              if (
                p.x > b.x &&
                p.x < b.x + BOSS_W &&
                p.y > b.y &&
                p.y < b.y + BOSS_H
              ) {
                p.dead = true;
                b.hp -= 1;
                b.hit = 12;
                onXP(35);
                try {
                  playSound("bossHit");
                } catch {
                  /* silent */
                }
                if (b.hp <= 0) {
                  b.split = true;
                  b.leftHp = 6;
                  b.rightHp = 6;
                  phaseRef.current = 2;
                  setPhase(2);
                  setPhaseBanner("p2");
                  setTimeout(() => setPhaseBanner(null), 3000);
                }
              }
            } else if (ph === 2 && b.split) {
              const lx = W * 0.08;
              const rx = W * 0.72;
              const bh = BOSS_H * 0.85;
              let hit = false;
              if (
                b.leftHp > 0 &&
                p.x > lx &&
                p.x < lx + BOSS_W * 0.45 &&
                p.y > floor - bh - 20 &&
                p.y < floor - 20 &&
                modeNow === "human"
              ) {
                b.leftHp -= 1;
                hit = true;
              }
              if (
                b.rightHp > 0 &&
                p.x > rx &&
                p.x < rx + BOSS_W * 0.45 &&
                p.y > floor - bh - 20 &&
                p.y < floor - 20 &&
                modeNow === "ai"
              ) {
                b.rightHp -= 1;
                hit = true;
              }
              if (hit) {
                p.dead = true;
                b.hit = 10;
                onXP(40);
                try {
                  playSound("bossHit");
                } catch {
                  /* silent */
                }
                if (b.leftHp <= 0 && b.rightHp <= 0) {
                  b.mergedHp = 12;
                  b.split = false;
                  b.x = mid - BOSS_W / 2;
                  b.y = floor - BOSS_H - 10;
                  phaseRef.current = 3;
                  setPhase(3);
                  try {
                    playSound("gateOpen");
                  } catch {
                    /* silent */
                  }
                  setPhaseBanner("p3");
                  setTimeout(() => setPhaseBanner(null), 3000);
                  setNovaLine("Final merge — alternate every instinct!");
                  setTimeout(() => setNovaLine(null), 2800);
                }
              }
            } else if (ph === 3 && b.mergedHp > 0) {
              if (
                p.x > b.x &&
                p.x < b.x + BOSS_W &&
                p.y > b.y &&
                p.y < b.y + BOSS_H
              ) {
                const n = shootNRef.current;
                const needH = n % 3 === 0;
                const ok =
                  (needH && modeNow === "human") || (!needH && modeNow === "ai");
                p.dead = true;
                if (ok) {
                  b.mergedHp -= 1;
                  b.hit = 14;
                  onXP(45);
                  try {
                    playSound("bossHit");
                  } catch {
                    /* silent */
                  }
                  if (b.mergedHp <= 0) {
                    try {
                      playSound("victory");
                    } catch {
                      /* silent */
                    }
                    flagsRef.current.win = true;
                    setWinOpen(true);
                  }
                }
              }
            }
          }
        }
        projRef.current = projRef.current.filter(
          (p) => !p.dead && p.x > -30 && p.x < W + 30
        );

        const ft = floatTextsRef.current;
        for (const t of ft) {
          t.life--;
          t.y += t.dy;
        }
        floatTextsRef.current = ft.filter((t) => t.life > 0);

        const totalBoss =
          ph === 1 ? b.hp : ph === 2 ? b.leftHp + b.rightHp : b.mergedHp;
        const maxB = ph === 1 ? BOSS_PHASE1_HP : ph === 2 ? 12 : 12;
        setBossPct(Math.max(0, totalBoss / maxB));
      }

      if (b.hit > 0) b.hit--;

      const drawBossP1P3 = (bx: number, by: number) => {
        ctx.fillStyle = "#c2410c";
        ctx.fillRect(bx, by, BOSS_W / 2, BOSS_H);
        ctx.fillStyle = "#0e7490";
        ctx.fillRect(bx + BOSS_W / 2, by, BOSS_W / 2, BOSS_H);
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx + BOSS_W / 2, by);
        ctx.lineTo(bx + BOSS_W / 2, by + BOSS_H);
        ctx.stroke();
        drawEyeX(ctx, bx + 20, by + 20, 16, "#ef4444");
        drawEyeX(ctx, bx + 64, by + 20, 16, "#22d3ee");
        const hpFrac =
          ph === 1 ? b.hp / b.maxHp : ph === 3 ? b.mergedHp / 12 : 1;
        const barW = BOSS_W + 20;
        const hpW = Math.max(0, hpFrac * barW);
        let fill = "#22c55e";
        if (hpFrac < 0.33) fill = "#ef4444";
        else if (hpFrac < 0.55) fill = "#f59e0b";
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(bx - 10, by - 24, barW, 12);
        ctx.fillStyle = fill;
        ctx.fillRect(bx - 10, by - 24, hpW, 12);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.fillText("THE DIVIDE KEEPER", bx - 10, by - 30);
        if (b.hit > 0) {
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(bx, by, BOSS_W, BOSS_H);
        }
      };

      if (ph === 1 || ph === 3) {
        drawBossP1P3(b.x, b.y);
      } else if (ph === 2 && b.split) {
        const bh = BOSS_H * 0.85;
        const ly = floor - bh - 20;
        const ry = floor - bh - 20;
        ctx.fillStyle = "#c2410c";
        ctx.fillRect(W * 0.08, ly, BOSS_W * 0.42, bh);
        ctx.fillStyle = "#0e7490";
        ctx.fillRect(W * 0.72, ry, BOSS_W * 0.42, bh);
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 3;
        ctx.strokeRect(W * 0.08, ly, BOSS_W * 0.42, bh);
        ctx.strokeRect(W * 0.72, ry, BOSS_W * 0.42, bh);
        drawEyeX(ctx, W * 0.08 + 34, ly + 28, 16, "#ef4444");
        drawEyeX(ctx, W * 0.72 + 34, ry + 28, 16, "#22d3ee");
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LEFT · H", W * 0.08 + 6, ly - 8);
        ctx.fillText("RIGHT · A", W * 0.72 + 6, ry - 8);
        ctx.font = "9px monospace";
        ctx.fillText(`L ${b.leftHp}`, W * 0.08 + 4, ly + bh + 14);
        ctx.fillText(`R ${b.rightHp}`, W * 0.72 + 4, ry + bh + 14);
      }

      const vis = ax.inv === 0 || fr % 6 < 3;
      if (vis) {
        ctx.save();
        ctx.shadowColor = modeNow === "human" ? "#f97316" : "#22d3ee";
        ctx.shadowBlur = 10;
        ctx.fillStyle = modeNow === "human" ? "#9a3412" : "#1e3a5f";
        ctx.fillRect(ax.x, ax.y, AX_W, AX_H);
        ctx.fillStyle = modeNow === "human" ? "#fdba74" : "#38bdf8";
        ctx.fillRect(ax.x + (ax.facing > 0 ? 18 : 8), ax.y + 10, 12, 6);
        ctx.restore();
      }

      for (const p of projRef.current) {
        if (p.dead) continue;
        const isBoss = p.fromBoss;
        const R = isBoss ? 10 : p.r;
        ctx.save();
        if (isBoss) {
          ctx.shadowColor = p.warm ? "#f97316" : "#22d3ee";
          ctx.shadowBlur = 15;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
        ctx.fillStyle = p.warm ? "#f97316" : "#22d3ee";
        ctx.fill();
        ctx.shadowBlur = 0;
        if (isBoss) {
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (p.warm) {
            ctx.fillStyle = "#ffffff";
            ctx.fillText("H", p.x, p.y + 1);
          } else {
            ctx.fillStyle = "#000000";
            ctx.fillText("A", p.x, p.y + 1);
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
        ctx.restore();
      }

      for (const t of floatTextsRef.current) {
        ctx.save();
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#4ade80";
        ctx.textAlign = "center";
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      }

      ctx.fillStyle =
        modeNow === "human"
          ? "rgba(249,115,22,0.9)"
          : "rgba(34,211,238,0.9)";
      const pillR = 8;
      const pillW = 120;
      const pillH = 24;
      const pillX = W / 2 - pillW / 2;
      const pillY = H - 36;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        modeNow === "human" ? "HUMAN MODE (H)" : "AI MODE  (A)",
        W / 2,
        H - 20
      );
      ctx.textAlign = "left";

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      if (wrongHitTimerRef.current) clearTimeout(wrongHitTimerRef.current);
      if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current);
    };
  }, [damagePlayer, onXP, playSound]);

  const bossHpBlocks = "█".repeat(BOSS_PHASE1_HP);
  const briefCountDisplay = briefCountdown > 0 ? briefCountdown : 1;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#050510",
        filter: invert ? "invert(1) hue-rotate(180deg)" : "none",
        transition: "filter 0.15s",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {showBriefing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 520 }}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "#facc15",
              }}
            >
              ⚔️ BOSS BATTLE
            </div>
            <div style={{ fontSize: 20, color: "#fff", marginTop: 8 }}>THE DIVIDE KEEPER</div>
            <div
              style={{
                height: 2,
                background: "linear-gradient(90deg, transparent, #a855f7, transparent)",
                margin: "16px auto",
                maxWidth: 360,
              }}
            />
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: 24,
                marginTop: 16,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#22d3ee",
                  marginBottom: 12,
                }}
              >
                HOW TO FIGHT:
              </div>
              <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.65 }}>
                <div>← → Move left and right</div>
                <div>Space = Jump</div>
                <div>Z = Shoot at the boss</div>
                <div>H key = Switch to Human Mode 🟠</div>
                <div>A key = Switch to AI Mode 🔵</div>
                <div style={{ marginTop: 8 }} />
                <div style={{ fontWeight: 700 }}>⚠️ IMPORTANT:</div>
                <div>Orange projectiles → press H before they hit</div>
                <div>Blue projectiles → press A before they hit</div>
                <div>Shoot the boss when NOT being hit</div>
              </div>
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                color: "#e2e8f0",
                marginTop: 20,
              }}
            >
              Boss HP:{" "}
              <span style={{ color: "#22c55e" }}>{bossHpBlocks}</span>{" "}
              {BOSS_PHASE1_HP}/{BOSS_PHASE1_HP}
            </div>
            <div style={{ fontSize: 16, color: "#facc15", marginTop: 16, fontWeight: 600 }}>
              Starting in {briefCountDisplay}...
            </div>
          </div>
        </div>
      )}

      {phaseBanner === "p2" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(88,28,135,0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 900, color: "#facc15" }}>⚡ PHASE 2</div>
          <div style={{ fontSize: 20, color: "#fff", marginTop: 16 }}>The Divide Keeper SPLITS!</div>
          <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 8 }}>
            Fight BOTH halves separately!
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 8, lineHeight: 1.6 }}>
            <div>Left half → Human Mode (H)</div>
            <div>Right half → AI Mode (A)</div>
          </div>
        </div>
      )}

      {phaseBanner === "p3" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(88,28,135,0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 900, color: "#f87171" }}>⚡ FINAL PHASE</div>
          <div style={{ fontSize: 20, color: "#fff", marginTop: 16 }}>
            They&apos;ve MERGED — stronger than ever!
          </div>
          <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 8 }}>Alternate H and A rapidly!</div>
        </div>
      )}

      {hitFlash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 45,
            backgroundColor: "rgba(239,68,68,0.3)",
            pointerEvents: "none",
          }}
        />
      )}

      {wrongHitMsg && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            zIndex: 46,
            color: "#ef4444",
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "monospace",
            textAlign: "center",
            textShadow: "0 0 16px #7f1d1d",
            maxWidth: 480,
            padding: 16,
            pointerEvents: "none",
            transition: "opacity 0.35s ease",
          }}
        >
          {wrongHitMsg}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 52,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "space-between",
          pointerEvents: "none",
          fontFamily: "monospace",
          fontSize: 10,
          color: "#94a3b8",
        }}
      >
        <span>YOU {Math.ceil(playerHpPct * 100)}</span>
        <span>
          KEEPER {phase}/3 · {Math.ceil(bossPct * 100)}%
        </span>
      </div>

      {novaLine && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid #fbbf24",
            color: "#fef3c7",
            padding: "8px 14px",
            fontFamily: "monospace",
            fontSize: 11,
            maxWidth: 400,
            textAlign: "center",
            zIndex: 20,
          }}
        >
          NOVA: {novaLine}
        </div>
      )}

      {winOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 40,
            zIndex: 50,
          }}
        >
          <DialogueBox
            character="NOVA"
            text="The Divide Keeper falls — polarity stabilizes. You proved both halves belong in one city."
            onComplete={() => onComplete()}
          />
        </motion.div>
      )}

      {loseOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(20,5,5,0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            gap: 16,
          }}
        >
          <p style={{ color: "#fecaca", fontFamily: "monospace", fontSize: 16 }}>Signal lost…</p>
          <button
            type="button"
            onClick={() => {
              flagsRef.current.lose = false;
              setLoseOpen(false);
              playerHpRef.current = 75;
              setPlayerHpPct(0.75);
              onUpdateGameData({ health: 75 });
              const c = canvasRef.current;
              const W = c?.width ?? 800;
              const floor = floorYRef.current;
              bossRef.current = {
                x: W / 2 - BOSS_W / 2,
                y: floor - BOSS_H,
                hp: BOSS_PHASE1_HP,
                maxHp: BOSS_PHASE1_HP,
                hit: 0,
                leftHp: 6,
                rightHp: 6,
                split: false,
                mergedHp: 12,
              };
              axRef.current.x = W * 0.3;
              axRef.current.y = floor - AX_H;
              phaseRef.current = 1;
              setPhase(1);
              projRef.current = [];
              floatTextsRef.current = [];
              shootNRef.current = 0;
              setBriefCountdown(5);
              setShowBriefing(true);
            }}
            style={{
              padding: "12px 24px",
              background: "#ea580c",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Re-link & retry
          </button>
        </div>
      )}
    </div>
  );
}
