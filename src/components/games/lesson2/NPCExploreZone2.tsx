"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DialogueBox from "./DialogueBox";
import AXCharacter from "@/components/games/shared/AXCharacter";
import { useSoundEngine } from "./useSoundEngine";

const LEVEL_W = 1200;
const GROUND_Y = 80;
const AX_W = 44;
const AX_H = 64;
const GRAVITY = 0.6;
const MAX_FALL = 12;
const JUMP_VY = -14;
const MOVE_SPD = 2.8;
const MOMENTUM = 0.2;
const COYOTE_FRAMES = 8;
const DOOR_X = 1100;
const NPC_PROX = 80;
const DOOR_PROX = 40;

type NpcId = 1 | 2 | 3;

const NPCS: Array<{
  id: NpcId;
  x: number;
  name: string;
  body: string;
  head: string;
  eyeColor: string;
  lines: [string, string, string];
}> = [
  {
    id: 1,
    x: 200,
    name: "ARCHIVIST BOT",
    body: "#15803d",
    head: "#22c55e",
    eyeColor: "#bbf7d0",
    lines: [
      "Welcome to the History Vault! AI history has been corrupted.",
      "Use ← → to move, Space to jump!",
      "Watch out for TRAP platforms — they flash RED!",
    ],
  },
  {
    id: 2,
    x: 550,
    name: "TIMELINE KEEPER",
    body: "#6b21a8",
    head: "#a855f7",
    eyeColor: "#e9d5ff",
    lines: [
      "Land on year platforms IN ORDER to restore history!",
      "1950 → 1956 → 1997 → 2012 in Stage 1!",
      "NOVA will guide you at each milestone. Listen to her!",
    ],
  },
  {
    id: 3,
    x: 900,
    name: "VAULT GUARDIAN",
    body: "#c2410c",
    head: "#ea580c",
    eyeColor: "#fed7aa",
    lines: [
      "The TIME CORRUPTOR fears being forgotten.",
      "It deleted its own history! Beat it with knowledge.",
      "Press Z to shoot during boss battle. Time your shots!",
    ],
  },
];

const COLLECT_X = [300, 650, 1050];

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

interface Ember {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
  size: number;
}

function initRain(vpH: number): RainDrop[] {
  return Array.from({ length: 60 }, () => ({
    x: Math.random() * LEVEL_W,
    y: Math.random() * vpH,
    speed: 4 + Math.random() * 3,
    length: 10 + Math.random() * 8,
  }));
}

function spawnEmber(groundTop: number, cam: number, vpW: number): Ember {
  return {
    x: cam + Math.random() * vpW,
    y: groundTop - Math.random() * 10,
    vy: -(0.3 + Math.random() * 0.7),
    vx: (Math.random() - 0.5) * 0.4,
    life: 0,
    maxLife: 60 + Math.floor(Math.random() * 80),
    size: 1.5 + Math.random() * 2,
  };
}

