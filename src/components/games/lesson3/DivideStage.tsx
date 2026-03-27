"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { GameData, PlayerMode } from "./gameTypes";
import { useSoundEngine } from "./useSoundEngine";
import AXCharacter from "@/components/games/shared/AXCharacter";
import DialogueBox from "./DialogueBox";

const AX_W = 40;
const AX_H = 60;
const GRAVITY = 0.55;
const JUMP_VY = -12;
const MOVE_SPD = 3.2;
const BULLET_SPD = 10;
const FLOOR_FR = 0.72;
const ZONE_TRIGGER_PX = 60;
const ZONE_HINT_DIST_PX = 100;
const ZONE_DRAW_R = 40;
const ZONE_PULSE = 0.12;

export type ChallengeId = "h0" | "h1" | "a0" | "a1";

const ALL_ZONES: ChallengeId[] = ["h0", "h1", "a0", "a1"];

const NOVA_AFTER_ZONE: Record<ChallengeId, string> = {
  h0: "Pattern sense — classic human intuition.",
  h1: "Reading emotion — humans shine here.",
  a0: "Ordered data — AI territory.",
  a1: "Pattern lock — pure logic win.",
};

interface DivideStageProps {
  gameData: GameData;
  onUpdateGameData: (u: Partial<GameData>) => void;
  onComplete: () => void;
  onXP: (n: number) => void;
  onModeChange?: (m: PlayerMode) => void;
}

interface Plat {
  x: number;
  y: number;
  w: number;
  h: number;
  left: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  mode: PlayerMode;
  warm: boolean;
  dead: boolean;
  life: number;
}

type PostZonesPhase = "play" | "nova" | "center" | "done";

function buildPlatforms(W: number, groundTop: number): Plat[] {
  const f = (y: number) => groundTop - y;
  const mid = W / 2;
  return [
    { x: 32, y: f(0), w: 120, h: 16, left: true },
    { x: 180, y: f(70), w: 100, h: 16, left: true },
    { x: 300, y: f(130), w: 140, h: 16, left: true },
    { x: mid + 48, y: f(0), w: 130, h: 16, left: false },
    { x: mid + 220, y: f(85), w: 110, h: 16, left: false },
    { x: W - 180, y: f(140), w: 150, h: 16, left: false },
  ];
}

function drawWarmBuildings(
  ctx: CanvasRenderingContext2D,
  mid: number,
  groundTop: number
) {
  const widths = [60, 80, 50, 90, 70];
  const heights = [80, 120, 60, 100, 90];
  const colors = ["#78350f", "#92400e", "#78350f", "#92400e", "#78350f"];
  const totalW = widths.reduce((a, b) => a + b, 0);
  const pad = 14;
  const avail = Math.max(0, mid - pad * 2 - totalW);
  const gapCount = widths.length - 1;
  const gap = gapCount > 0 ? avail / gapCount : 0;
  let x = pad;
  for (let i = 0; i < widths.length; i++) {
    const h = heights[i];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, groundTop - h, widths[i], h);
    x += widths[i] + gap;
  }
}

function drawCoolBuildings(
  ctx: CanvasRenderingContext2D,
  mid: number,
  W: number,
  groundTop: number
) {
  const widths = [60, 80, 50, 90, 70];
  const heights = [80, 120, 60, 100, 90];
  const totalW = widths.reduce((a, b) => a + b, 0);
  const pad = 14;
  const rightSpan = W - mid;
  const avail = Math.max(0, rightSpan - pad * 2 - totalW);
  const gapCount = widths.length - 1;
  const gap = gapCount > 0 ? avail / gapCount : 0;
  let x = mid + pad;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i];
    const h = heights[i];
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(x, groundTop - h, w, h);
    ctx.strokeStyle = "rgba(34,211,238,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, groundTop - h, w, h);
    ctx.fillStyle = "rgba(34,211,238,0.65)";
    for (let wy = groundTop - h + 14; wy < groundTop - 12; wy += 22) {
      for (let wx = x + 10; wx + 6 < x + w; wx += 18) {
        ctx.fillRect(wx, wy, 5, 5);
      }
    }
    x += w + gap;
  }
}

