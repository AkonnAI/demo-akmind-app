"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export type SoundName =
  | "correct" | "wrong" | "victory" | "xpCollect" | "gateOpen"
  | "jump" | "land" | "shoot" | "enemyHit" | "enemyDie"
  | "playerHit" | "checkpoint" | "collect" | "footstep"
  | "bossRoar" | "bossHit" | "phaseChange";

interface SoundEngine {
  playBgMusic: () => void;
  stopBgMusic: () => void;
  playSound: (name: SoundName) => void;
  toggleMute: () => void;
  isMuted: boolean;
}

const SOUND_FILES: Record<SoundName, string> = {
  correct:     "/sounds/correct.mp3",
  wrong:       "/sounds/wrong.mp3",
  victory:     "/sounds/victory.mp3",
  xpCollect:   "/sounds/xp-collect.mp3",
  gateOpen:    "/sounds/gate-open.mp3",
  jump:        "/sounds/jump.mp3",
  land:        "/sounds/land.mp3",
  shoot:       "/sounds/shoot.mp3",
  enemyHit:    "/sounds/enemy-hit.mp3",
  enemyDie:    "/sounds/enemy-die.mp3",
  playerHit:   "/sounds/player-hit.mp3",
  checkpoint:  "/sounds/checkpoint.mp3",
  collect:     "/sounds/collect.mp3",
  footstep:    "/sounds/footstep.mp3",
  bossRoar:    "/sounds/boss-roar.mp3",
  bossHit:     "/sounds/boss-hit.mp3",
  phaseChange: "/sounds/phase-change.mp3",
};

export function useSoundEngine(): SoundEngine {
  const [isMuted, setIsMuted] = useState(false);
  const bgMusicRef   = useRef<HTMLAudioElement | null>(null);
  const soundsRef    = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});
  const bgPlayingRef = useRef(false);
  const isMutedRef   = useRef(false);

  useEffect(() => {
    // Init bg music
    try {
      const bg = new Audio("/sounds/district1-bg.mp3");
      bg.loop = true;
      bg.volume = 0.4;
      bgMusicRef.current = bg;
    } catch { /* Missing file — silent */ }

    // Init all one-shot sounds
    for (const [name, path] of Object.entries(SOUND_FILES) as [SoundName, string][]) {
      try {
        const audio = new Audio(path);
        // High-frequency sounds get a lower volume
        audio.volume = ["footstep", "shoot", "enemyHit"].includes(name) ? 0.5 : 1;
        soundsRef.current[name] = audio;
      } catch { /* Missing file — silent */ }
    }

    return () => {
      try { bgMusicRef.current?.pause(); bgMusicRef.current = null; } catch { /* silent */ }
      for (const audio of Object.values(soundsRef.current)) {
        try { audio?.pause(); } catch { /* silent */ }
      }
      soundsRef.current = {};
    };
  }, []);

  const playBgMusic = useCallback(() => {
    if (isMutedRef.current) return;
    try {
      const bg = bgMusicRef.current;
      if (bg) { bg.play().catch(() => {}); bgPlayingRef.current = true; }
    } catch { /* silent */ }
  }, []);

  const stopBgMusic = useCallback(() => {
    try { bgMusicRef.current?.pause(); bgPlayingRef.current = false; } catch { /* silent */ }
  }, []);

  const playSound = useCallback((name: SoundName) => {
    if (isMutedRef.current) return;
    try {
      const audio = soundsRef.current[name];
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } catch { /* silent */ }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) {
      try { bgMusicRef.current?.pause(); } catch { /* silent */ }
    } else if (bgPlayingRef.current) {
      try { bgMusicRef.current?.play().catch(() => {}); } catch { /* silent */ }
    }
  }, []);

  return { playBgMusic, stopBgMusic, playSound, toggleMute, isMuted };
}
