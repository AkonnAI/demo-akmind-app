"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/* ── Corner bracket decoration ── */
function CornerBrackets({ color = "rgba(99,102,241,0.4)" }: { color?: string }) {
  const s: React.CSSProperties = { position: "absolute", width: 14, height: 14 };
  const line: React.CSSProperties = { position: "absolute", backgroundColor: color };
  const h: React.CSSProperties = { ...line, height: 2, width: 12 };
  const v: React.CSSProperties = { ...line, width: 2, height: 12 };
  return (
    <>
      {/* top-left */}
      <div style={{ ...s, top: -4, left: -4 }}>
        <div style={{ ...h, top: 0, left: 0 }} />
        <div style={{ ...v, top: 0, left: 0 }} />
      </div>
      {/* top-right */}
      <div style={{ ...s, top: -4, right: -4 }}>
        <div style={{ ...h, top: 0, right: 0 }} />
        <div style={{ ...v, top: 0, right: 0 }} />
      </div>
      {/* bottom-left */}
      <div style={{ ...s, bottom: -4, left: -4 }}>
        <div style={{ ...h, bottom: 0, left: 0 }} />
        <div style={{ ...v, bottom: 0, left: 0 }} />
      </div>
      {/* bottom-right */}
      <div style={{ ...s, bottom: -4, right: -4 }}>
        <div style={{ ...h, bottom: 0, right: 0 }} />
        <div style={{ ...v, bottom: 0, right: 0 }} />
      </div>
    </>
  );
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
  size = 80, bgIdle, bgActive, border, shadow, shadowActive,
  active, label, sublabel, sublabelColor = "#94a3b8", icon,
  onDown, onUp,
}: CircleBtnProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
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
          letterSpacing: 2,
          color: sublabelColor,
          fontWeight: 700,
          textTransform: "uppercase",
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