export default function DivideStage({
  gameData,
  onUpdateGameData,
  onComplete,
  onXP,
  onModeChange,
}: DivideStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axWrapRef = useRef<HTMLDivElement>(null);
  const [axAnim, setAxAnim] = useState<"idle" | "walk">("idle");
  const [axFacing, setAxFacing] = useState<"left" | "right">("right");
  const lastMovingRef = useRef(false);
  const lastFacingRef = useRef<"left" | "right">("right");
  const [mode, setMode] = useState<PlayerMode>("ai");
  const modeRef = useRef<PlayerMode>("ai");
  const healthRef = useRef(gameData.health);
  const [uiHealth, setUiHealth] = useState(gameData.health);
  const [novaToast, setNovaToast] = useState<string | null>(null);
  const warnFlashRef = useRef(0);
  const zoneCooldownRef = useRef(0);

  const challengeDoneRef = useRef<Record<ChallengeId, boolean>>({
    h0: false,
    h1: false,
    a0: false,
    a1: false,
  });
  const gatesCompletedRef = useRef(0);

  const [modal, setModal] = useState<null | { kind: "challenge"; id: ChallengeId }>(null);
  const [zoneUiDone, setZoneUiDone] = useState<Record<ChallengeId, boolean>>({
    h0: false,
    h1: false,
    a0: false,
    a1: false,
  });
  const [showVictoryNova, setShowVictoryNova] = useState(false);
  const postZonesPhaseRef = useRef<PostZonesPhase>("play");
  const showCenterArrowRef = useRef(false);
  const wrongWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wrongModeMessage, setWrongModeMessage] = useState<string | null>(null);
  const wrongWarnActiveRef = useRef(false);
  const wrongFlashCooldownRef = useRef(0);

  const axRef = useRef({ x: 400, y: 300, vx: 0, vy: 0, onGround: false, facing: 1 });
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef(new Set<string>());
  const shootCdRef = useRef(0);
  const pausedRef = useRef(false);
  const lastSideRef = useRef<"L" | "R">("L");
  const rafRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { playSound } = useSoundEngine();

  const applyMode = useCallback(
    (m: PlayerMode) => {
      modeRef.current = m;
      setMode(m);
      onModeChange?.(m);
      try {
        playSound("gateOpen");
      } catch {
        /* silent */
      }
    },
    [onModeChange, playSound]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // DEV: Shift+Enter skips to end (boss handoff) for testing
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        onCompleteRef.current();
        return;
      }
      if (e.code === "KeyH" || e.key === "h" || e.key === "H") {
        e.preventDefault();
        applyMode("human");
      }
      if (e.code === "KeyA" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        applyMode("ai");
      }
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [applyMode]);

  useEffect(() => {
    healthRef.current = gameData.health;
  }, [gameData.health]);

  useEffect(() => {
    const el = axWrapRef.current;
    if (!el) return;
    el.style.filter =
      mode === "human"
        ? "drop-shadow(0 0 8px #f97316)"
        : "drop-shadow(0 0 8px #22d3ee)";
  }, [mode]);

  const damage = useCallback(
    (n: number) => {
      const h = Math.max(0, healthRef.current - n);
      healthRef.current = h;
      setUiHealth(h);
      onUpdateGameData({ health: h });
      warnFlashRef.current = 14;
      try {
        playSound("playerHit");
      } catch {
        /* silent */
      }
    },
    [onUpdateGameData, playSound]
  );

  const flashWrongMode = useCallback((needHuman: boolean) => {
    if (wrongWarnActiveRef.current) return;
    wrongWarnActiveRef.current = true;
    try {
      playSound("wrong");
    } catch {
      /* silent */
    }
    const msg = needHuman
      ? "⚠ Switch to HUMAN MODE (H key)!"
      : "⚠ Switch to AI MODE (A key)!";
    setWrongModeMessage(msg);
    if (wrongWarnTimerRef.current) clearTimeout(wrongWarnTimerRef.current);
    wrongWarnTimerRef.current = setTimeout(() => {
      setWrongModeMessage(null);
      wrongWarnActiveRef.current = false;
      wrongWarnTimerRef.current = null;
    }, 2000);
  }, [playSound]);

  const openChallenge = (id: ChallengeId) => {
    pausedRef.current = true;
    queueMicrotask(() => setModal({ kind: "challenge", id }));
  };

  const resolveChallenge = (id: ChallengeId, ok: boolean) => {
    setModal(null);
    pausedRef.current = false;
    zoneCooldownRef.current = 45;
    if (ok) {
      challengeDoneRef.current[id] = true;
      gatesCompletedRef.current += 1;
      setZoneUiDone((prev) => ({ ...prev, [id]: true }));
      onXP(45);
      setNovaToast(NOVA_AFTER_ZONE[id]);
      setTimeout(() => setNovaToast(null), 3200);
      try {
        playSound("correct");
      } catch {
        /* silent */
      }
      if (gatesCompletedRef.current >= 4) {
        postZonesPhaseRef.current = "nova";
        pausedRef.current = true;
        queueMicrotask(() => setShowVictoryNova(true));
      }
    } else {
      damage(8);
      try {
        playSound("wrong");
      } catch {
        /* silent */
      }
    }
  };

  const handleVictoryNovaComplete = useCallback(() => {
    setShowVictoryNova(false);
    setNovaToast("Amazing! Now cross to the center — face The Divide Keeper!");
    setTimeout(() => setNovaToast(null), 4500);
    postZonesPhaseRef.current = "center";
    showCenterArrowRef.current = true;
    pausedRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      const W = Math.max(640, Math.floor(r?.width ?? 800));
      const H = Math.max(420, Math.floor(r?.height ?? 520));
      canvas.width = W;
      canvas.height = H;
      const GROUND_Y = Math.floor(H * (1 - FLOOR_FR));
      const groundTop = H - GROUND_Y;
      axRef.current.x = W * 0.25;
      axRef.current.y = groundTop - AX_H;
      axRef.current.vy = 0;
      bulletsRef.current = [];
      lastSideRef.current =
        axRef.current.x + AX_W / 2 < W / 2 ? "L" : "R";
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;

    type ZoneDisc = { id: ChallengeId; cx: number; cy: number; human: boolean };

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frame++;
      const W = canvas.width;
      const H = canvas.height;
      const vpW = W;
      const vpH = H;
      const GROUND_Y = Math.floor(vpH * (1 - FLOOR_FR));
      const groundTop = vpH - GROUND_Y;
      const mid = W / 2;
      const ax = axRef.current;
      const modeNow = modeRef.current;

      const zones: ZoneDisc[] = [
        { id: "h0", cx: W * 0.16, cy: groundTop - 90, human: true },
        { id: "h1", cx: W * 0.32, cy: groundTop - 200, human: true },
        { id: "a0", cx: W * 0.62, cy: groundTop - 100, human: false },
        { id: "a1", cx: W * 0.82, cy: groundTop - 210, human: false },
      ];

      const platforms = buildPlatforms(W, groundTop);

      const grdL = ctx.createLinearGradient(0, 0, mid, 0);
      grdL.addColorStop(0, "#451a03");
      grdL.addColorStop(1, "#78350f");
      ctx.fillStyle = grdL;
      ctx.fillRect(0, 0, mid, groundTop);

      const grdR = ctx.createLinearGradient(mid, 0, W, 0);
      grdR.addColorStop(0, "#0a0a1a");
      grdR.addColorStop(1, "#0d1224");
      ctx.fillStyle = grdR;
      ctx.fillRect(mid, 0, W - mid, groundTop);

      drawWarmBuildings(ctx, mid, groundTop);
      drawCoolBuildings(ctx, mid, W, groundTop);

      const pulse = 10 + Math.sin(frame * 0.05) * 5;
      ctx.save();
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = pulse;
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mid, 0);
      ctx.lineTo(mid, groundTop);
      ctx.stroke();
      ctx.restore();
      if (showCenterArrowRef.current && postZonesPhaseRef.current === "center") {
        const ay = groundTop - 24 + Math.sin(frame * 0.08) * 10;
        ctx.save();
        ctx.fillStyle = `rgba(168,85,247,${0.65 + Math.sin(frame * 0.12) * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(mid, ay);
        ctx.lineTo(mid - 18, ay - 36);
        ctx.lineTo(mid + 18, ay - 36);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e9d5ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(mid + 8, groundTop * 0.35);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "rgba(168,85,247,0.7)";
      ctx.font = "bold 11px monospace";
      ctx.fillText("THE DIVIDE", 0, 0);
      ctx.restore();

      for (const p of platforms) {
        if (p.left) {
          ctx.fillStyle = "#92400e";
          ctx.strokeStyle = "#fbbf24";
        } else {
          ctx.fillStyle = "#1e1b4b";
          ctx.strokeStyle = "#22d3ee";
        }
        ctx.lineWidth = 2;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }

      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, vpH - GROUND_Y, vpW, GROUND_Y);
      ctx.fillStyle = "#451a03";
      ctx.fillRect(0, vpH - GROUND_Y, vpW / 2, GROUND_Y);
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(vpW / 2, vpH - GROUND_Y, vpW / 2, GROUND_Y);

      if (zoneCooldownRef.current > 0) zoneCooldownRef.current -= 1;
      if (wrongFlashCooldownRef.current > 0) wrongFlashCooldownRef.current -= 1;

      if (!pausedRef.current && postZonesPhaseRef.current !== "done") {
        const keys = keysRef.current;
        const goL = keys.has("ArrowLeft");
        const goR = keys.has("ArrowRight");
        const jump = keys.has("ArrowUp") || keys.has("Space");

        if (shootCdRef.current > 0) shootCdRef.current--;

        ax.vx = goL ? -MOVE_SPD : goR ? MOVE_SPD : 0;
        if (goL) ax.facing = -1;
        if (goR) ax.facing = 1;
        ax.vy = Math.min(ax.vy + GRAVITY, 14);
        ax.x += ax.vx;
        ax.y += ax.vy;

        ax.onGround = false;
        if (ax.y + AX_H >= groundTop) {
          ax.y = groundTop - AX_H;
          ax.vy = 0;
          ax.onGround = true;
        }
        for (const p of platforms) {
          if (
            ax.x + AX_W > p.x &&
            ax.x < p.x + p.w &&
            ax.y + AX_H >= p.y &&
            ax.y + AX_H <= p.y + p.h + 12 &&
            ax.vy >= -0.2
          ) {
            ax.y = p.y - AX_H;
            ax.vy = 0;
            ax.onGround = true;
          }
        }
        if (jump && ax.onGround) {
          ax.vy = JUMP_VY;
          ax.onGround = false;
        }
        ax.x = Math.max(8, Math.min(W - AX_W - 8, ax.x));

        const axcx = ax.x + AX_W / 2;
        const axcy = ax.y + AX_H / 2;

        const sideNow: "L" | "R" = axcx < mid ? "L" : "R";
        if (sideNow !== lastSideRef.current) {
          lastSideRef.current = sideNow;
        }

        let wrongNeedHuman: boolean | null = null;
        for (const z of zones) {
          if (challengeDoneRef.current[z.id]) continue;
          const dist = Math.hypot(axcx - z.cx, axcy - z.cy);
          if (dist > ZONE_TRIGGER_PX) continue;
          const correct = z.human ? modeNow === "human" : modeNow === "ai";
          if (!correct) {
            wrongNeedHuman = z.human;
          } else if (zoneCooldownRef.current === 0) {
            openChallenge(z.id);
          }
        }
        if (
          wrongNeedHuman !== null &&
          wrongFlashCooldownRef.current === 0
        ) {
          wrongFlashCooldownRef.current = 45;
          flashWrongMode(wrongNeedHuman);
        }

        if (keys.has("KeyZ") && shootCdRef.current <= 0) {
          shootCdRef.current = 16;
          bulletsRef.current.push({
            x: ax.x + (ax.facing > 0 ? AX_W : 0),
            y: ax.y + AX_H / 2,
            vx: BULLET_SPD * ax.facing,
            vy: 0,
            fromPlayer: true,
            mode: modeNow,
            warm: modeNow === "human",
            dead: false,
            life: 45,
          });
          try {
            playSound("shoot");
          } catch {
            /* silent */
          }
        }

        for (const b of bulletsRef.current) {
          if (b.dead) continue;
          b.x += b.vx;
          b.y += b.vy;
          b.life--;
          if (b.life <= 0) b.dead = true;
        }
        bulletsRef.current = bulletsRef.current.filter(
          (b) => !b.dead && b.x > -30 && b.x < W + 30
        );

        if (
          postZonesPhaseRef.current === "center" &&
          Math.abs(axcx - mid) < 34 &&
          ax.onGround
        ) {
          postZonesPhaseRef.current = "done";
          showCenterArrowRef.current = false;
          pausedRef.current = true;
          queueMicrotask(() => onCompleteRef.current());
        }
      }

      for (const z of zones) {
        const done = challengeDoneRef.current[z.id];
        const axcx2 = ax.x + AX_W / 2;
        const axcy2 = ax.y + AX_H / 2;
        const near =
          !done &&
          !pausedRef.current &&
          Math.hypot(axcx2 - z.cx, axcy2 - z.cy) <= ZONE_TRIGGER_PX;
        const okMode = z.human ? modeRef.current === "human" : modeRef.current === "ai";
        const bright = near && okMode;
        const pr = 1 + ZONE_PULSE * Math.sin(frame * 0.08);
        const r = ZONE_DRAW_R * pr * (bright ? 1.08 : 1);
        if (z.human) {
          ctx.fillStyle = bright
            ? "rgba(249,115,22,0.5)"
            : "rgba(249,115,22,0.3)";
          ctx.strokeStyle = "#f97316";
        } else {
          ctx.fillStyle = bright
            ? "rgba(34,211,238,0.5)"
            : "rgba(34,211,238,0.3)";
          ctx.strokeStyle = "#22d3ee";
        }
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = z.human ? "#fb923c" : "#67e8f9";
        ctx.textAlign = "center";
        ctx.fillText(z.human ? "H ZONE" : "A ZONE", z.cx, z.cy - r - 8);
        const hintDist = Math.hypot(axcx2 - z.cx, axcy2 - z.cy);
        if (
          !done &&
          !pausedRef.current &&
          hintDist <= ZONE_HINT_DIST_PX
        ) {
          const bounce = Math.sin(frame * 0.08) * 7;
          ctx.save();
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          const hint = z.human
            ? "Press H then enter! 🟠"
            : "Press A then enter! 🔵";
          ctx.fillStyle = z.human ? "#ffedd5" : "#cffafe";
          ctx.shadowColor = z.human ? "#ea580c" : "#0891b2";
          ctx.shadowBlur = 8;
          ctx.fillText(hint, z.cx, z.cy - r - 26 + bounce);
          ctx.restore();
        }
        if (done) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(z.cx - 12, z.cy + 4);
          ctx.lineTo(z.cx - 4, z.cy + 12);
          ctx.lineTo(z.cx + 14, z.cy - 10);
          ctx.stroke();
        }
      }

      for (const b of bulletsRef.current) {
        if (b.dead) continue;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = b.warm ? "#fb923c" : "#22d3ee";
        ctx.fill();
      }

      if (warnFlashRef.current > 0 && frame % 4 < 2) {
        ctx.fillStyle = "rgba(239,68,68,0.25)";
        ctx.fillRect(0, 0, W, H);
      }
      if (warnFlashRef.current > 0) warnFlashRef.current -= 1;

      const wrap = axWrapRef.current;
      if (wrap) {
        wrap.style.position = "absolute";
        wrap.style.zIndex = "10";
        wrap.style.left = "0";
        wrap.style.top = "0";
        wrap.style.pointerEvents = "none";
        wrap.style.transformOrigin = `${AX_W / 2}px ${AX_H}px`;
        wrap.style.transform = `translate(${ax.x}px, ${ax.y}px)`;
        const newFacing: "left" | "right" = ax.facing < 0 ? "left" : "right";
        if (newFacing !== lastFacingRef.current) {
          lastFacingRef.current = newFacing;
          queueMicrotask(() => setAxFacing(newFacing));
        }
        wrap.style.filter =
          modeNow === "human"
            ? "drop-shadow(0 0 8px #f97316)"
            : "drop-shadow(0 0 8px #22d3ee)";
      }

      const moving = !pausedRef.current && Math.abs(ax.vx) > 0.05;
      if (moving !== lastMovingRef.current) {
        lastMovingRef.current = moving;
        queueMicrotask(() => setAxAnim(moving ? "walk" : "idle"));
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      if (wrongWarnTimerRef.current) clearTimeout(wrongWarnTimerRef.current);
    };
  }, [damage, flashWrongMode, onXP, playSound]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          zIndex: 12,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "#e2e8f0",
            letterSpacing: 2,
            textShadow: "0 1px 4px #000",
          }}
        >
          Zones:{" "}
          {ALL_ZONES.map((id, i) => (
            <span
              key={id}
              style={{
                color: zoneUiDone[id] ? (i < 2 ? "#fb923c" : "#22d3ee") : "#64748b",
              }}
            >
              {zoneUiDone[id] ? "●" : "○"}
            </span>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div
        ref={axWrapRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <AXCharacter animation={axAnim} facing={axFacing} size={1.2} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 8,
          zIndex: 22,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "8px 16px",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
            textAlign: "center",
            lineHeight: 1.45,
            maxWidth: 640,
            fontFamily: "monospace",
          }}
        >
          ← → Move · Space Jump · Z Shoot · H = Human 🟠 · A = AI 🔵 · Orange zones need H · Blue zones
          need A
        </div>
      </div>

      {wrongModeMessage && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            zIndex: 35,
            color: "#fca5a5",
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "monospace",
            textAlign: "center",
            textShadow: "0 0 12px #7f1d1d, 0 2px 8px #000",
            maxWidth: 520,
            padding: 16,
            pointerEvents: "none",
            transition: "opacity 0.4s ease",
          }}
        >
          {wrongModeMessage}
        </div>
      )}

      {showVictoryNova && (
        <DialogueBox
          character="NOVA"
          text={
            "All challenges complete!\nNow face The Divide Keeper!"
          }
          onComplete={handleVictoryNovaComplete}
        />
      )}

      {novaToast && !showVictoryNova && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            top: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid #a855f7",
            color: "#e2e8f0",
            padding: "8px 16px",
            fontFamily: "monospace",
            fontSize: 12,
            zIndex: 20,
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          NOVA: {novaToast}
        </motion.div>
      )}

      <div
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontFamily: "monospace",
          fontSize: 11,
          color: "#94a3b8",
          zIndex: 15,
          textAlign: "right",
        }}
      >
        HP {uiHealth} · {mode === "human" ? "👤 Human" : "🤖 AI"}
      </div>

      <ChallengeModals modal={modal} onResolve={resolveChallenge} />
    </div>
  );
}

function ChallengeModals({
  modal,
  onResolve,
}: {
  modal: null | { kind: "challenge"; id: ChallengeId };
  onResolve: (id: ChallengeId, ok: boolean) => void;
}) {
  if (!modal || modal.kind !== "challenge") return null;

  if (modal.id === "h0") {
    return (
      <ModalFrame title="Human: shapes">
        <p style={{ marginBottom: 12, color: "#cbd5e1" }}>Draw a circle — pick the circle.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "▢ Square", ok: false },
            { label: "△ Triangle", ok: false },
            { label: "● Circle", ok: true },
            { label: "⬟ Pentagon", ok: false },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => onResolve("h0", o.ok)}
              style={{
                padding: "10px 14px",
                background: "#7c2d12",
                border: "1px solid #fb923c",
                color: "#fff",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </ModalFrame>
    );
  }
  if (modal.id === "h1") {
    return (
      <ModalFrame title="Human: emotion">
        <p style={{ marginBottom: 12, color: "#cbd5e1" }}>Which image shows sadness?</p>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { e: "😀", ok: false },
            { e: "😢", ok: true },
            { e: "😐", ok: false },
            { e: "😠", ok: false },
          ].map((o) => (
            <button
              key={o.e}
              type="button"
              onClick={() => onResolve("h1", o.ok)}
              style={{
                fontSize: 36,
                padding: 8,
                background: "#431407",
                border: "1px solid #ea580c",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {o.e}
            </button>
          ))}
        </div>
      </ModalFrame>
    );
  }
  if (modal.id === "a0") {
    return (
      <ModalFrame title="AI: sort">
        <p style={{ marginBottom: 12, color: "#cbd5e1" }}>Pick ascending order.</p>
        {[
          { t: "9, 2, 7, 3", ok: false },
          { t: "2, 4, 5, 8", ok: true },
          { t: "8, 5, 2, 1", ok: false },
        ].map((o) => (
          <button
            key={o.t}
            type="button"
            onClick={() => onResolve("a0", o.ok)}
            style={{
              display: "block",
              width: "100%",
              marginBottom: 8,
              padding: 10,
              background: "#0c4a6e",
              border: "1px solid #22d3ee",
              color: "#e0f2fe",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {o.t}
          </button>
        ))}
      </ModalFrame>
    );
  }
  if (modal.id === "a1") {
    return (
      <ModalFrame title="AI: pattern">
        <p style={{ marginBottom: 12, color: "#cbd5e1" }}>2, 4, 8, 16, ___</p>
        {[24, 32, 28].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onResolve("a1", n === 32)}
            style={{
              display: "inline-block",
              marginRight: 8,
              padding: "10px 18px",
              background: "#0f172a",
              border: "1px solid #38bdf8",
              color: "#bae6fd",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {n}
          </button>
        ))}
      </ModalFrame>
    );
  }
  return null;
}

function ModalFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "linear-gradient(145deg, #1e1f3a, #0f172a)",
          border: "2px solid #a855f7",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h3 style={{ margin: "0 0 12px", color: "#e9d5ff", fontFamily: "monospace", fontSize: 14 }}>{title}</h3>
        {children}
      </div>
    </motion.div>
  );
}