interface Props {
  onComplete: () => void;
  onXP: (n: number) => void;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export default function NPCExploreZone2({ onComplete, onXP }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const axOverlayRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef(new Set<string>());
  const rafRef = useRef(0);
  const frameRef = useRef(0);
  const rainRef = useRef<RainDrop[]>([]);
  const embersRef = useRef<Ember[]>([]);
  const axRef = useRef({
    x: 60,
    y: 0,
    vx: 0,
    vy: 0,
    onGround: true,
    facingRight: true,
    coyoteTimer: 0,
  });
  const camRef = useRef(0);
  const collectedRef = useRef([false, false, false]);
  const talkedRef = useRef(false);
  const wasInDoorRef = useRef(false);
  const startMsRef = useRef<number | null>(null);
  const pressureFiredRef = useRef(false);
  const nearNpcIdRef = useRef<NpcId | null>(null);
  const onXPRef = useRef(onXP);
  onXPRef.current = onXP;
  const showNovaRef = useRef(false);

  const lastAnimRef = useRef<"idle" | "walk" | "jump">("idle");
  const lastFacingRef = useRef<"left" | "right">("right");

  const [activeNpc, setActiveNpc] = useState<NpcId | null>(null);
  const [bubbleLine, setBubbleLine] = useState(0);
  const [showMissionNova, setShowMissionNova] = useState(false);
  const [doorTip, setDoorTip] = useState(false);
  const [pressureMsg, setPressureMsg] = useState(false);
  const [axAnim, setAxAnim] = useState<"idle" | "walk" | "jump">("idle");
  const [axFacing, setAxFacing] = useState<"left" | "right">("right");

  const { playSound } = useSoundEngine();
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  showNovaRef.current = showMissionNova;

  useEffect(() => {
    if (!activeNpc) return;
    setBubbleLine(0);
    const t = setInterval(() => {
      setBubbleLine((i) => (i + 1) % 3);
    }, 3000);
    return () => clearInterval(t);
  }, [activeNpc]);

  const tryDoorEnter = useCallback(() => {
    if (showNovaRef.current) return;
    if (!talkedRef.current) {
      setDoorTip(true);
      setTimeout(() => setDoorTip(false), 3000);
      return;
    }
    // Dismiss NPC bubble, then delay before showing NOVA
    nearNpcIdRef.current = null;
    setActiveNpc(null);
    setTimeout(() => setShowMissionNova(true), 300);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const el = containerRef.current;
      const w = Math.max(640, el?.clientWidth ?? 800);
      const h = Math.max(400, el?.clientHeight ?? 520);
      canvas.width = w;
      canvas.height = h;
      rainRef.current = initRain(h);
      const gt = h - GROUND_Y;
      axRef.current.y = gt - AX_H;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", resize);
    startMsRef.current = Date.now();

    const drawNpc = (
      n: (typeof NPCS)[0],
      groundTop: number,
      cam: number,
      fr: number
    ) => {
      const px = n.x - cam;
      const isMob = canvas.width < 768;
      const bodyH = isMob ? 22 : 30;
      const headH = isMob ? 12 : 18;
      const bodyW = isMob ? 16 : 22;
      const headW = isMob ? 14 : 18;
      const bodyY = groundTop - bodyH;
      const headY = bodyY - headH;

      // Glow circle beneath NPC
      const glowR = 24 + Math.sin(fr * 0.04) * 4;
      const grd = ctx.createRadialGradient(px, groundTop, 0, px, groundTop, glowR);
      grd.addColorStop(0, n.body + "55");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(px, groundTop, glowR, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shadow
      ctx.save();
      ctx.shadowColor = n.head;
      ctx.shadowBlur = 8;

      // Body
      ctx.fillStyle = n.body;
      roundRectPath(ctx, px - bodyW / 2, bodyY, bodyW, bodyH, 4);
      ctx.fill();

      // Head
      ctx.fillStyle = n.head;
      roundRectPath(ctx, px - headW / 2, headY, headW, headH, 4);
      ctx.fill();
      ctx.restore();

      // Visor strip
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      roundRectPath(ctx, px - headW / 2 + 2, headY + 4, headW - 4, 6, 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = n.eyeColor;
      ctx.beginPath();
      ctx.arc(px - 4, headY + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 4, headY + 7, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Antenna
      ctx.strokeStyle = n.head;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, headY);
      ctx.lineTo(px, headY - 8);
      ctx.stroke();
      ctx.fillStyle = n.eyeColor;
      ctx.beginPath();
      ctx.arc(px, headY - 9, 2, 0, Math.PI * 2);
      ctx.fill();

      // Name plate
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(px - 52, headY - 22, 104, 14);
      ctx.strokeStyle = n.head + "88";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px - 52, headY - 22, 104, 14);
      ctx.fillStyle = n.head;
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.name, px, headY - 12);
      ctx.textAlign = "left";
    };

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      const fr = frameRef.current;
      const vpW = canvas.width;
      const vpH = canvas.height;
      const groundTop = vpH - GROUND_Y;
      const ax = axRef.current;
      const keys = keysRef.current;

      if (rainRef.current.length === 0) rainRef.current = initRain(vpH);
      for (const d of rainRef.current) {
        d.y += d.speed;
        if (d.y > vpH) {
          d.y = -20;
          d.x = Math.random() * LEVEL_W;
        }
      }

      // Spawn embers from ground
      if (fr % 4 === 0 && embersRef.current.length < 20) {
        embersRef.current.push(spawnEmber(groundTop, camRef.current, vpW));
      }
      for (const e of embersRef.current) {
        e.y += e.vy;
        e.x += e.vx;
        e.life++;
      }
      embersRef.current = embersRef.current.filter((e) => e.life < e.maxLife);

      const sky = ctx.createLinearGradient(0, 0, 0, vpH);
      sky.addColorStop(0, "#1a0800");
      sky.addColorStop(1, "#0d0000");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, vpW, vpH);

      // Background buildings
      ctx.fillStyle = "rgba(120,53,15,0.35)";
      for (let i = 0; i < 8; i++) {
        const bx = (i * 200 - camRef.current * 0.1) % (vpW + 300) - 80;
        ctx.fillRect(bx, groundTop - 100 - (i % 3) * 12, 90 + (i % 2) * 40, 110);
      }
      ctx.fillStyle = "rgba(146,64,14,0.45)";
      for (let i = 0; i < 6; i++) {
        const bx = (i * 280 - camRef.current * 0.18) % (vpW + 400) - 100;
        ctx.fillRect(bx, groundTop - 140 - (i % 4) * 8, 70 + (i % 3) * 30, 150);
      }

      const cam = camRef.current;

      // Rain
      ctx.save();
      for (const d of rainRef.current) {
        const sx = d.x - cam;
        if (sx < -20 || sx > vpW + 20) continue;
        ctx.strokeStyle = "rgba(251,191,36,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, d.y);
        ctx.lineTo(sx - 1, d.y + d.length);
        ctx.stroke();
      }
      ctx.restore();

      // Ground
      ctx.fillStyle = "#1a0a00";
      ctx.fillRect(0, groundTop, vpW, GROUND_Y + 80);

      // Ground glow line
      const groundGlow = ctx.createLinearGradient(0, groundTop, 0, groundTop + 6);
      groundGlow.addColorStop(0, "rgba(251,191,36,0.5)");
      groundGlow.addColorStop(1, "transparent");
      ctx.fillStyle = groundGlow;
      ctx.fillRect(0, groundTop, vpW, 6);

      // Grid lines on ground
      ctx.strokeStyle = "rgba(251,191,36,0.12)";
      ctx.lineWidth = 1;
      for (let gx = -((cam | 0) % 48); gx < vpW; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, groundTop);
        ctx.lineTo(gx, vpH);
        ctx.stroke();
      }

      // Embers
      for (const e of embersRef.current) {
        const t = e.life / e.maxLife;
        const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
        const sx = e.x - cam;
        if (sx < -10 || sx > vpW + 10) continue;
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = t < 0.5 ? "#fbbf24" : "#f97316";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(sx, e.y, e.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Collectibles
      COLLECT_X.forEach((cx, idx) => {
        if (collectedRef.current[idx]) return;
        const sx = cx - cam;
        if (sx < -30 || sx > vpW + 30) return;
        const cy = groundTop - 28;
        ctx.save();
        ctx.translate(sx, cy);
        ctx.rotate(fr * 0.05);
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 10;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
        if (
          ax.x + AX_W > cx - 14 &&
          ax.x < cx + 14 &&
          ax.y + AX_H > cy - 14 &&
          ax.y < cy + 14
        ) {
          collectedRef.current[idx] = true;
          onXPRef.current(15);
          try { playSoundRef.current("collect"); } catch { /* silent */ }
        }
      });

      // NPCs
      for (const n of NPCS) {
        drawNpc(n, groundTop, cam, fr);
      }

      // Door
      const doorLeft = DOOR_X - cam;
      const isMobD = vpW < 768;
      const doorW = isMobD ? 40 : 60;
      const doorH = isMobD ? 80 : 120;
      const doorTop = groundTop - doorH;
      const urgent = pressureFiredRef.current;
      const pulse = urgent
        ? 10 + Math.sin(fr * 0.12) * 12
        : 10 + Math.sin(fr * 0.05) * 8;
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = talkedRef.current ? pulse : 4;
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.strokeRect(doorLeft, doorTop, doorW, doorH);
      ctx.shadowBlur = 0;
      if (talkedRef.current) {
        ctx.fillStyle = "#22d3ee";
        ctx.font = `bold ${isMobD ? 9 : 11}px monospace`;
        ctx.fillText("MISSION START →", doorLeft - 22, doorTop - 8);
        const axd = doorLeft + doorW + 10 + Math.sin(fr * (urgent ? 0.14 : 0.08)) * 8;
        ctx.fillText("→", axd, doorTop + doorH / 2);
      }
      ctx.restore();

      // AX physics
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

      if (ax.onGround) ax.coyoteTimer = COYOTE_FRAMES;
      else ax.coyoteTimer = Math.max(0, ax.coyoteTimer - 1);

      if (goJump && ax.coyoteTimer > 0) {
        ax.vy = JUMP_VY;
        ax.onGround = false;
        ax.coyoteTimer = 0;
        try { playSoundRef.current("jump"); } catch { /* silent */ }
      }

      camRef.current = Math.max(0, Math.min(LEVEL_W - vpW, ax.x - vpW * 0.35));

      // AX animation state tracking
      const newAnim: "idle" | "walk" | "jump" = !ax.onGround
        ? "jump"
        : Math.abs(ax.vx) > 0.05
        ? "walk"
        : "idle";
      const newFacing: "left" | "right" = ax.facingRight ? "right" : "left";
      if (newAnim !== lastAnimRef.current) {
        lastAnimRef.current = newAnim;
        queueMicrotask(() => setAxAnim(newAnim));
      }
      if (newFacing !== lastFacingRef.current) {
        lastFacingRef.current = newFacing;
        queueMicrotask(() => setAxFacing(newFacing));
      }

      // Position AX overlay via direct DOM (no re-render)
      const sax = ax.x - camRef.current;
      if (axOverlayRef.current) {
        axOverlayRef.current.style.transform = `translate(${sax}px, ${ax.y}px)`;
      }

      // NPC proximity
      const axc = ax.x + AX_W / 2;
      let near: NpcId | null = null;
      for (const n of NPCS) {
        if (Math.abs(axc - n.x) < NPC_PROX) {
          near = n.id;
          talkedRef.current = true;
          break;
        }
      }
      if (near !== nearNpcIdRef.current) {
        nearNpcIdRef.current = near;
        queueMicrotask(() => setActiveNpc(near));
      }

      // NPC bubble positioning
      const bubbleEl = bubbleRef.current;
      if (bubbleEl && near) {
        const n = NPCS.find((x) => x.id === near)!;
        const sx = n.x - camRef.current;
        bubbleEl.style.left = `${Math.min(Math.max(8, sx - 100), vpW - 300)}px`;
        bubbleEl.style.top = `${groundTop - 150}px`;
      }

      // Door proximity
      const doorCx = DOOR_X + 30;
      const inDoor =
        ax.onGround && Math.abs(axc - doorCx) < DOOR_PROX && !showNovaRef.current;
      if (inDoor && !wasInDoorRef.current) {
        queueMicrotask(() => tryDoorEnter());
      }
      wasInDoorRef.current = inDoor;

      // Pressure message timer
      const elapsed = (Date.now() - (startMsRef.current ?? Date.now())) / 1000;
      if (elapsed > 90 && !pressureFiredRef.current) {
        pressureFiredRef.current = true;
        queueMicrotask(() => {
          setPressureMsg(true);
          setTimeout(() => setPressureMsg(false), 5000);
        });
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [tryDoorEnter]);

  const npc = NPCS.find((n) => n.id === activeNpc);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0d0000",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* AX character HTML overlay — positioned via ref, no re-renders */}
      <div
        ref={axOverlayRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 8,
          willChange: "transform",
        }}
      >
        <AXCharacter animation={axAnim} facing={axFacing} size={typeof window !== "undefined" && window.innerWidth < 768 ? 0.7 : 1} />
      </div>

      {npc ? (
        <div
          ref={bubbleRef}
          style={{
            position: "absolute",
            left: 8,
            top: 100,
            maxWidth: 280,
            backgroundColor: "rgba(0,0,0,0.9)",
            color: "#fff",
            fontSize: 13,
            borderRadius: 12,
            padding: "12px 16px",
            border: "1px solid rgba(251,191,36,0.5)",
            zIndex: 20,
            pointerEvents: "none",
            lineHeight: 1.45,
          }}
        >
          <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11, marginBottom: 6 }}>
            {npc.name}
          </div>
          {npc.lines[bubbleLine]}
        </div>
      ) : null}

      {doorTip && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            color: "#fde68a",
            fontFamily: "monospace",
            fontSize: 15,
            fontWeight: 700,
            textAlign: "center",
            zIndex: 25,
            textShadow: "0 2px 8px #000",
          }}
        >
          Tip: Talk to the NPCs first!
        </div>
      )}

      {pressureMsg && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 100,
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid #fbbf24",
            color: "#fef3c7",
            padding: "10px 16px",
            borderRadius: 10,
            maxWidth: 400,
            fontFamily: "monospace",
            fontSize: 12,
            textAlign: "center",
            zIndex: 24,
          }}
        >
          NOVA: AX, we don&apos;t have much time! The timeline is collapsing. Head to the
          mission door!
        </div>
      )}

      {showMissionNova && (
        <DialogueBox
          character="NOVA"
          expression="explaining"
          text={
            "The History Vault is just ahead. Land on AI milestones in order. Restore what was erased. I'll be with you every step!"
          }
          onComplete={() => onComplete()}
        />
      )}
    </div>
  );
}
