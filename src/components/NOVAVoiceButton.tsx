"use client";

import { Mic, MicOff, Volume2 } from "lucide-react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface NOVAVoiceButtonProps {
  voiceState: VoiceState;
  onToggle: () => void;
  error?: string | null;
  size?: "sm" | "md";
}

function getButtonVisualState(
  voiceState: VoiceState,
  error?: string | null
): {
  borderColor: string;
  background: string;
  color: string;
  icon: "volume" | "mic" | "micoff";
  pulse: boolean;
} {
  const active = voiceState === "listening" || voiceState === "thinking";
  const speaking = voiceState === "speaking";

  if (error) {
    return {
      borderColor: "rgba(239,68,68,0.5)",
      background: "rgba(127,29,29,0.38)",
      color: "#fca5a5",
      icon: "micoff",
      pulse: false,
    };
  }

  if (active) {
    return {
      borderColor: "rgba(99,102,241,0.6)",
      background: "linear-gradient(135deg, rgba(99,102,241,0.26), rgba(6,182,212,0.26))",
      color: "#ffffff",
      icon: "mic",
      pulse: true,
    };
  }

  if (speaking) {
    return {
      borderColor: "rgba(99,102,241,0.28)",
      background: "rgba(17,24,39,0.8)",
      color: "#a5b4fc",
      icon: "volume",
      pulse: false,
    };
  }

  return {
    borderColor: "rgba(99,102,241,0.28)",
    background: "rgba(17,24,39,0.8)",
    color: "#a5b4fc",
    icon: "micoff",
    pulse: false,
  };
}

export default function NOVAVoiceButton({
  voiceState,
  onToggle,
  error,
  size = "md",
}: Readonly<NOVAVoiceButtonProps>) {
  const isSmall = size === "sm";
  const buttonSize = isSmall ? 36 : 42;
  const iconSize = isSmall ? 16 : 18;
  const visualState = getButtonVisualState(voiceState, error);
  let iconNode = <MicOff size={iconSize} />;
  if (visualState.icon === "volume") iconNode = <Volume2 size={iconSize} />;
  else if (visualState.icon === "mic") iconNode = <Mic size={iconSize} />;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={error || "Toggle voice input"}
      aria-label="Toggle NOVA voice input"
      style={{
        width: buttonSize,
        height: buttonSize,
        borderRadius: "50%",
        border: `1px solid ${visualState.borderColor}`,
        background: visualState.background,
        color: visualState.color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: visualState.pulse
          ? "0 0 18px rgba(99,102,241,0.35)"
          : "0 4px 12px rgba(2,6,23,0.35)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {iconNode}
      {visualState.pulse ? (
        <span
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "1.5px solid rgba(99,102,241,0.4)",
            animation: "nova-voice-pulse 1.4s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <style>{`
        @keyframes nova-voice-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </button>
  );
}
