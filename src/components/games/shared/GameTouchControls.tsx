"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Synthetic keyboard event helper ── */
function fireKey(type: "keydown" | "keyup", key: string, code: string) {
  try {
    window.dispatchEvent(
      new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })
    );
  } catch {
    /* silent */
  }
}

export type GameTouchVariant = "default" | "divide" | "typehunter";

interface GameTouchControlsProps {
  visible: boolean;
  variant?: GameTouchVariant;
  showBossQuizRow?: boolean;
}

const SCANLINES: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.02) 3px,rgba(255,255,255,0.02) 4px)",
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  pointerEvents: "none",
};

/* ── Circular sci-fi button ── */
interface CircleBtnProps {
  size?: number;
  bgIdle: string;
  bgActive: string;
  border: string;
  shadow: string;
  shadowActive: string;
  active: boolean;
  label: string;
  sublabel?: string;
  sublabelColor?: string;
  icon: React.ReactNode;
  onDown: () => void;
  onUp: () => void;
}

function CircleBtn({
  size = 56, bgIdle, bgActive, border, shadow, shadowActive,
  active, label, sublabel, sublabelColor = "#94a3b8", icon,
  onDown, onUp,
}: CircleBtnProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pointerEvents: "auto" }}>
      <button
        type="button"
        aria-label={label}
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          background: active ? bgActive : bgIdle,
          border: `2px solid ${border}`,
          boxShadow: active ? shadowActive : shadow,
          transform: active ? "scale(0.92)" : "scale(1)",
          transition: "transform 0.08s, box-shadow 0.08s, background 0.08s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "none",
          userSelect: "none",
          overflow: "hidden",
          flexShrink: 0,
        }}
        onTouchStart={(e) => { e.preventDefault(); onDown(); }}
        onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
        onTouchCancel={() => onUp()}
        onMouseDown={onDown}
        onMouseUp={onUp}
        onMouseLeave={() => onUp()}
      >
        <div style={SCANLINES} />
        {icon}
      </button>
      {sublabel && (
        <span style={{
          fontFamily: "monospace",
          fontSize: 9,
          letterSpacing: 1,
          color: sublabelColor,
          fontWeight: 700,
          textTransform: "uppercase",
          marginTop: 0,
        }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

/* ── Small pill button (H/A, ammo selectors) ── */
interface PillBtnProps {
  w?: number;
  h?: number;
  bg: string;
  border: string;
  active?: boolean;
  label: string;
  labelColor: string;
  dot?: string;
  icon?: React.ReactNode;
  onDown: () => void;
  onUp: () => void;
}

function PillBtn({ w = 48, h = 36, bg, border, active, label, labelColor, dot, icon, onDown, onUp }: PillBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      style={{
        width: w,
        height: h,
        borderRadius: 10,
        background: bg,
        border: `2px solid ${border}`,
        boxShadow: active ? `0 0 12px ${border}` : `0 0 4px ${border}55`,
        transform: active ? "scale(1.1)" : "scale(1)",
        transition: "transform 0.08s, box-shadow 0.08s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        touchAction: "none",
        userSelect: "none",
        flexShrink: 0,
      }}
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
      onTouchCancel={() => onUp()}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={() => onUp()}
    >
      {icon ?? (
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15, color: labelColor, lineHeight: 1 }}>
          {label}
        </span>
      )}
      {dot && (
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════
   Main component
══════════════════════════════════════════ */
export default function GameTouchControls({
  visible,
  variant = "default",
  showBossQuizRow = false,
}: GameTouchControlsProps) {
  const [showControls, setShowControls] = useState(false);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Only show on real phones/tablets — not desktop browsers
    const isTouchDevice =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
    setShowControls(isTouchDevice);
  }, []);

  const press = useCallback((id: string, down: boolean, key: string, code: string) => {
    setPressed((p) => ({ ...p, [id]: down }));
    fireKey(down ? "keydown" : "keyup", key, code);
  }, []);

  if (!visible || !showControls) return null;

  const is = (id: string) => !!pressed[id];

  /* ── Left D-pad ── */
  const leftBtn = (
    <CircleBtn
      size={56}
      active={is("left")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.4), rgba(49,46,129,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.8), rgba(49,46,129,1))"
      border="rgba(99,102,241,0.6)"
      shadow="0 0 12px rgba(99,102,241,0.3)"
      shadowActive="0 0 22px rgba(99,102,241,0.6)"
      label="Left"
      icon={
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M15 18l-6-6 6-6" stroke="#a5b4fc" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("left", true, "ArrowLeft", "ArrowLeft")}
      onUp={() => press("left", false, "ArrowLeft", "ArrowLeft")}
    />
  );

  const rightBtn = (
    <CircleBtn
      size={56}
      active={is("right")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.4), rgba(49,46,129,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.8), rgba(49,46,129,1))"
      border="rgba(99,102,241,0.6)"
      shadow="0 0 12px rgba(99,102,241,0.3)"
      shadowActive="0 0 22px rgba(99,102,241,0.6)"
      label="Right"
      icon={
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M9 18l6-6-6-6" stroke="#a5b4fc" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("right", true, "ArrowRight", "ArrowRight")}
      onUp={() => press("right", false, "ArrowRight", "ArrowRight")}
    />
  );

  /* ── Right action buttons ── */
  const jumpBtn = (
    <CircleBtn
      size={60}
      active={is("jump")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(34,211,238,0.4), rgba(8,145,178,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(34,211,238,0.8), rgba(8,145,178,1))"
      border="rgba(34,211,238,0.6)"
      shadow="0 0 12px rgba(34,211,238,0.3)"
      shadowActive="0 0 24px rgba(34,211,238,0.7)"
      label="Jump"
      sublabel="JUMP"
      sublabelColor="#67e8f9"
      icon={
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="#67e8f9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("jump", true, " ", "Space")}
      onUp={() => press("jump", false, " ", "Space")}
    />
  );

  const fireBtn = (
    <CircleBtn
      size={60}
      active={is("shoot")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(251,191,36,0.4), rgba(180,83,9,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(251,191,36,0.8), rgba(180,83,9,1))"
      border="rgba(251,191,36,0.6)"
      shadow="0 0 12px rgba(251,191,36,0.3)"
      shadowActive="0 0 24px rgba(251,191,36,0.7)"
      label="Shoot"
      sublabel="FIRE"
      sublabelColor="#fde68a"
      icon={
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#fde68a" strokeWidth="2" fill="rgba(251,191,36,0.3)" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("shoot", true, "z", "KeyZ")}
      onUp={() => press("shoot", false, "z", "KeyZ")}
    />
  );

  /* ── Divide H/A variant pills (above left d-pad) ── */
  const divideRow = variant === "divide" && (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 96,
        display: "flex",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      <PillBtn
        w={48} h={36}
        bg="rgba(249,115,22,0.3)"
        border="rgba(249,115,22,0.6)"
        active={is("h")}
        label="H"
        labelColor="#fb923c"
        dot="#fb923c"
        onDown={() => press("h", true, "h", "KeyH")}
        onUp={() => press("h", false, "h", "KeyH")}
      />
      <PillBtn
        w={48} h={36}
        bg="rgba(34,211,238,0.3)"
        border="rgba(34,211,238,0.6)"
        active={is("ai")}
        label="A"
        labelColor="#22d3ee"
        dot="#22d3ee"
        onDown={() => press("ai", true, "a", "KeyA")}
        onUp={() => press("ai", false, "a", "KeyA")}
      />
    </div>
  );

  /* ── TypeHunter ammo variant pills (above right buttons) ── */
  const hunterRow = variant === "typehunter" && (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 100,
        display: "flex",
        gap: 6,
        pointerEvents: "auto",
      }}
    >
      <PillBtn
        w={44} h={34}
        bg="rgba(124,58,237,0.3)"
        border="rgba(124,58,237,0.6)"
        active={is("n1")}
        label="N"
        labelColor="#c4b5fd"
        dot="#7c3aed"
        onDown={() => press("n1", true, "1", "Digit1")}
        onUp={() => press("n1", false, "1", "Digit1")}
      />
      <PillBtn
        w={44} h={34}
        bg="rgba(217,119,6,0.3)"
        border="rgba(217,119,6,0.6)"
        active={is("n2")}
        label="G"
        labelColor="#fbbf24"
        dot="#d97706"
        onDown={() => press("n2", true, "2", "Digit2")}
        onUp={() => press("n2", false, "2", "Digit2")}
      />
      <PillBtn
        w={44} h={34}
        bg="rgba(220,38,38,0.3)"
        border="rgba(220,38,38,0.6)"
        active={is("n3")}
        label="S"
        labelColor="#f87171"
        dot="#dc2626"
        onDown={() => press("n3", true, "3", "Digit3")}
        onUp={() => press("n3", false, "3", "Digit3")}
      />
    </div>
  );

  /* ── Boss quiz row (lesson 2) ── */
  const bossQuizRow = showBossQuizRow && (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 104,
        display: "flex",
        gap: 6,
        pointerEvents: "auto",
      }}
    >
      {[
        { id: "q1", k: "1", c: "Digit1", color: "#22d3ee" },
        { id: "q2", k: "2", c: "Digit2", color: "#a78bfa" },
        { id: "q3", k: "3", c: "Digit3", color: "#fbbf24" },
      ].map(({ id, k, c, color }) => (
        <PillBtn
          key={id}
          w={44} h={34}
          bg="rgba(0,0,0,0.5)"
          border={color}
          active={is(id)}
          label={k}
          labelColor={color}
          onDown={() => press(id, true, k, c)}
          onUp={() => press(id, false, k, c)}
        />
      ))}
    </div>
  );

  /* ─── Layout ─── */
  return (
    <div
      style={{
        position: "fixed",
        top: 48,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 260,
        overflow: "hidden",
      }}
      className="md:hidden"
    >
      {divideRow}
      {hunterRow}
      {bossQuizRow}

      {/* ── LEFT side: D-pad ── */}
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 8,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        {leftBtn}
        {rightBtn}
      </div>

      {/* ── RIGHT side: Jump + Fire ── */}
      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 8,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        {jumpBtn}
        {fireBtn}
      </div>
    </div>
  );
}
