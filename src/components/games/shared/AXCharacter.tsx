"use client";

export interface AXCharacterProps {
  animation: "idle" | "walk" | "jump" | "celebrate" | "hit";
  facing?: "left" | "right";
  size?: number;
  glowColor?: string;
}

// CSS keyframes injected once per render (browsers de-dup identical rules)
const AX_CSS = `
@keyframes ax-leftleg {
  0%   { transform: rotate(-20deg); }
  50%  { transform: rotate(20deg); }
  100% { transform: rotate(-20deg); }
}
@keyframes ax-rightleg {
  0%   { transform: rotate(20deg); }
  50%  { transform: rotate(-20deg); }
  100% { transform: rotate(20deg); }
}
@keyframes ax-leftarm {
  0%   { transform: rotate(-15deg); }
  50%  { transform: rotate(15deg); }
  100% { transform: rotate(-15deg); }
}
@keyframes ax-rightarm {
  0%   { transform: rotate(15deg); }
  50%  { transform: rotate(-15deg); }
  100% { transform: rotate(15deg); }
}
@keyframes ax-bodybob {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-2px); }
}
@keyframes ax-idle {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-3px); }
}
@keyframes ax-hitshake {
  0%   { transform: translateX(0); }
  20%  { transform: translateX(-4px); }
  40%  { transform: translateX(4px); }
  60%  { transform: translateX(-4px); }
  80%  { transform: translateX(4px); }
  100% { transform: translateX(0); }
}
@keyframes ax-hitflash {
  0%,100% { background-color: #4338ca; }
  50%     { background-color: #ef4444; }
}
@keyframes ax-celebrate {
  0%,100% { transform: translateY(0); }
  30%,70% { transform: translateY(-20px); }
}
@keyframes ax-armup {
  0%,100% { transform: rotate(0deg); }
  30%,70% { transform: rotate(-80deg); }
}
@keyframes ax-legkick-l {
  0%,100% { transform: rotate(0deg); }
  30%,70% { transform: rotate(25deg); }
}
@keyframes ax-legkick-r {
  0%,100% { transform: rotate(0deg); }
  30%,70% { transform: rotate(-25deg); }
}
`;

// Base container spec: 44 × 68 (legs overflow to ~88 with overflow:visible)
const W = 44;
const H = 68;

