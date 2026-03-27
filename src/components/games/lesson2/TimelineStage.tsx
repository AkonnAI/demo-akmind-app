"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NovaCharacter from "@/components/games/shared/NovaCharacter";
import type { GameData } from "./gameTypes";
import { useSoundEngine } from "./useSoundEngine";
import AXCharacter from "@/components/games/shared/AXCharacter";

const LEVEL_W = 2800;
const GRAVITY = 0.55;
const MAX_FALL = 12;
const JUMP_VY = -12;
const MOVE_SPD = 2.5;
const MOMENTUM = 0.18;
const AX_W = 44;
const AX_H = 64;
const GROUND_Y = 80;
const COYOTE_FRAMES = 8;

type PlatKind = "good" | "trap";

interface TPlat {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  year: number;
  label: string;
  kind: PlatKind;
  /** Target sequence index for good tiles (0..3) */
  seq: number;
  dead: boolean;
  glow: number;
  crumble?: boolean;
  crumbleTimer?: number;
  crumbling?: boolean;
  crumbleOrigY?: number;
  crumbleRespawnTimer?: number;
}

interface MovingPlat {
  id: number;
  x: number;
  baseX: number;
  y: number;
  w: number;
  h: number;
  range: number;
  speed: number;
  dir: number;
}

interface TimeBubble {
  id: number;
  x: number;
  baseY: number;
  year: string;
  frozen: boolean;
  frozenTimer: number;
  dead: boolean;
}

const NOVA_BY_YEAR: Record<number, string> = {
  1950: "The Turing Test! If a machine can fool a human, is it intelligent?",
  1956: "This is where it all began — John McCarthy coined the term AI!",
  1997: "Deep Blue proved AI could beat the best human minds at chess!",
  2012: "AlexNet changed everything — deep learning was born!",
  2016: "Go has more positions than atoms in the universe. AlphaGo solved it!",
  2017: "Attention is all you need — the paper that created ChatGPT!",
  2020: "GPT-3 could write like a human. The world noticed.",
  2022: "ChatGPT — 100 million users in 60 days. AI went mainstream.",
};

function buildStage(stage: 1 | 2, groundTop: number): TPlat[] {
  const gy = (lift: number) => groundTop - lift;
  if (stage === 1) {
    return [
      { id: 1, x: 260, y: gy(100), w: 160, h: 18, year: 1950, label: "Alan Turing proposes the Turing Test", kind: "good", seq: 0, dead: false, glow: 0 },
      { id: 2, x: 480, y: gy(130), w: 160, h: 18, year: -3000, label: "3000 BC: Ancient calculator", kind: "trap", seq: -1, dead: false, glow: 0 },
      { id: 3, x: 700, y: gy(110), w: 160, h: 18, year: 1956, label: "AI officially named at Dartmouth", kind: "good", seq: 1, dead: false, glow: 0, crumble: true, crumbleTimer: 0, crumbling: false, crumbleOrigY: gy(110) },
      { id: 4, x: 920, y: gy(140), w: 160, h: 18, year: 1850, label: "1850: Steam engine", kind: "trap", seq: -1, dead: false, glow: 0 },
      { id: 5, x: 1140, y: gy(100), w: 160, h: 18, year: 1997, label: "Deep Blue beats Kasparov at chess", kind: "good", seq: 2, dead: false, glow: 0, crumble: true, crumbleTimer: 0, crumbling: false, crumbleOrigY: gy(100) },
      { id: 6, x: 1360, y: gy(120), w: 160, h: 18, year: 2035, label: "2035: Future AI", kind: "trap", seq: -1, dead: false, glow: 0 },
      { id: 7, x: 1580, y: gy(130), w: 160, h: 18, year: 2012, label: "Deep Learning revolution begins", kind: "good", seq: 3, dead: false, glow: 0 },
    ];
  }
  return [
    { id: 11, x: 240, y: gy(100), w: 160, h: 18, year: 2016, label: "AlphaGo beats world Go champion", kind: "good", seq: 0, dead: false, glow: 0 },
    { id: 12, x: 460, y: gy(130), w: 160, h: 18, year: -3000, label: "3000 BC: Ancient calculator", kind: "trap", seq: -1, dead: false, glow: 0 },
    { id: 13, x: 700, y: gy(110), w: 160, h: 18, year: 2017, label: "Transformer architecture invented", kind: "good", seq: 1, dead: false, glow: 0 },
    { id: 14, x: 940, y: gy(140), w: 160, h: 18, year: 1850, label: "1850: Steam engine", kind: "trap", seq: -1, dead: false, glow: 0 },
    { id: 15, x: 1160, y: gy(120), w: 170, h: 18, year: 2020, label: "GPT-3 launches — 175B parameters", kind: "good", seq: 2, dead: false, glow: 0 },
    { id: 16, x: 1400, y: gy(130), w: 160, h: 18, year: 2035, label: "2035: Future AI", kind: "trap", seq: -1, dead: false, glow: 0 },
    { id: 17, x: 1620, y: gy(110), w: 170, h: 18, year: 2022, label: "ChatGPT reaches 100M users", kind: "good", seq: 3, dead: false, glow: 0 },
  ];
}