function PillBtn({ w = 56, h = 40, bg, border, active, label, labelColor, dot, icon, onDown, onUp }: PillBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        background: bg,
        border: `2px solid ${border}`,
        boxShadow: active ? `0 0 14px ${border}` : `0 0 6px ${border}55`,
        transform: active ? "scale(1.12)" : "scale(1)",
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
      }}
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
      onTouchCancel={() => onUp()}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={() => onUp()}
    >
      {icon ?? (
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 18, color: labelColor, lineHeight: 1 }}>
          {label}
        </span>
      )}
      {dot && (
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
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
  const [touchCapable, setTouchCapable] = useState(false);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const touchIds = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setTouchCapable(
      typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  }, []);

  const press = useCallback((id: string, down: boolean, key: string, code: string) => {
    setPressed((p) => ({ ...p, [id]: down }));
    fireKey(down ? "keydown" : "keyup", key, code);
  }, []);

  if (!visible || !touchCapable) return null;

  const is = (id: string) => !!pressed[id];

  /* ── Left D-pad ── */
  const leftBtn = (
    <CircleBtn
      active={is("left")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.4), rgba(49,46,129,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.8), rgba(49,46,129,1))"
      border="rgba(99,102,241,0.6)"
      shadow="0 0 15px rgba(99,102,241,0.3), inset 0 0 10px rgba(99,102,241,0.1)"
      shadowActive="0 0 25px rgba(99,102,241,0.6), inset 0 0 15px rgba(165,180,252,0.2)"
      label="Left"
      icon={
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M15 18l-6-6 6-6" stroke="#a5b4fc" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("left", true, "ArrowLeft", "ArrowLeft")}
      onUp={() => press("left", false, "ArrowLeft", "ArrowLeft")}
    />
  );

  const rightBtn = (
    <CircleBtn
      active={is("right")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.4), rgba(49,46,129,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(99,102,241,0.8), rgba(49,46,129,1))"
      border="rgba(99,102,241,0.6)"
      shadow="0 0 15px rgba(99,102,241,0.3), inset 0 0 10px rgba(99,102,241,0.1)"
      shadowActive="0 0 25px rgba(99,102,241,0.6), inset 0 0 15px rgba(165,180,252,0.2)"
      label="Right"
      icon={
        <svg viewBox="0 0 24 24" width="32" height="32">
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
      active={is("jump")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(34,211,238,0.4), rgba(8,145,178,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(34,211,238,0.8), rgba(8,145,178,1))"
      border="rgba(34,211,238,0.6)"
      shadow="0 0 15px rgba(34,211,238,0.3), inset 0 0 10px rgba(34,211,238,0.1)"
      shadowActive="0 0 28px rgba(34,211,238,0.7), inset 0 0 15px rgba(103,232,249,0.2)"
      label="Jump"
      sublabel="JUMP"
      sublabelColor="#67e8f9"
      icon={
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="#67e8f9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("jump", true, " ", "Space")}
      onUp={() => press("jump", false, " ", "Space")}
    />
  );

  const fireBtn = (
    <CircleBtn
      active={is("shoot")}
      bgIdle="radial-gradient(circle at 35% 35%, rgba(251,191,36,0.4), rgba(180,83,9,0.8))"
      bgActive="radial-gradient(circle at 35% 35%, rgba(251,191,36,0.8), rgba(180,83,9,1))"
      border="rgba(251,191,36,0.6)"
      shadow="0 0 15px rgba(251,191,36,0.3), inset 0 0 10px rgba(251,191,36,0.1)"
      shadowActive="0 0 28px rgba(251,191,36,0.7), inset 0 0 15px rgba(253,230,138,0.2)"
      label="Shoot"
      sublabel="FIRE"
      sublabelColor="#fde68a"
      icon={
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#fde68a" strokeWidth="2" fill="rgba(251,191,36,0.3)" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      onDown={() => press("shoot", true, "z", "KeyZ")}
      onUp={() => press("shoot", false, "z", "KeyZ")}
    />
  );

  /* ── Divide H/A variant row ── */
  const divideRow = variant === "divide" && (
    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
      <PillBtn
        bg="rgba(249,115,22,0.3)"
        border="rgba(249,115,22,0.6)"
        active={is("h")}
        label="H"
        labelColor="#fb923c"
        dot="#fb923c"
        icon={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle cx="12" cy="5" r="3" fill="#fb923c" />
              <path d="M6 20v-4a6 6 0 0112 0v4" stroke="#fb923c" strokeWidth="2" fill="none" />
            </svg>
            <span style={{ fontSize: 8, color: "#fb923c", fontFamily: "monospace", fontWeight: 700 }}>H</span>
          </div>
        }
        onDown={() => press("h", true, "h", "KeyH")}
        onUp={() => press("h", false, "h", "KeyH")}
      />
      <PillBtn
        bg="rgba(34,211,238,0.3)"
        border="rgba(34,211,238,0.6)"
        active={is("ai")}
        label="A"
        labelColor="#22d3ee"
        dot="#22d3ee"
        icon={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <rect x="7" y="8" width="10" height="9" rx="2" stroke="#22d3ee" strokeWidth="2" fill="none" />
              <path d="M9 11h.01M15 11h.01M9 14h6" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 8V5M10 5h4" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 8, color: "#22d3ee", fontFamily: "monospace", fontWeight: 700 }}>A</span>
          </div>
        }
        onDown={() => press("ai", true, "a", "KeyA")}
        onUp={() => press("ai", false, "a", "KeyA")}
      />
    </div>
  );

  /* ── TypeHunter ammo variant row ── */
  const hunterRow = variant === "typehunter" && (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <PillBtn
        w={52} h={44}
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
        w={52} h={44}
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
        w={52} h={44}
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
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      {[
        { id: "q1", k: "1", c: "Digit1", color: "#22d3ee" },
        { id: "q2", k: "2", c: "Digit2", color: "#a78bfa" },
        { id: "q3", k: "3", c: "Digit3", color: "#fbbf24" },
      ].map(({ id, k, c, color }) => (
        <PillBtn
          key={id}
          w={52} h={40}
          bg={`rgba(0,0,0,0.5)`}
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
        inset: 0,
        pointerEvents: "none",
        zIndex: 260,
      }}
      className="md:hidden"
    >
      {/* ── LEFT side: D-pad ── */}
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 80,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 0,
        }}
      >
        {divideRow}
        <div style={{ position: "relative", display: "inline-block", padding: 8 }}>
          <CornerBrackets color="rgba(99,102,241,0.4)" />
          <div style={{ display: "flex", gap: 12 }}>
            {leftBtn}
            {rightBtn}
          </div>
        </div>
      </div>

      {/* ── RIGHT side: Jump + Fire ── */}
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 80,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 0,
        }}
      >
        {hunterRow}
        {bossQuizRow}
        <div style={{ position: "relative", display: "inline-block", padding: 8 }}>
          <CornerBrackets color="rgba(34,211,238,0.4)" />
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            {jumpBtn}
            {fireBtn}
          </div>
        </div>
      </div>
    </div>
  );
}
