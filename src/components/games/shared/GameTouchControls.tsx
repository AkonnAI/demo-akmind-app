"use client";

import { useCallback, useEffect, useState } from "react";

function fireKey(type: "keydown" | "keyup", key: string, code: string) {
  try {
    window.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true,
      })
    );
  } catch {
    /* synthetic events may fail in some environments */
  }
}

export type GameTouchVariant = "default" | "divide" | "typehunter";

interface GameTouchControlsProps {
  visible: boolean;
  variant?: GameTouchVariant;
  /** Lesson 2 boss: Digit1/2/3 for quiz */
  showBossQuizRow?: boolean;
}

interface PadBtnProps {
  label: string;
  sub?: string;
  active: boolean;
  size?: "md" | "sm";
  onDown: () => void;
  onUp: () => void;
}

function PadBtn({ label, sub, active, size = "md", onDown, onUp }: PadBtnProps) {
  const dim = size === "sm" ? 50 : 60;
  return (
    <button
      type="button"
      className={`flex select-none flex-col items-center justify-center rounded-full border font-bold text-white touch-manipulation ${
        active ? "border-white/50 bg-white/40" : "border-white/30 bg-white/20"
      }`}
      style={{ width: dim, height: dim }}
      aria-label={label}
      onTouchStart={(e) => {
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp();
      }}
      onTouchCancel={() => {
        onUp();
      }}
    >
      <span className="text-lg leading-none">{label}</span>
      {sub ? <span className="mt-0.5 text-[10px] font-semibold opacity-90">{sub}</span> : null}
    </button>
  );
}

export default function GameTouchControls({
  visible,
  variant = "default",
  showBossQuizRow = false,
}: GameTouchControlsProps) {
  const [touchCapable, setTouchCapable] = useState(false);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

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

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[260] flex flex-col items-center md:hidden"
      style={{
        paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="pointer-events-auto flex flex-col items-center gap-2 px-2">
        {variant === "typehunter" ? (
          <div className="flex flex-row gap-2">
            <PadBtn
              label="1"
              sub="NAR"
              active={is("n1")}
              size="sm"
              onDown={() => press("n1", true, "1", "Digit1")}
              onUp={() => press("n1", false, "1", "Digit1")}
            />
            <PadBtn
              label="2"
              sub="GEN"
              active={is("n2")}
              size="sm"
              onDown={() => press("n2", true, "2", "Digit2")}
              onUp={() => press("n2", false, "2", "Digit2")}
            />
            <PadBtn
              label="3"
              sub="SUP"
              active={is("n3")}
              size="sm"
              onDown={() => press("n3", true, "3", "Digit3")}
              onUp={() => press("n3", false, "3", "Digit3")}
            />
          </div>
        ) : null}

        {variant === "divide" ? (
          <div className="flex flex-row gap-2">
            <PadBtn
              label="H"
              sub="Human"
              active={is("h")}
              size="sm"
              onDown={() => press("h", true, "h", "KeyH")}
              onUp={() => press("h", false, "h", "KeyH")}
            />
            <PadBtn
              label="A"
              sub="AI"
              active={is("a")}
              size="sm"
              onDown={() => press("a", true, "a", "KeyA")}
              onUp={() => press("a", false, "a", "KeyA")}
            />
          </div>
        ) : null}

        {showBossQuizRow ? (
          <div className="flex flex-row gap-2">
            <PadBtn label="1" active={is("q1")} size="sm" onDown={() => press("q1", true, "1", "Digit1")} onUp={() => press("q1", false, "1", "Digit1")} />
            <PadBtn label="2" active={is("q2")} size="sm" onDown={() => press("q2", true, "2", "Digit2")} onUp={() => press("q2", false, "2", "Digit2")} />
            <PadBtn label="3" active={is("q3")} size="sm" onDown={() => press("q3", true, "3", "Digit3")} onUp={() => press("q3", false, "3", "Digit3")} />
          </div>
        ) : null}

        <div className="flex flex-row items-center justify-center gap-2">
          <PadBtn label="←" sub="LEFT" active={is("left")} onDown={() => press("left", true, "ArrowLeft", "ArrowLeft")} onUp={() => press("left", false, "ArrowLeft", "ArrowLeft")} />
          <PadBtn label="↑" sub="JUMP" active={is("jump")} onDown={() => press("jump", true, " ", "Space")} onUp={() => press("jump", false, " ", "Space")} />
          <PadBtn label="Z" sub="SHOOT" active={is("shoot")} onDown={() => press("shoot", true, "z", "KeyZ")} onUp={() => press("shoot", false, "z", "KeyZ")} />
          <PadBtn label="→" sub="RIGHT" active={is("right")} onDown={() => press("right", true, "ArrowRight", "ArrowRight")} onUp={() => press("right", false, "ArrowRight", "ArrowRight")} />
        </div>
      </div>
    </div>
  );
}
