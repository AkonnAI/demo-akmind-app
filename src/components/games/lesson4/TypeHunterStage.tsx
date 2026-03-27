"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GameData, AmmoType } from "./gameTypes";
import { useSoundEngine } from "./useSoundEngine";
import AXCharacter from "@/components/games/shared/AXCharacter";

const LEVEL_W = 2100;
const GRAVITY = 0.6;
const JUMP_VY = -14;
const MOVE_SPD = 3;
const AX_W = 44;
const AX_H = 64;
const GROUND_PAD = 80;

type AIKind = "narrow" | "general" | "super";

interface Plat {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Enemy {
  id: number;
  kind: AIKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  tag: string;
  flash: number;
  dead: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ammo: AmmoType;
  trail: { x: number; y: number }[];
  life: number;
  dead: boolean;
  bounceBack: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const NARROW_TAGS = ["Spam Filter", "Chess Bot", "Face ID", "Translator"];

function buildPlatforms(groundTop: number): Plat[] {
  const gy = (lift: number) => groundTop - lift;
  return [
    { x: 100, y: gy(110), w: 180, h: 16 },
    { x: 340, y: gy(130), w: 180, h: 16 },
    { x: 520, y: gy(120), w: 200, h: 16 },
    { x: 720, y: gy(130), w: 180, h: 16 },
    { x: 920, y: gy(110), w: 200, h: 16 },
    { x: 1120, y: gy(130), w: 180, h: 16 },
    { x: 1280, y: gy(110), w: 220, h: 16 },
    { x: 1520, y: gy(130), w: 200, h: 16 },
    { x: 1760, y: gy(120), w: 240, h: 16 },
  ];
}

function makeEnemy(id: number, kind: AIKind, x: number, groundTop: number): Enemy {
  let w = 24;
  let h = 36;
  let tag = "";
  let hp = 1;
  if (kind === "general") {
    w = 36;
    h = 52;
    tag = "AGI (Doesn't exist yet!)";
    hp = 2;
  } else if (kind === "super") {
    w = 48;
    h = 64;
    tag = "ASI (Science Fiction!)";
    hp = 3;
  } else {
    tag = NARROW_TAGS[Math.floor(Math.random() * NARROW_TAGS.length)]!;
  }
  return {
    id,
    kind,
    x,
    y: groundTop - h,
    w,
    h,
    hp,
    tag,
    flash: 0,
    dead: false,
  };
}

function buildEnemies(groundTop: number): Enemy[] {
  let id = 0;
  const e = (
    kind: AIKind,
    x: number
  ) =>
    makeEnemy(++id, kind, x, groundTop);
  return [
    ...[e("narrow", 350), e("general", 430), e("narrow", 510)],
    ...[e("super", 720), e("narrow", 810), e("general", 900)],
    ...[e("general", 1120), e("super", 1220), e("narrow", 1330)],
    ...[e("narrow", 1520), e("super", 1620), e("general", 1730)],
  ];
}

interface Props {
  gameData: GameData;
  onUpdateGameData: (u: Partial<GameData>) => void;
  onComplete: () => void;
  onXP: (n: number) => void;
  onAmmoChange?: (a: AmmoType) => void;
}

export default function TypeHunterStage({
  gameData,
  onUpdateGameData,
  onComplete,
  onXP,
  onAmmoChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axWrapRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef(new Set<string>());
  const rafRef = useRef(0);
  const camRef = useRef(0);
  const axRef = useRef({
    x: 60,
    y: 300,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    invTimer: 0,
  });
  const ammoRef = useRef<AmmoType>(null);
  const shootCd = useRef(0);
  const enemiesRef = useRef<Enemy[]>([]);
  const platRef = useRef<Plat[]>([]);
  const projRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gate1Ref = useRef(false);
  const gate2Ref = useRef(false);
  const completedRef = useRef(false);
  const pausedRef = useRef(false);
  const healthRef = useRef(gameData.health);
  const [uiHealth, setUiHealth] = useState(gameData.health);
  const [gateModal, setGateModal] = useState<null | 1 | 2>(null);
  const [warnText, setWarnText] = useState<null | { msg: string; color: string }>(null);
  const [novaToast, setNovaToast] = useState<string | null>(null);
  const [axAnim, setAxAnim] = useState<"idle" | "walk" | "jump" | "hit">("idle");
  const [axFacing, setAxFacing] = useState<"left" | "right">("right");
  const lastFacingRef = useRef<"left" | "right">("right");
  const lastAnimRef = useRef<"idle" | "walk" | "jump" | "hit">("idle");
  const frameRef = useRef(0);

  const { playSound } = useSoundEngine();

  useEffect(() => {
    healthRef.current = gameData.health;
  }, [gameData.health]);

  const setAmmo = (a: AmmoType) => {
    ammoRef.current = a;
    onAmmoChange?.(a);
  };

  const flashWarn = (msg: string, color: string) => {
    setWarnText({ msg, color });
    setTimeout(() => setWarnText(null), 2000);
  };

  const resolveGate = (gate: 1 | 2, choice: number) => {
    const ok =
      gate === 1 ? choice === 0 : choice === 1;
    if (ok) {
      if (gate === 1) gate1Ref.current = true;
      else gate2Ref.current = true;
      playSound("gateOpen");
      onXP(40);
      pausedRef.current = false;
      setGateModal(null);
    } else {
      const hp = Math.max(0, healthRef.current - 8);
      healthRef.current = hp;
      setUiHealth(hp);
      onUpdateGameData({ health: hp });
      playSound("wrong");
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (gateModalRef.current) return;
      if (e.code === "Digit1" || e.code === "Numpad1") {
        e.preventDefault();
        setAmmo("narrow");
        playSound("collect");
      }
      if (e.code === "Digit2" || e.code === "Numpad2") {
        e.preventDefault();
        setAmmo("general");
        playSound("collect");
      }
      if (e.code === "Digit3" || e.code === "Numpad3") {
        e.preventDefault();
        setAmmo("super");
        playSound("collect");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setAmmo stable
  }, [playSound]);

  const onCompleteRef = useRef(onComplete);
  const onUpdateRef = useRef(onUpdateGameData);
  const onXPRef = useRef(onXP);
  const playSoundRef = useRef(playSound);
  const gateModalRef = useRef<null | 1 | 2>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onUpdateRef.current = onUpdateGameData;
    onXPRef.current = onXP;
    playSoundRef.current = playSound;
    gateModalRef.current = gateModal;
  }, [onComplete, onUpdateGameData, onXP, playSound, gateModal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      const W = Math.max(640, r?.width ?? 800);
      const H = Math.max(380, r?.height ?? 500);
      canvas.width = W;
      canvas.height = H;
      const groundTop = H - GROUND_PAD;
      platRef.current = buildPlatforms(groundTop);
      enemiesRef.current = buildEnemies(groundTop);
      axRef.current.y = groundTop - AX_H;
      axRef.current.x = 60;
      gate1Ref.current = false;
      gate2Ref.current = false;
      completedRef.current = false;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      const fr = frameRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const groundTop = H - GROUND_PAD;
      const ax = axRef.current;
      const keys = keysRef.current;
      const paused = pausedRef.current;

      if (!paused) {
        if (ax.x > 520 && ax.x < 680 && !gate1Ref.current) {
          pausedRef.current = true;
          queueMicrotask(() => setGateModal(1));
        } else if (ax.x > 1280 && ax.x < 1480 && !gate2Ref.current) {
          pausedRef.current = true;
          queueMicrotask(() => setGateModal(2));
        }
      }

      if (!paused) {
        ax.vx = 0;
        if (keys.has("ArrowLeft")) {
          ax.vx = -MOVE_SPD;
          ax.facing = -1;
        }
        if (keys.has("ArrowRight")) {
          ax.vx = MOVE_SPD;
          ax.facing = 1;
        }
        if ((keys.has("ArrowUp") || keys.has("Space")) && ax.onGround) {
          ax.vy = JUMP_VY;
          ax.onGround = false;
          playSoundRef.current("jump");
        }
        ax.vy = Math.min(ax.vy + GRAVITY, 14);
        ax.x += ax.vx;
        ax.y += ax.vy;
        ax.x = Math.max(0, Math.min(LEVEL_W - AX_W, ax.x));

        ax.onGround = false;
        if (ax.y + AX_H >= groundTop) {
          ax.y = groundTop - AX_H;
          ax.vy = 0;
          ax.onGround = true;
        }
        for (const p of platRef.current) {
          if (
            ax.x + AX_W > p.x &&
            ax.x < p.x + p.w &&
            ax.y + AX_H >= p.y &&
            ax.y + AX_H <= p.y + p.h + 12 &&
            ax.vy >= -0.1
          ) {
            ax.y = p.y - AX_H;
            ax.vy = 0;
            ax.onGround = true;
          }
        }

        if (shootCd.current > 0) shootCd.current--;
        if (keys.has("KeyZ") && shootCd.current <= 0 && ammoRef.current) {
          shootCd.current = 14;
          const spd =
            ammoRef.current === "narrow" ? 12 : ammoRef.current === "general" ? 10 : 8;
          projRef.current.push({
            x: ax.x + (ax.facing > 0 ? AX_W : 0),
            y: ax.y + AX_H / 2,
            vx: spd * ax.facing,
            vy: 0,
            ammo: ammoRef.current,
            trail: [],
            life: 100,
            dead: false,
            bounceBack: false,
          });
          playSoundRef.current("shoot");
        }

        if (ax.invTimer > 0) ax.invTimer--;
      }

      // Update animation state
      {
        const newAnim: "idle" | "walk" | "jump" | "hit" =
          ax.invTimer > 0 ? "hit" :
          !ax.onGround ? "jump" :
          Math.abs(ax.vx) > 0.05 ? "walk" : "idle";
        const newFacing: "left" | "right" = ax.facing < 0 ? "left" : "right";
        if (newAnim !== lastAnimRef.current) {
          lastAnimRef.current = newAnim;
          queueMicrotask(() => setAxAnim(newAnim));
        }
        if (newFacing !== lastFacingRef.current) {
          lastFacingRef.current = newFacing;
          queueMicrotask(() => setAxFacing(newFacing));
        }
      }

      camRef.current = Math.max(
        0,
        Math.min(LEVEL_W - W, ax.x + AX_W / 2 - W / 2)
      );
      const cam = camRef.current;

      for (const en of enemiesRef.current) {
        if (en.flash > 0) en.flash--;
      }

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      if (!paused) {
        for (const pr of projRef.current) {
          if (pr.dead) continue;
          pr.x += pr.vx;
          pr.y += pr.vy;
          pr.life--;
          if (pr.ammo === "general") {
            pr.trail.push({ x: pr.x, y: pr.y });
            if (pr.trail.length > 12) pr.trail.shift();
          }
          if (pr.life <= 0) pr.dead = true;

          const hitAx =
            pr.bounceBack &&
            pr.x > ax.x - 8 &&
            pr.x < ax.x + AX_W + 8 &&
            pr.y > ax.y - 8 &&
            pr.y < ax.y + AX_H + 8;
          if (hitAx) {
            pr.dead = true;
            const hp = Math.max(0, healthRef.current - 5);
            healthRef.current = hp;
            setUiHealth(hp);
            onUpdateRef.current({ health: hp });
            playSoundRef.current("wrong");
            ax.invTimer = 30;
          }

          if (pr.dead) continue;
          if (pr.x < -20 || pr.x > LEVEL_W + 20) pr.dead = true;

          for (const en of enemiesRef.current) {
            if (en.dead) continue;
            if (
              pr.x > en.x &&
              pr.x < en.x + en.w &&
              pr.y > en.y &&
              pr.y < en.y + en.h
            ) {
              const match = pr.ammo === en.kind;
              if (!match) {
                const dx = ax.x + AX_W / 2 - pr.x;
                const mag = Math.hypot(dx, 1) || 1;
                pr.vx = (dx / mag) * 8;
                pr.vy = -2;
                pr.bounceBack = true;
                en.flash = 10;
                playSoundRef.current("wrong");
                let hint = "";
                let col = "#fff";
                if (pr.ammo === "narrow" && en.kind === "general") {
                  hint = "Wrong! Use GENERAL ammo (2 key)!";
                  col = "#fbbf24";
                } else if (pr.ammo === "narrow" && en.kind === "super") {
                  hint = "Wrong! Use SUPER ammo (3 key)!";
                  col = "#f87171";
                } else if (pr.ammo === "general" && en.kind === "narrow") {
                  hint = "Wrong! Use NARROW ammo (1 key)!";
                  col = "#c4b5fd";
                } else if (pr.ammo === "general" && en.kind === "super") {
                  hint = "Wrong! Use SUPER ammo (3 key)!";
                  col = "#f87171";
                } else if (pr.ammo === "super" && en.kind === "narrow") {
                  hint = "Wrong! Use NARROW ammo (1 key)!";
                  col = "#c4b5fd";
                } else if (pr.ammo === "super" && en.kind === "general") {
                  hint = "Wrong! Use GENERAL ammo (2 key)!";
                  col = "#fbbf24";
                } else {
                  hint = `Wrong! Match ${en.kind.toUpperCase()} ammo!`;
                  col = "#94a3b8";
                }
                flashWarn(hint, col);
              } else {
                en.hp -= 1;
                en.flash = 14;
                pr.dead = true;
                playSoundRef.current("correct");
                if (en.hp <= 0) {
                  en.dead = true;
                  playSoundRef.current("xpCollect");
                  onXPRef.current(25);
                  for (let i = 0; i < 16; i++) {
                    particlesRef.current.push({
                      x: en.x + en.w / 2,
                      y: en.y + en.h / 2,
                      vx: (Math.random() - 0.5) * 6,
                      vy: (Math.random() - 0.5) * 6,
                      life: 28 + Math.floor(Math.random() * 14),
                      color:
                        en.kind === "narrow"
                          ? "#a78bfa"
                          : en.kind === "general"
                            ? "#fcd34d"
                            : "#fca5a5",
                    });
                  }
                  const nova =
                    en.kind === "narrow"
                      ? "Narrow AI — one task only!"
                      : en.kind === "general"
                        ? "AGI doesn't exist yet!"
                        : "ASI is still science fiction!";
                  setNovaToast(nova);
                  setTimeout(() => setNovaToast(null), 2400);
                }
              }
              break;
            }
          }
        }
      }
      projRef.current = projRef.current.filter((p) => !p.dead);

      if (
        !completedRef.current &&
        gate1Ref.current &&
        gate2Ref.current &&
        enemiesRef.current.every((en) => en.dead)
      ) {
        completedRef.current = true;
        pausedRef.current = true;
        queueMicrotask(() => onCompleteRef.current());
      }

      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(-cam, 0);

      const grd = ctx.createLinearGradient(0, 0, LEVEL_W, 0);
      grd.addColorStop(0, "rgba(88,28,135,0.25)");
      grd.addColorStop(0.5, "rgba(120,53,15,0.2)");
      grd.addColorStop(1, "rgba(127,29,29,0.25)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, LEVEL_W, H);

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, groundTop, LEVEL_W, GROUND_PAD + 40);

      for (const p of platRef.current) {
        ctx.fillStyle = "#334155";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = "#64748b";
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }

      for (const en of enemiesRef.current) {
        if (en.dead) continue;
        const col =
          en.kind === "narrow"
            ? "#7c3aed"
            : en.kind === "general"
              ? "#b45309"
              : "#991b1b";
        if (en.flash > 0 && fr % 3 === 0) {
          ctx.fillStyle = "#fff";
        } else {
          ctx.fillStyle = col;
        }
        ctx.fillRect(en.x, en.y, en.w, en.h);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        const label =
          en.kind === "narrow"
            ? "NARROW AI"
            : en.kind === "general"
              ? "GENERAL AI"
              : "SUPER AI";
        ctx.fillText(label, en.x + en.w / 2, en.y - 6);
        ctx.font = "9px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(en.tag, en.x + en.w / 2, en.y + en.h + 14);
        ctx.textAlign = "left";
      }

      for (const pr of projRef.current) {
        if (pr.dead) continue;
        if (pr.ammo === "general") {
          for (const tr of pr.trail) {
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(245,158,11,0.35)";
            ctx.fill();
          }
        }
        ctx.save();
        if (pr.ammo === "super") {
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 12 + Math.sin(fr * 0.2) * 4;
        }
        const r =
          pr.ammo === "narrow" ? 5 : pr.ammo === "general" ? 7 : 9;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
        ctx.fillStyle =
          pr.ammo === "narrow"
            ? "#7c3aed"
            : pr.ammo === "general"
              ? "#f59e0b"
              : "#ef4444";
        ctx.fill();
        ctx.restore();
      }

      for (const p of particlesRef.current) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.life / 20);
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      const cur = ammoRef.current;
      const boxY = H - 72;
      const bw = 100;
      const gap = 10;
      const startX = (W - (bw * 3 + gap * 2)) / 2;
      for (let i = 0; i < 3; i++) {
        const kinds: AmmoType[] = ["narrow", "general", "super"];
        const k = kinds[i]!;
        const sel = cur === k;
        const x0 = startX + i * (bw + gap);
        ctx.fillStyle =
          k === "narrow" ? "#7c3aed" : k === "general" ? "#b45309" : "#991b1b";
        ctx.strokeStyle = sel ? "#ffffff" : "rgba(255,255,255,0.35)";
        ctx.lineWidth = sel ? 3 : 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x0, boxY, bw, 44, 8);
        } else {
          ctx.rect(x0, boxY, bw, 44);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1} ${k.toUpperCase()}`, x0 + bw / 2, boxY + 28);
        ctx.textAlign = "left";
      }

      const wrap = axWrapRef.current;
      if (wrap) {
        wrap.style.transform = `translate(${ax.x - cam}px, ${ax.y}px)`;
        wrap.style.opacity = ax.invTimer > 0 && Math.floor(ax.invTimer / 6) % 2 === 0 ? "0.3" : "1";
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }} />
      <div
        ref={axWrapRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: AX_W,
          height: AX_H,
          pointerEvents: "none",
          transformOrigin: `${AX_W / 2}px ${AX_H}px`,
          zIndex: 5,
        }}
      >
        <AXCharacter animation={axAnim} facing={axFacing} size={1.1} />
      </div>

      {warnText && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            transform: "translate(-50%, -50%)",
            color: warnText.color,
            fontFamily: "monospace",
            fontSize: 18,
            fontWeight: 800,
            textAlign: "center",
            zIndex: 20,
            textShadow: "0 2px 12px #000",
            maxWidth: 440,
            pointerEvents: "none",
          }}
        >
          {warnText.msg}
        </div>
      )}

      {novaToast && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            border: "1px solid #a855f7",
            color: "#e9d5ff",
            padding: "8px 16px",
            fontFamily: "monospace",
            fontSize: 12,
            zIndex: 18,
          }}
        >
          NOVA: {novaToast}
        </motion.div>
      )}

      {gateModal === 1 && (
        <GateModal
          title="Gate 1"
          q="Siri answering questions is an example of..."
          options={[
            "Narrow AI — does one specific task",
            "General AI — does everything",
            "Super AI — smarter than humans",
          ]}
          onPick={(i) => resolveGate(1, i)}
        />
      )}
      {gateModal === 2 && (
        <GateModal
          title="Gate 2"
          q="Which type of AI does NOT exist yet?"
          options={["Narrow AI", "General AI (AGI)", "Voice assistants"]}
          onPick={(i) => resolveGate(2, i)}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontFamily: "monospace",
          fontSize: 11,
          color: "#94a3b8",
          zIndex: 8,
        }}
      >
        HP {uiHealth}
      </div>
    </div>
  );
}

function GateModal({
  title,
  q,
  options,
  onPick,
}: {
  title: string;
  q: string;
  options: string[];
  onPick: (i: number) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          background: "#0f172a",
          border: "2px solid #a855f7",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div style={{ color: "#c4b5fd", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>{title}</div>
        <p style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 14, marginBottom: 16 }}>{q}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map((o, i) => (
            <button
              key={o}
              type="button"
              onClick={() => onPick(i)}
              style={{
                padding: 12,
                background: "#1e293b",
                border: "1px solid #64748b",
                borderRadius: 8,
                color: "#e2e8f0",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
