"use client";
import { useEffect, useState } from "react";

export default function LandscapeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (window.innerWidth < 768 && "ontouchstart" in window);
      setIsMobile(mobile);

      if (mobile) {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  // Desktop: render normally
  if (!isMobile) return <>{children}</>;

  // Mobile landscape: render normally
  if (!isPortrait) return <>{children}</>;

  // Mobile portrait: show rotate prompt
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050510",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          fontSize: "80px",
          animation: "rotatePhone 2s ease-in-out infinite",
        }}
      >
        📱
      </div>

      <p
        style={{
          color: "#22d3ee",
          fontFamily: "monospace",
          fontSize: "18px",
          fontWeight: "bold",
          marginTop: "24px",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        Rotate Your Device
      </p>

      <p
        style={{
          color: "#475569",
          fontFamily: "monospace",
          fontSize: "13px",
          marginTop: "8px",
          textAlign: "center",
          padding: "0 32px",
        }}
      >
        Please rotate to landscape mode to play the game
      </p>

      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "32px",
          color: "#6366f1",
          fontSize: "32px",
        }}
      >
        <span>↺</span>
        <span style={{ color: "#22d3ee", animation: "lwPulse 1s infinite" }}>
          ⟷
        </span>
        <span>↻</span>
      </div>

      <style>{`
        @keyframes rotatePhone {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(0deg); }
          60%  { transform: rotate(90deg); }
          100% { transform: rotate(90deg); }
        }
        @keyframes lwPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
