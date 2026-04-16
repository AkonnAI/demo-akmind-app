"use client";

export type NOVAEmotion = "happy" | "thinking" | "excited" | "concerned";

interface NOVACharacterProps {
  size?: "sm" | "md" | "lg";
  emotion?: NOVAEmotion;
  animate?: boolean;
}

const SIZES = {
  sm: { total: 36, head: 24, visor: 14, body: 20, bodyH: 14, arm: 5 },
  md: { total: 52, head: 34, visor: 20, body: 28, bodyH: 20, arm: 7 },
  lg: { total: 72, head: 48, visor: 28, body: 38, bodyH: 28, arm: 10 },
};

const VISOR_COLORS: Record<NOVAEmotion, string> = {
  happy: "linear-gradient(90deg, #06B6D4, #818CF8)",
  thinking: "linear-gradient(90deg, #8B5CF6, #6366F1)",
  excited: "linear-gradient(90deg, #06B6D4, #10B981)",
  concerned: "linear-gradient(90deg, #F59E0B, #EF4444)",
};

export default function NOVACharacter({
  size = "md",
  emotion = "happy",
  animate = true,
}: NOVACharacterProps) {
  const s = SIZES[size];

  return (
    <>
      <style>{`
        @keyframes nova-simple-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes nova-simple-blink {
          0%, 88%, 100% { transform: scaleY(1); }
          92% { transform: scaleY(0.1); }
        }
        @keyframes nova-visor-flow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes nova-dot-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: animate
            ? "nova-simple-float 3s ease-in-out infinite"
            : "none",
          position: "relative",
          width: s.total + 16,
        }}
      >
        <div
          style={{
            width: Math.max(5, s.head * 0.12),
            height: Math.max(5, s.head * 0.12),
            borderRadius: "50%",
            background: "#06B6D4",
            boxShadow:
              "0 0 8px rgba(6,182,212,0.9), 0 0 16px rgba(6,182,212,0.5)",
            marginBottom: 2,
            animation: "nova-dot-pulse 1.8s ease-in-out infinite",
          }}
        />

        <div
          style={{
            width: 2,
            height: s.head * 0.18,
            background:
              "linear-gradient(180deg, #06B6D4, rgba(99,102,241,0.3))",
            borderRadius: 1,
            marginBottom: 0,
          }}
        />

        <div
          style={{
            width: s.head,
            height: s.head,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #EEF2FF, #E0E7FF)",
            border: "2px solid rgba(99,102,241,0.3)",
            boxShadow:
              "0 0 16px rgba(99,102,241,0.4), 0 4px 16px rgba(0,0,0,0.2)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: Math.max(2, s.head * 0.06),
              width: "85%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "70%",
                marginTop: s.head * 0.05,
              }}
            >
              {[0, 0.12].map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: Math.max(4, s.head * 0.14),
                    height: Math.max(4, s.head * 0.14),
                    borderRadius: "50%",
                    background: "radial-gradient(circle, #4F46E5, #4338CA)",
                    boxShadow: "0 0 6px rgba(99,102,241,0.7)",
                    animation: `nova-simple-blink 5s ease-in-out ${delay}s infinite`,
                  }}
                />
              ))}
            </div>

            <div
              style={{
                width: "90%",
                height: Math.max(4, s.head * 0.12),
                borderRadius: 3,
                backgroundImage: VISOR_COLORS[emotion],
                backgroundPosition: "0% center",
                backgroundRepeat: "repeat",
                backgroundSize: "200% auto",
                animation: "nova-visor-flow 2s linear infinite",
                boxShadow: "0 0 8px rgba(6,182,212,0.6)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            width: s.body,
            height: s.bodyH,
            borderRadius: 8,
            background: "linear-gradient(145deg, #6366F1, #4F46E5)",
            marginTop: 3,
            border: "1px solid rgba(99,102,241,0.4)",
            boxShadow:
              "0 0 12px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: Math.max(2, s.body * 0.08),
            position: "relative",
          }}
        >
          {[0, 0.6].map((delay, i) => (
            <div
              key={i}
              style={{
                width: Math.max(4, s.body * 0.1),
                height: Math.max(4, s.body * 0.1),
                borderRadius: "50%",
                background: i === 0 ? "#22D3EE" : "#818CF8",
                boxShadow:
                  i === 0
                    ? "0 0 6px rgba(6,182,212,0.8)"
                    : "0 0 6px rgba(129,140,248,0.8)",
                animation: `nova-dot-pulse 2s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: size === "sm" ? 9 : size === "md" ? 11 : 12,
            fontWeight: 700,
            letterSpacing: "0.15em",
            background: "linear-gradient(90deg, #6366F1, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          NOVA
        </div>
      </div>
    </>
  );
}