function buildMovingPlats(groundTop: number): MovingPlat[] {
  return [
    { id: 101, x: 500, baseX: 500, y: groundTop - 120, w: 140, h: 18, range: 120, speed: 1.2, dir: 1 },
    { id: 102, x: 900, baseX: 900, y: groundTop - 100, w: 120, h: 18, range: 100, speed: 1.5, dir: -1 },
    { id: 103, x: 1400, baseX: 1400, y: groundTop - 130, w: 150, h: 18, range: 130, speed: 1.0, dir: 1 },
  ];
}

function buildTimeBubbles(groundTop: number): TimeBubble[] {
  const years = ["3000 BC", "1850 AD", "2099 AD", "4001 AD"];
  return [450, 750, 1050, 1350].map((x, i) => ({
    id: 200 + i,
    x,
    baseY: groundTop - 80,
    year: years[i]!,
    frozen: false,
    frozenTimer: 0,
    dead: false,
  }));
}

interface TimelineStageProps {
  stage: 1 | 2;
  gameData: GameData;
  onUpdateGameData: (u: Partial<GameData>) => void;
  onComplete: () => void;
  onXP: (n: number) => void;
}

interface FloatTx {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

export default function TimelineStage({
  stage,
  gameData,
  onUpdateGameData,
  onComplete,
  onXP,
}: TimelineStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef(0);
  const platformsRef = useRef<TPlat[]>([]);
  const movingPlatsRef = useRef<MovingPlat[]>([]);
  const timeBubblesRef = useRef<TimeBubble[]>([]);
  const progressRef = useRef(0);
  const landedRef = useRef<number | null>(null);
  const cameraRef = useRef(0);
  const frameRef = useRef(0);
  const axRefState = useRef({
    x: 40,
    y: 0,
    vx: 0,
    vy: 0,
    onGround: true,
    facingRight: true,
    coyoteTimer: 0,
    invTimer: 0,
    scaleX: 1,
    scaleY: 1,
    scaleTimer: 0,
  });

  const vpW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vpH = typeof window !== "undefined" ? window.innerHeight - 48 : 600;
  const groundTop = vpH - GROUND_Y;

  const [uiHealth, setUiHealth] = useState(gameData.health);
  const [novaMessage, setNovaMessage] = useState<string | null>(null);
  const [novaWarn, setNovaWarn] = useState<string | null>(null);
  const [stageLabel, setStageLabel] = useState(true);
  const [axAnim, setAxAnim] = useState<"idle" | "walk" | "jump" | "hit">("idle");
  const [axFacing, setAxFacing] = useState<"left" | "right">("right");
  const axAnimRef = useRef<"idle" | "walk" | "jump" | "hit">("idle");
  const axFacingRef = useRef<"left" | "right">("right");
  const healthRef = useRef(gameData.health);
  const completedRef = useRef(false);
  const rainDropsRef = useRef<RainDrop[] | null>(null);
  const shootBubbleCdRef = useRef(0);
  const onXPRef = useRef(onXP);
  onXPRef.current = onXP;
  const { playSound } = useSoundEngine();

  useEffect(() => {
    healthRef.current = gameData.health;
  }, [gameData.health]);

  useEffect(() => {
    platformsRef.current = buildStage(stage, groundTop);
    movingPlatsRef.current = stage === 1 ? buildMovingPlats(groundTop) : [];
    timeBubblesRef.current = stage === 1 ? buildTimeBubbles(groundTop) : [];
    progressRef.current = 0;
    landedRef.current = null;
    completedRef.current = false;
    cameraRef.current = 0;
    frameRef.current = 0;
    rainDropsRef.current = null;
    healthRef.current = gameData.health;
    axRefState.current = {
      x: 40,
      y: groundTop - AX_H,
      vx: 0,
      vy: 0,
      onGround: true,
      facingRight: true,
      coyoteTimer: 0,
      invTimer: 0,
      scaleX: 1,
      scaleY: 1,
      scaleTimer: 0,
    };
    const t = setTimeout(() => setStageLabel(false), 2200);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, [stage, groundTop, gameData.health]);

  const floatTextsRef = useRef<FloatTx[]>([]);
  const floatId = useRef(0);
  const flashRef = useRef(0);

  const spawnFloat = (x: number, y: number, text: string, color: string) => {
    floatTextsRef.current.push({
      id: floatId.current++,
      x,
      y,
      text,
      color,
      life: 40,
      vy: -1.2,
    });
  };

  const handleLandOn = useCallback(
    (p: TPlat, ax: typeof axRefState.current) => {
      if (p.dead) return;
      if (p.kind === "trap") {
        const hp = Math.max(0, healthRef.current - 10);
        healthRef.current = hp;
        onUpdateGameData({ health: hp });
        setUiHealth(hp);
        p.dead = true;
        flashRef.current = 14;
        setNovaMessage(null);
        setNovaWarn("That's not an AI milestone!");
        playSound("wrong");
        ax.invTimer = 50;
        return;
      }
      const need = progressRef.current;
      if (p.seq !== need) {
        const hp = Math.max(0, healthRef.current - 10);
        healthRef.current = hp;
        onUpdateGameData({ health: hp });
        setUiHealth(hp);
        flashRef.current = 12;
        setNovaWarn("Land on the milestones in chronological order!");
        playSound("wrong");
        ax.invTimer = 40;
        return;
      }
      progressRef.current += 1;
      p.glow = 55;
      onXP(40);
      spawnFloat(p.x + p.w / 2, p.y - 24, "+correct!", "#fbbf24");
      const line = NOVA_BY_YEAR[p.year] ?? "Nice — history holds.";
      setNovaMessage(line);
      setNovaWarn(null);
      playSound("correct");
      if (progressRef.current === 4) {
        try {
          playSound("checkpoint");
        } catch {
          /* silent */
        }
      }
      if (progressRef.current >= 4 && !completedRef.current) {
        completedRef.current = true;
        setTimeout(onComplete, 600);
      }
    },
    [onComplete, onUpdateGameData, onXP, playSound]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = vpW;
    canvas.height = vpH;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      const fr = frameRef.current;
      const keys = keysRef.current;
      const ax = axRefState.current;
      const plats = platformsRef.current;
      const movPlats = movingPlatsRef.current;
      const bubbles = timeBubblesRef.current;
      if (flashRef.current > 0) flashRef.current--;

      /* ── rain ── */
      let rainDrops = rainDropsRef.current;
      if (!rainDrops || rainDrops.length === 0) {
        rainDrops = Array.from({ length: 60 }, () => ({
          x: Math.random() * LEVEL_W,
          y: Math.random() * vpH,
          speed: 4 + Math.random() * 4,
          length: 10 + Math.random() * 10,
        }));
        rainDropsRef.current = rainDrops;
      }
      rainDrops.forEach((d) => {
        d.y += d.speed;
        if (d.y > vpH) { d.y = -20; d.x = Math.random() * LEVEL_W; }
      });

      /* ── draw sky ── */
      const sky = ctx.createLinearGradient(0, 0, 0, vpH);
      sky.addColorStop(0, "#1a0a00");
      sky.addColorStop(1, "#0d0d24");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, vpW, vpH);

      const cam = cameraRef.current;

      ctx.save();
      rainDrops.forEach((d) => {
        const sx = d.x - cam;
        if (sx < -20 || sx > vpW + 20) return;
        ctx.strokeStyle = "rgba(251,191,36,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, d.y);
        ctx.lineTo(sx - 1, d.y + d.length);
        ctx.stroke();
      });
      ctx.restore();

      ctx.fillStyle = "rgba(251,191,36,0.04)";
      for (let i = 0; i < 20; i++) {
        const x = ((i * 180 - cam * 0.15) % (vpW + 200)) - 100;
        ctx.fillRect(x, groundTop - 120 - (i % 5) * 15, 120, 80);
      }

      ctx.fillStyle = "#0b0610";
      ctx.fillRect(0, groundTop, vpW, GROUND_Y);
      ctx.strokeStyle = "rgba(251,191,36,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundTop);
      ctx.lineTo(vpW, groundTop);
      ctx.stroke();

      /* ── update moving platforms ── */
      for (const mp of movPlats) {
        mp.x += mp.speed * mp.dir;
        if (mp.x > mp.baseX + mp.range || mp.x < mp.baseX - mp.range) {
          mp.dir *= -1;
        }
      }

      /* ── draw moving platforms ── */
      for (const mp of movPlats) {
        const px = mp.x - cam;
        if (px + mp.w < 0 || px > vpW) continue;
        ctx.fillStyle = "#164e63";
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2;
        ctx.fillRect(px, mp.y, mp.w, mp.h);
        ctx.strokeRect(px, mp.y, mp.w, mp.h);
        // Arrow indicator
        ctx.fillStyle = "#22d3ee";
        const arrowX = mp.dir > 0 ? px + mp.w - 12 : px + 6;
        const arrowY = mp.y + mp.h / 2;
        ctx.beginPath();
        if (mp.dir > 0) {
          ctx.moveTo(arrowX, arrowY - 4);
          ctx.lineTo(arrowX + 8, arrowY);
          ctx.lineTo(arrowX, arrowY + 4);
        } else {
          ctx.moveTo(arrowX + 8, arrowY - 4);
          ctx.lineTo(arrowX, arrowY);
          ctx.lineTo(arrowX + 8, arrowY + 4);
        }
        ctx.closePath();
        ctx.fill();
      }

      /* ── draw static platforms ── */
      for (const p of plats) {
        if (p.dead) continue;
        const px = p.x - cam;
        if (px + p.w < 0 || px > vpW) continue;
        const isTrap = p.kind === "trap";
        const fill = isTrap ? "#7f1d1d" : "#92400e";
        const stroke = isTrap ? "#fecaca" : "#fbbf24";
        ctx.save();
        if (p.glow > 0) {
          p.glow--;
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 20;
        }
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.strokeRect(px, p.y, p.w, p.h);

        // Crumble cracks
        if (p.crumble && (p.crumbleTimer ?? 0) > 45) {
          ctx.strokeStyle = p.crumbling ? "#ef4444" : "#fbbf24";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + p.w * 0.25, p.y); ctx.lineTo(px + p.w * 0.3, p.y + p.h);
          ctx.moveTo(px + p.w * 0.6, p.y); ctx.lineTo(px + p.w * 0.55, p.y + p.h);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = isTrap ? "#fecaca" : "#fffbeb";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        const yLabel = p.year < 0 ? `${Math.abs(p.year)} BC` : String(p.year);
        ctx.fillText(yLabel, px + p.w / 2, p.y + 26);
        ctx.font = "10px monospace";
        const words = p.label.length > 34 ? `${p.label.slice(0, 32)}…` : p.label;
        ctx.fillText(words, px + p.w / 2, p.y + 42);
        ctx.textAlign = "left";
        ctx.restore();
      }

      /* ── draw time bubbles ── */
      for (const b of bubbles) {
        if (b.dead) continue;
        const bx = b.x - cam;
        if (bx < -40 || bx > vpW + 40) continue;
        const by = b.frozen ? b.baseY : b.baseY + Math.sin(fr * 0.03) * 30;
        ctx.save();
        ctx.globalAlpha = b.frozen ? 0.4 : 0.7;
        ctx.beginPath();
        ctx.arc(bx, by, 20, 0, Math.PI * 2);
        ctx.fillStyle = b.frozen ? "#6b7280" : "#7c3aed";
        ctx.fill();
        ctx.strokeStyle = b.frozen ? "#9ca3af" : "#a78bfa";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.year, bx, by + 3);
        ctx.textAlign = "left";
        ctx.restore();

        // Collision with AX
        if (ax.invTimer === 0) {
          const axCx = ax.x + AX_W / 2;
          const axCy = ax.y + AX_H / 2;
          const dist = Math.hypot(axCx - b.x, axCy - (b.frozen ? b.baseY : b.baseY + Math.sin(fr * 0.03) * 30));
          if (dist < AX_W / 2 + 20) {
            const hp = Math.max(0, healthRef.current - 8);
            healthRef.current = hp;
            onUpdateGameData({ health: hp });
            setUiHealth(hp);
            ax.invTimer = 40;
            flashRef.current = 10;
            ax.vx = ax.x < b.x ? -4 : 4;
            ax.vy = -5;
            try {
              playSound("enemyHit");
            } catch {
              /* silent */
            }
          }
        }

        // Update frozen timer
        if (b.frozen) {
          b.frozenTimer--;
          if (b.frozenTimer <= 0) {
            b.frozen = false;
            b.dead = true; // disappears after freeze
          }
        }
      }

      if (shootBubbleCdRef.current > 0) shootBubbleCdRef.current--;
      const zPress = keys.has("z") || keys.has("Z");
      if (stage === 1 && zPress && shootBubbleCdRef.current <= 0) {
        shootBubbleCdRef.current = 22;
        try {
          playSound("shoot");
        } catch {
          /* silent */
        }
        const axCx = ax.x + AX_W / 2;
        const axCy = ax.y + AX_H / 2;
        for (const b of bubbles) {
          if (b.dead || b.frozen) continue;
          const bob = Math.sin(fr * 0.03) * 30;
          const by = b.baseY + bob;
          if (Math.abs(b.x - axCx) < 200 && Math.abs(by - axCy) < 100) {
            b.frozen = true;
            b.frozenTimer = 160;
            try {
              playSound("xpCollect");
            } catch {
              /* silent */
            }
            onXPRef.current(10);
            break;
          }
        }
      }

      /* ── end ribbon ── */
      const endX = LEVEL_W - 120 - cam;
      if (endX < vpW) {
        ctx.fillStyle = "rgba(251,191,36,0.15)";
        ctx.fillRect(endX, groundTop - 140, 100, 140);
        ctx.fillStyle = "#fcd34d";
        ctx.font = "bold 12px monospace";
        ctx.fillText("EXIT", endX + 30, groundTop - 150);
      }

      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(239,68,68,${(flashRef.current / 14) * 0.35})`;
        ctx.fillRect(0, 0, vpW, vpH);
      }

      /* ── float texts ── */
      floatTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) return;
        ctx.globalAlpha = Math.min(1, ft.life / 40);
        ctx.fillStyle = ft.color;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x - cam, ft.y);
        ctx.textAlign = "left";
      });
      ctx.globalAlpha = 1;
      floatTextsRef.current = floatTextsRef.current.filter((f) => f.life > 0);

      /* ── physics ── */
      const goLeft = keys.has("ArrowLeft") || keys.has("a");
      const goRight = keys.has("ArrowRight") || keys.has("d");
      const goJump = keys.has("ArrowUp") || keys.has("w") || keys.has(" ");

      const targetVx = goLeft ? -MOVE_SPD : goRight ? MOVE_SPD : 0;
      ax.vx += (targetVx - ax.vx) * MOMENTUM;
      if (Math.abs(ax.vx) < 0.05) ax.vx = 0;
      if (goLeft) ax.facingRight = false;
      if (goRight) ax.facingRight = true;

      ax.vy = Math.min(ax.vy + GRAVITY, MAX_FALL);
      ax.x += ax.vx;
      ax.y += ax.vy;
      ax.x = Math.max(0, Math.min(LEVEL_W - AX_W, ax.x));

      ax.onGround = false;
      if (ax.y + AX_H >= groundTop) {
        ax.y = groundTop - AX_H;
        ax.vy = 0;
        ax.onGround = true;
      }

      /* ── static platform collision ── */
      for (const p of plats) {
        if (p.dead) continue;
        if (
          ax.x + AX_W > p.x &&
          ax.x < p.x + p.w &&
          ax.y + AX_H >= p.y &&
          ax.y + AX_H <= p.y + p.h + 14 &&
          ax.vy >= -0.5
        ) {
          ax.y = p.y - AX_H;
          ax.vy = 0;
          ax.onGround = true;

          // Crumble logic
          if (p.crumble) {
            p.crumbleTimer = (p.crumbleTimer ?? 0) + 1;
            if ((p.crumbleTimer ?? 0) >= 45 && !p.crumbling) {
              p.crumbling = true;
            }
          }

          const lid = p.id;
          if (landedRef.current !== lid) {
            landedRef.current = lid;
            handleLandOn(p, ax);
          }
          break;
        }
      }

      /* ── update crumbling platforms ── */
      for (const p of plats) {
        if (!p.crumble || p.dead) continue;
        if (p.crumbling) {
          p.y += 8;
          // Respawn after ~5 seconds (150 frames)
          if (p.crumbleRespawnTimer === undefined) p.crumbleRespawnTimer = 0;
          p.crumbleRespawnTimer++;
          if (p.crumbleRespawnTimer >= 150) {
            p.y = p.crumbleOrigY!;
            p.crumbling = false;
            p.crumbleTimer = 0;
            p.crumbleRespawnTimer = 0;
          }
          // AX falls with platform if still on it
          if (
            ax.x + AX_W > p.x &&
            ax.x < p.x + p.w &&
            ax.y + AX_H >= p.y - 8 &&
            ax.y + AX_H <= p.y + p.h + 14
          ) {
            ax.y += 8;
            ax.onGround = true;
          }
        } else if ((p.crumbleTimer ?? 0) === 0 && !p.crumbling) {
          // Reset if not standing on it
          const axOnThis =
            ax.x + AX_W > p.x &&
            ax.x < p.x + p.w &&
            ax.onGround &&
            Math.abs(ax.y + AX_H - p.y) < 4;
          if (!axOnThis && (p.crumbleTimer ?? 0) > 0) {
            p.crumbleTimer = Math.max(0, (p.crumbleTimer ?? 0) - 2);
          }
        }
      }

      /* ── moving platform collision ── */
      for (const mp of movPlats) {
        if (
          ax.x + AX_W > mp.x &&
          ax.x < mp.x + mp.w &&
          ax.y + AX_H >= mp.y &&
          ax.y + AX_H <= mp.y + mp.h + 14 &&
          ax.vy >= -0.5
        ) {
          ax.y = mp.y - AX_H;
          ax.vy = 0;
          ax.onGround = true;
          // Move AX with platform
          ax.x += mp.speed * mp.dir;
          ax.x = Math.max(0, Math.min(LEVEL_W - AX_W, ax.x));
          break;
        }
      }

      if (!ax.onGround) landedRef.current = null;

      if (ax.onGround) ax.coyoteTimer = COYOTE_FRAMES;
      else ax.coyoteTimer = Math.max(0, ax.coyoteTimer - 1);

      if (goJump && ax.coyoteTimer > 0) {
        ax.vy = JUMP_VY;
        ax.onGround = false;
        ax.coyoteTimer = 0;
        landedRef.current = null;
        try { playSound("jump"); } catch { /* silent */ }
      }

      if (ax.invTimer > 0) ax.invTimer--;

      cameraRef.current = Math.max(0, Math.min(LEVEL_W - vpW, ax.x - vpW * 0.32));

      /* ── update AX animation state ── */
      const newAnim: "idle" | "walk" | "jump" | "hit" =
        ax.invTimer > 0 ? "hit" :
        !ax.onGround ? "jump" :
        Math.abs(ax.vx) > 0.5 ? "walk" : "idle";
      const newFacing: "left" | "right" = ax.facingRight ? "right" : "left";

      if (newAnim !== axAnimRef.current) {
        axAnimRef.current = newAnim;
        queueMicrotask(() => setAxAnim(newAnim));
      }
      if (newFacing !== axFacingRef.current) {
        axFacingRef.current = newFacing;
        queueMicrotask(() => setAxFacing(newFacing));
      }

      /* ── position AX HTML element ── */
      if (axRef.current) {
        const sx = ax.x - cameraRef.current;
        axRef.current.style.transform = `translate(${sx}px,${ax.y}px)`;
        axRef.current.style.opacity =
          ax.invTimer > 0 && Math.floor(ax.invTimer / 8) % 2 === 0 ? "0.25" : "1";
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [vpW, vpH, groundTop, stage, handleLandOn, onComplete, playSound, onUpdateGameData]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: vpW,
        height: vpH,
        overflow: "hidden",
        background: "#0d0d24",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        width={vpW}
        height={vpH}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* AX character */}
      <div
        ref={axRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "top left",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <AXCharacter animation={axAnim} facing={axFacing} size={1} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 56,
          left: 12,
          zIndex: 20,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          maxWidth: 320,
        }}
      >
        <NovaCharacter expression="happy" size={0.5} />
        <div
          style={{
            background: "rgba(15,10,5,0.92)",
            border: "1px solid #fbbf24",
            borderRadius: 12,
            padding: "8px 12px",
            minHeight: 44,
          }}
        >
          {novaMessage && (
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "#fef3c7" }}>
              {novaMessage}
            </p>
          )}
          {novaWarn && (
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "#fecaca" }}>
              {novaWarn}
            </p>
          )}
          {!novaMessage && !novaWarn && (
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
              Land each milestone in order.
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {stageLabel && (
          <motion.div
            key="label"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "monospace",
              fontSize: 13,
              color: "#fcd34d",
              letterSpacing: 3,
              zIndex: 30,
            }}
          >
            STAGE {stage} — HISTORY VAULT RUN
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 11 }}>❤️</span>
        <div
          style={{
            width: 100,
            height: 6,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(0, (uiHealth / 100) * 100)}%`,
              height: "100%",
              backgroundColor: uiHealth > 40 ? "#22c55e" : "#ef4444",
            }}
          />
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>
          {uiHealth}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "monospace",
          fontSize: 10,
          color: "rgba(148,163,184,0.5)",
        }}
      >
        ← → Move · ↑/Space Jump
      </div>
    </div>
  );
}