export default function AXCharacter({
  animation,
  facing = "right",
  size = 1,
  glowColor = "rgba(99,102,241,0.5)",
}: AXCharacterProps) {
  const isWalk = animation === "walk";
  const isJump = animation === "jump";
  const isHit = animation === "hit";
  const isCelebrate = animation === "celebrate";
  const isIdle = animation === "idle";

  /* ── wrapper animation (whole body) ── */
  let wrapAnim: string | undefined;
  if (isWalk) wrapAnim = "ax-bodybob 0.35s infinite ease-in-out";
  else if (isIdle) wrapAnim = "ax-idle 1.8s infinite ease-in-out";
  else if (isHit) wrapAnim = "ax-hitshake 0.4s ease-in-out";
  else if (isCelebrate) wrapAnim = "ax-celebrate 0.6s 2 ease-in-out";

  /* ── arm animations / transforms ── */
  let lArmAnim: string | undefined;
  let rArmAnim: string | undefined;
  let armTransform: string | undefined;
  if (isWalk) {
    lArmAnim = "ax-leftarm 0.35s infinite ease-in-out";
    rArmAnim = "ax-rightarm 0.35s infinite ease-in-out";
  } else if (isCelebrate) {
    lArmAnim = "ax-armup 0.6s 2 ease-in-out";
    rArmAnim = "ax-armup 0.6s 2 ease-in-out";
  } else if (isJump) {
    armTransform = "rotate(-30deg)";
  }

  /* ── leg animations / transforms ── */
  let lLegAnim: string | undefined;
  let rLegAnim: string | undefined;
  let legTransform: string | undefined;
  if (isWalk) {
    lLegAnim = "ax-leftleg 0.35s infinite ease-in-out";
    rLegAnim = "ax-rightleg 0.35s infinite ease-in-out";
  } else if (isCelebrate) {
    lLegAnim = "ax-legkick-l 0.6s 2 ease-in-out";
    rLegAnim = "ax-legkick-r 0.6s 2 ease-in-out";
  } else if (isJump) {
    legTransform = "rotate(-40deg)";
  }

  /* ── body ── */
  const bodyBg = isHit ? "#ef4444" : "#4338ca";
  const bodyAnim = isHit ? "ax-hitflash 0.13s 3 alternate ease-in-out" : undefined;
  const bodyTransform = isJump ? "scaleY(1.15)" : undefined;

  /* ── eye pupils shift forward when walking ── */
  // Always shift forward in local character space; scaleX(-1) handles left-facing
  const pupilLeft = isWalk ? 3 : 2;

  return (
    <div
      style={{
        display: "inline-block",
        width: W * size,
        height: H * size,
        position: "relative",
        overflow: "visible",
        flexShrink: 0,
      }}
    >
      <style>{AX_CSS}</style>

      {/* Mirror wrapper — scaleX(-1) when facing left, pivot at horizontal center */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W * size,
          height: H * size,
          transform: facing === "left" ? "scaleX(-1)" : "scaleX(1)",
          transformOrigin: `${(W * size) / 2}px 0`,
        }}
      >
        {/* Scale wrapper — scales content from top-left */}
        <div
          style={{
            width: W,
            height: H,
            transform: `scale(${size})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Animation wrapper */}
          <div
            style={{
              position: "relative",
              width: W,
              height: H,
              animation: wrapAnim,
            }}
          >
            {/* ── Left antenna ── */}
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 2,
                width: 2,
                height: 8,
                backgroundColor: "#818cf8",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -1,
                  top: -4,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: "#a5b4fc",
                  boxShadow: "0 0 4px #a5b4fc",
                }}
              />
            </div>

            {/* ── Right antenna ── */}
            <div
              style={{
                position: "absolute",
                right: 10,
                top: 2,
                width: 2,
                height: 8,
                backgroundColor: "#818cf8",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -1,
                  top: -4,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: "#a5b4fc",
                  boxShadow: "0 0 4px #a5b4fc",
                }}
              />
            </div>

            {/* ── Head ── */}
            <div
              style={{
                position: "absolute",
                left: 2,
                top: 10,
                width: 40,
                height: 22,
                backgroundColor: "#3730a3",
                border: "2px solid #6366f1",
                borderRadius: "6px 6px 3px 3px",
              }}
            >
              {/* Left eye */}
              <div
                style={{
                  position: "absolute",
                  left: "22%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: pupilLeft,
                    top: 2,
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    backgroundColor: "#6366f1",
                  }}
                />
              </div>
              {/* Right eye */}
              <div
                style={{
                  position: "absolute",
                  left: "72%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: pupilLeft,
                    top: 2,
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    backgroundColor: "#6366f1",
                  }}
                />
              </div>
            </div>

            {/* ── Left arm ── */}
            <div
              style={{
                position: "absolute",
                left: -11,
                top: 34,
                width: 10,
                height: 18,
                backgroundColor: "#3730a3",
                border: "1px solid #6366f1",
                borderRadius: 3,
                transformOrigin: "top center",
                animation: lArmAnim,
                transform: armTransform,
              }}
            />

            {/* ── Right arm ── */}
            <div
              style={{
                position: "absolute",
                right: -11,
                top: 34,
                width: 10,
                height: 18,
                backgroundColor: "#3730a3",
                border: "1px solid #6366f1",
                borderRadius: 3,
                transformOrigin: "top center",
                animation: rArmAnim,
                transform: armTransform,
              }}
            />

            {/* ── Body ── */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 32,
                width: 44,
                height: 28,
                backgroundColor: bodyBg,
                border: "2px solid #6366f1",
                borderRadius: 3,
                boxShadow: `0 0 10px ${glowColor}`,
                animation: bodyAnim,
                transform: bodyTransform,
                transformOrigin: "top center",
              }}
            >
              {/* Chest panel */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 14,
                  height: 8,
                  backgroundColor: "#6366f1",
                  borderRadius: 2,
                }}
              />
            </div>

            {/* ── Legs ── */}
            <div
              style={{
                position: "absolute",
                left: 7,
                top: 60,
                display: "flex",
                gap: 4,
              }}
            >
              {/* Left leg */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  transformOrigin: "top center",
                  animation: lLegAnim,
                  transform: legTransform,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 10,
                    backgroundColor: "#3730a3",
                    border: "1px solid #6366f1",
                  }}
                />
                <div
                  style={{
                    width: 14,
                    height: 12,
                    backgroundColor: "#312e81",
                    border: "1px solid #6366f1",
                    borderRadius: "0 0 3px 3px",
                  }}
                />
                <div
                  style={{
                    width: 16,
                    height: 6,
                    backgroundColor: "#4338ca",
                    borderRadius: 2,
                    marginLeft: -1,
                  }}
                />
              </div>

              {/* Right leg */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  transformOrigin: "top center",
                  animation: rLegAnim,
                  transform: legTransform,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 10,
                    backgroundColor: "#3730a3",
                    border: "1px solid #6366f1",
                  }}
                />
                <div
                  style={{
                    width: 14,
                    height: 12,
                    backgroundColor: "#312e81",
                    border: "1px solid #6366f1",
                    borderRadius: "0 0 3px 3px",
                  }}
                />
                <div
                  style={{
                    width: 16,
                    height: 6,
                    backgroundColor: "#4338ca",
                    borderRadius: 2,
                    marginLeft: -1,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
