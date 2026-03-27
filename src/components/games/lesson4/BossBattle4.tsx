"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DialogueBox from "./DialogueBox";
import type { GameData, AmmoType } from "./gameTypes";
import { useSoundEngine } from "./useSoundEngine";

interface Props {
  gameData: GameData;
  onUpdateGameData: (u: Partial<GameData>) => void;
  onComplete: () => void;
  onXP: (n: number) => void;
  onAmmoChange?: (a: AmmoType) => void;
}

const GRAVITY = 0.55;
const JUMP_VY = -13;
const AX_W = 44;
const AX_H = 64;
const MOVE = 3.4;
const BOSS_W = 120;
const BOSS_H = 130;
const PHASE_FR = 60;
const CYCLE = 180;
const BOSS_HP = 9;

type BossKind = "narrow" | "general" | "super";

interface PBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ammo: AmmoType;
  dead: boolean;
  trail: { x: number; y: number }[];
}

interface BProj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "beam" | "pellet" | "shock";
  dead: boolean;
  life: number;
  yBeam?: number;
}

export default function BossBattle4({
  gameData,
  onUpdateGameData,
  onComplete,
  onXP,
  onAmmoChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef(new Set<string>());
  const ammoRef = useRef<AmmoType>(null);
  const shootCd = useRef(0);
  const frameRef = useRef(0);
  const axRef = useRef({
    x: 80,
    y: 200,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    invuln: 0,
  });
  const bossHpRef = useRef(BOSS_HP);
  const projRef = useRef<PBullet[]>([]);
  const batRef = useRef<BProj[]>([]);
  const rafRef = useRef(0);
  const flagsRef = useRef({ win: false });
  const floorYRef = useRef(400);
  const atkRef = useRef(0);
  const playerHpRef = useRef(gameData.health);
  const [uiHp, setUiHp] = useState(gameData.health);
  const [briefN, setBriefN] = useState(5);
  const [showBrief, setShowBrief] = useState(true);
  const [winOpen, setWinOpen] = useState(false);
  const [bossUiHp, setBossUiHp] = useState(BOSS_HP);

  const showBriefRef = useRef(showBrief);
  showBriefRef.current = showBrief;

  const { playSound } = useSoundEngine();

  const setAmmo = (a: AmmoType) => {
    ammoRef.current = a;
    onAmmoChange?.(a);
  };

  useEffect(() => {
    if (!showBrief) return;
    if (briefN <= 0) {
      setShowBrief(false);
      return;
    }
    const t = setTimeout(() => setBriefN((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [showBrief, briefN]);

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      if (showBrief) return;
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
    const u = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBrief, playSound]);

  const damage = useCallback(
    (n: number) => {
      if (axRef.current.invuln > 0) return;
      const before = playerHpRef.current;
      const h = Math.max(0, before - n);
      if (h === before) return;
      playerHpRef.current = h;
      axRef.current.invuln = 45;
      setUiHp(h);
      onUpdateGameData({ health: h });
      playSound("wrong");
    },
    [onUpdateGameData, playSound]
  );

  const damageRef = useRef(damage);
  damageRef.current = damage;
  const onXPRef = useRef(onXP);
  onXPRef.current = onXP;
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;
  const lastBossPhaseRef = useRef<BossKind | null>(null);

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
      axRef.current.x = W * 0.2;
      bossHpRef.current = BOSS_HP;
      setBossUiHp(BOSS_HP);
    };
    resize();
    window.addEventListener("resize", resize);

    const bossPhase = (fr: number): BossKind => {
      const p = Math.floor((fr % CYCLE) / PHASE_FR);
      if (p === 0) return "narrow";
      if (p === 1) return "general";
      return "super";
    };

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const W0 = canvas.width;
      const H0 = canvas.height;
      if (showBriefRef.current) {
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, W0, H0);
        return;
      }
      frameRef.current++;
      const fr = frameRef.current;
      const W = W0;
      const H = H0;
      const floor = floorYRef.current;
      const ax = axRef.current;
      const keys = keysRef.current;
      const bx = W - BOSS_W - 36;
      const by = floor - BOSS_H;
      const phase = bossPhase(fr);
      const phIdx = Math.floor((fr % CYCLE) / PHASE_FR);
      if (lastBossPhaseRef.current !== phase) {
        if (lastBossPhaseRef.current !== null) {
          playSoundRef.current("gateOpen");
        }
        lastBossPhaseRef.current = phase;
      }

      if (flagsRef.current.win) {
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, W, H);
        return;
      }

      if (ax.invuln > 0) ax.invuln--;

      ax.vx = 0;
      if (keys.has("ArrowLeft")) {
        ax.vx = -MOVE;
        ax.facing = -1;
      }
      if (keys.has("ArrowRight")) {
        ax.vx = MOVE;
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
      if (ax.y + AX_H >= floor) {
        ax.y = floor - AX_H;
        ax.vy = 0;
        ax.onGround = true;
      }
      ax.x = Math.max(20, Math.min(W - AX_W - 20, ax.x));

      atkRef.current++;
      const at = atkRef.current;

      if (phase === "narrow" && at % 70 === 0) {
        const beamY = by + BOSS_H * 0.55;
        batRef.current.push({
          x: 0,
          y: beamY,
          vx: 0,
          vy: 0,
          kind: "beam",
          dead: false,
          life: 28,
          yBeam: beamY,
        });
      }
      if (phase === "general" && at % 55 === 0) {
        const ox = bx;
        const oy = by + BOSS_H * 0.4;
        for (let a = -0.35; a <= 0.35; a += 0.35) {
          batRef.current.push({
            x: ox,
            y: oy,
            vx: Math.cos(a) * -6,
            vy: Math.sin(a) * 3,
            kind: "pellet",
            dead: false,
            life: 90,
          });
        }
      }
      if (phase === "super" && at % 65 === 0) {
        const beamY = by + BOSS_H * 0.5;
        batRef.current.push({
          x: 0,
          y: beamY,
          vx: 0,
          vy: 0,
          kind: "beam",
          dead: false,
          life: 22,
          yBeam: beamY,
        });
        const ox = bx;
        const oy = by + BOSS_H * 0.35;
        for (let a = -0.5; a <= 0.5; a += 0.5) {
          batRef.current.push({
            x: ox,
            y: oy,
            vx: Math.cos(a) * -7,
            vy: Math.sin(a) * 3.5,
            kind: "pellet",
            dead: false,
            life: 85,
          });
        }
        batRef.current.push({
          x: 0,
          y: floor - 4,
          vx: 5,
          vy: 0,
          kind: "shock",
          dead: false,
          life: 90,
        });
      }

      const axcx = ax.x + AX_W / 2;
      const axfeet = ax.y + AX_H;

      for (const b of batRef.current) {
        if (b.dead) continue;
        b.life--;
        if (b.life <= 0) {
          b.dead = true;
          continue;
        }
        if (ax.invuln <= 0) {
          if (b.kind === "beam") {
            const yb = b.yBeam ?? b.y;
            const inBand = ax.y + AX_H > yb - 4 && ax.y < yb + 12;
            if (inBand && axfeet >= yb - 2) {
              damageRef.current(10);
              b.dead = true;
            }
          } else if (b.kind === "pellet") {
            b.x += b.vx;
            b.y += b.vy;
            if (
              b.x > ax.x &&
              b.x < ax.x + AX_W &&
              b.y > ax.y &&
              b.y < ax.y + AX_H
            ) {
              damageRef.current(8);
              b.dead = true;
            }
          } else if (b.kind === "shock") {
            b.x += b.vx;
            if (ax.onGround && Math.abs(axcx - b.x) < 40 && b.x > ax.x - 20) {
              damageRef.current(10);
              b.dead = true;
            }
          }
        } else if (b.kind !== "beam") {
          if (b.kind === "pellet") {
            b.x += b.vx;
            b.y += b.vy;
          } else if (b.kind === "shock") {
            b.x += b.vx;
          }
        }
      }
      batRef.current = batRef.current.filter((b) => !b.dead && b.x < W + 50);

      if (shootCd.current > 0) shootCd.current--;
      if (keys.has("KeyZ") && shootCd.current <= 0 && ammoRef.current) {
        shootCd.current = 12;
        const spd =
          ammoRef.current === "narrow" ? 11 : ammoRef.current === "general" ? 9 : 7;
        projRef.current.push({
          x: ax.x + (ax.facing > 0 ? AX_W : 0),
          y: ax.y + AX_H / 2,
          vx: spd * ax.facing,
          vy: 0,
          ammo: ammoRef.current,
          dead: false,
          trail: [],
        });
        playSoundRef.current("shoot");
      }

      for (const p of projRef.current) {
        if (p.dead) continue;
        const prevX = p.x;
        p.x += p.vx;
        if (p.ammo === "general") {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 10) p.trail.shift();
        }
        const yHit = p.y > by && p.y < by + BOSS_H;
        if (yHit) {
          const minX = Math.min(prevX, p.x);
          const maxX = Math.max(prevX, p.x);
          if (maxX >= bx && minX <= bx + BOSS_W) {
            p.dead = true;
            const match = p.ammo != null && p.ammo === phase;
            if (match) {
              bossHpRef.current -= 1;
              setBossUiHp(bossHpRef.current);
              playSoundRef.current("bossHit");
              onXPRef.current(30);
              if (bossHpRef.current <= 0) {
                playSoundRef.current("victory");
                flagsRef.current.win = true;
                setWinOpen(true);
              }
            } else {
              playSoundRef.current("enemyHit");
            }
          }
        }
        if (p.x < -40 || p.x > W + 40) p.dead = true;
      }
      projRef.current = projRef.current.filter((p) => !p.dead);

      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, floor, W, H - floor);

      const segW = BOSS_W / 3;
      const dim = 0.35;
      const br = (i: number) => (phIdx === i ? 1 : dim);
      ctx.fillStyle = `rgba(124,58,237,${0.4 + br(0) * 0.45})`;
      ctx.fillRect(bx, by, segW, BOSS_H);
      ctx.fillStyle = `rgba(180,83,9,${0.4 + br(1) * 0.45})`;
      ctx.fillRect(bx + segW, by, segW, BOSS_H);
      ctx.fillStyle = `rgba(153,27,27,${0.4 + br(2) * 0.45})`;
      ctx.fillRect(bx + 2 * segW, by, segW, BOSS_H);
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, BOSS_W, BOSS_H);

      const label =
        phase === "narrow"
          ? "CURRENT TYPE: NARROW AI"
          : phase === "general"
            ? "CURRENT TYPE: GENERAL AI"
            : "CURRENT TYPE: SUPER AI";
      const lc =
        phase === "narrow" ? "#c4b5fd" : phase === "general" ? "#fcd34d" : "#fecaca";
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = lc;
      ctx.textAlign = "center";
      ctx.fillText(label, bx + BOSS_W / 2, by - 10);
      ctx.textAlign = "left";

      ctx.fillStyle = "#0ea5e9";
      for (const b of batRef.current) {
        if (b.kind === "beam" && b.yBeam !== undefined) {
          ctx.fillRect(0, b.yBeam - 3, W, 6);
        } else if (b.kind === "pellet") {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.kind === "shock") {
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(b.x, floor);
          ctx.lineTo(b.x + 60, floor);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#64748b";
      ctx.fillRect(ax.x, ax.y, AX_W, AX_H);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(ax.x + (ax.facing > 0 ? 22 : 10), ax.y + 12, 12, 6);

      for (const p of projRef.current) {
        if (p.ammo === "general") {
          for (const t of p.trail) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(245,158,11,0.35)";
            ctx.fill();
          }
        }
        ctx.save();
        if (p.ammo === "super") {
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 12;
        }
        const r = p.ammo === "narrow" ? 5 : p.ammo === "general" ? 7 : 9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.ammo === "narrow" ? "#7c3aed" : p.ammo === "general" ? "#f59e0b" : "#ef4444";
        ctx.fill();
        ctx.restore();
      }

      const boxY = H - 64;
      const bw = 92;
      const gap = 8;
      const startX = (W - (bw * 3 + gap * 2)) / 2;
      const cur = ammoRef.current;
      for (let i = 0; i < 3; i++) {
        const kinds: AmmoType[] = ["narrow", "general", "super"];
        const k = kinds[i]!;
        const sel = cur === k;
        const x0 = startX + i * (bw + gap);
        ctx.fillStyle =
          k === "narrow" ? "#7c3aed" : k === "general" ? "#b45309" : "#991b1b";
        ctx.strokeStyle = sel ? "#fff" : "rgba(255,255,255,0.3)";
        ctx.lineWidth = sel ? 3 : 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(x0, boxY, bw, 40, 6);
        else ctx.rect(x0, boxY, bw, 40);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1} ${k.toUpperCase()}`, x0 + bw / 2, boxY + 25);
        ctx.textAlign = "left";
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const bc = briefN > 0 ? briefN : 1;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {showBrief && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            flexDirection: "column",
            color: "#e2e8f0",
            fontFamily: "monospace",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 900, color: "#facc15" }}>⚡ FINAL BOSS: THE UNDEFINED</div>
          <div style={{ marginTop: 12, fontSize: 15 }}>It doesn&apos;t know what type it is!</div>
          <div style={{ marginTop: 20, lineHeight: 1.7, maxWidth: 400, fontSize: 14 }}>
            Watch the label above the boss
            <br />
            Match your ammo to its current type
            <br />
            Press 1=Narrow 2=General 3=Super
            <br />
            Then press Z to fire
          </div>
          <div style={{ marginTop: 24, fontSize: 18, color: "#facc15", fontWeight: 700 }}>Starting in {bc}…</div>
        </div>
      )}

      {winOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 36,
            zIndex: 40,
          }}
        >
          <DialogueBox
            character="NOVA"
            text={
              "You classified every AI type perfectly, AX!\nNarrow AI does one job brilliantly.\nGeneral AI is still a dream.\nSuper AI is science fiction — for now.\nYou've completed the demo program!"
            }
            onComplete={() => onComplete()}
          />
        </motion.div>
      )}

      <div style={{ position: "absolute", top: 8, right: 10, fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
        HP {uiHp} · BOSS {bossUiHp}
      </div>
    </div>
  );
}
