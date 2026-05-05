"use client";

/**
 * Ambient layers aligned with akmind-dashboard `FloatingElements.tsx`:
 * dot grid, radial orbs, rotating rings, and drifting particles.
 */

import type { CSSProperties } from "react";

type ParticleAnim = "particle-rise" | "particle-drift" | "particle-drift-left";

type Particle = {
  size: number;
  top: string;
  left?: string;
  right?: string;
  color: string;
  delay: number;
  duration: number;
  anim: ParticleAnim;
};

type Orb = {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color: string;
  duration: number;
};

type Ring = {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  border: string;
  dot: string;
  duration: number;
};

const particles: Particle[] = [
  { size: 6, top: "15%", left: "8%", color: "#6366F1", delay: 0, duration: 6, anim: "particle-rise" },
  { size: 4, top: "45%", left: "3%", color: "#06B6D4", delay: 1.5, duration: 8, anim: "particle-drift" },
  { size: 8, top: "70%", left: "6%", color: "#8B5CF6", delay: 3, duration: 7, anim: "particle-rise" },
  { size: 5, top: "25%", right: "5%", color: "#06B6D4", delay: 0.8, duration: 9, anim: "particle-drift-left" },
  { size: 7, top: "55%", right: "3%", color: "#6366F1", delay: 2, duration: 6, anim: "particle-rise" },
  { size: 4, top: "80%", right: "7%", color: "#F59E0B", delay: 4, duration: 8, anim: "particle-drift" },
  { size: 6, top: "35%", left: "12%", color: "#10B981", delay: 2.5, duration: 7, anim: "particle-drift" },
  { size: 5, top: "65%", right: "12%", color: "#8B5CF6", delay: 1, duration: 9, anim: "particle-rise" },
  { size: 3, top: "20%", left: "18%", color: "#06B6D4", delay: 3.5, duration: 6, anim: "particle-drift" },
  { size: 4, top: "50%", right: "15%", color: "#6366F1", delay: 0.5, duration: 8, anim: "particle-rise" },
  { size: 6, top: "85%", left: "15%", color: "#F59E0B", delay: 2, duration: 7, anim: "particle-drift-left" },
  { size: 5, top: "10%", right: "20%", color: "#10B981", delay: 4.5, duration: 9, anim: "particle-rise" },
];

const orbs: Orb[] = [
  { size: 180, top: "5%", left: "-3%", color: "rgba(99,102,241,0.06)", duration: 12 },
  { size: 220, top: "60%", right: "-5%", color: "rgba(6,182,212,0.05)", duration: 16 },
  { size: 140, top: "30%", left: "40%", color: "rgba(139,92,246,0.04)", duration: 10 },
  { size: 160, bottom: "10%", left: "20%", color: "rgba(16,185,129,0.04)", duration: 14 },
];

const rings: Ring[] = [
  { size: 80, top: "20%", left: "5%", border: "rgba(99,102,241,0.12)", dot: "rgba(99,102,241,0.85)", duration: 20 },
  { size: 60, top: "70%", right: "8%", border: "rgba(6,182,212,0.1)", dot: "rgba(6,182,212,0.85)", duration: 15 },
  { size: 100, top: "40%", right: "25%", border: "rgba(139,92,246,0.08)", dot: "rgba(139,92,246,0.85)", duration: 25 },
];

function orbStyle(orb: Orb, i: number): CSSProperties {
  return {
    position: "absolute",
    width: orb.size,
    height: orb.size,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
    top: orb.top,
    left: orb.left,
    right: orb.right,
    bottom: orb.bottom,
    animation: `orb-float ${orb.duration}s ease-in-out infinite`,
    animationDelay: `${i * 1.5}s`,
  };
}

function ringStyle(ring: Ring, i: number): CSSProperties {
  return {
    position: "absolute",
    width: ring.size,
    height: ring.size,
    borderRadius: "50%",
    border: `1px solid ${ring.border}`,
    top: ring.top,
    left: ring.left,
    right: ring.right,
    animation: `ring-rotate ${ring.duration}s linear infinite`,
    animationDelay: `${i * 2}s`,
  };
}

function particleStyle(p: Particle): CSSProperties {
  return {
    position: "absolute",
    width: p.size,
    height: p.size,
    borderRadius: "50%",
    background: p.color,
    opacity: 0,
    top: p.top,
    left: p.left,
    right: p.right,
    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
    animation: `${p.anim} ${p.duration}s ease-in-out ${p.delay}s infinite`,
  };
}

export default function DemoAmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {orbs.map((orb, i) => (
        <div key={`demo-orb-${i}`} style={orbStyle(orb, i)} />
      ))}

      {rings.map((ring, i) => (
        <div key={`demo-ring-${i}`} style={ringStyle(ring, i)}>
          <div
            style={{
              position: "absolute",
              top: -3,
              left: "50%",
              transform: "translateX(-50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: ring.dot,
            }}
          />
        </div>
      ))}

      {particles.map((p, i) => (
        <div key={`demo-p-${i}`} style={particleStyle(p)} />
      ))}
    </div>
  );
}
