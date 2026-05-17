import { useEffect, useRef, useState } from 'react'
import NovaHUD from '../components/NovaHUD'
import { Audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'
import type { Sim3GraderResult } from './sim3-grader'

// ─── Constants ───────────────────────────────────────────────────────────────

const NOVA_MSG: Record<
  number,
  {
    hud: string
    howTo: string
  }
> = {
  1: {
    hud: 'Repair the first 5 towers. Use range(1, 6) in your loop.',
    howTo: 'Repair towers 1 to 5. Write range(1, 6)',
  },
  2: {
    hud: 'Great work! Now repair all 8. Try range(1, 9).',
    howTo: 'Now repair ALL 8 towers. Write range(1, 9)',
  },
  3: {
    hud: 'One more! Loops can start at 0. Use range(0, 8).',
    howTo: 'Start from 0. Write range(0, 8)',
  },
}

const TOWER_COUNT = 8

const TOWER_COLORS = [
  '#00D4FF',
  '#7B2FFF',
  '#00FF88',
  '#FF9500',
  '#00D4FF',
  '#FF2D55',
  '#7B2FFF',
  '#00FF88',
]

const CITY_LAYERS = [
  '/assets/city/cyberpunk-street-files/cyberpunk-street-files/Assets/Version 2/Layers/back.png',
  '/assets/city/cyberpunk-street-files/cyberpunk-street-files/Assets/Version 2/Layers/middle.png',
  '/assets/city/cyberpunk-street-files/cyberpunk-street-files/Assets/Version 2/Layers/foreground-empty.png',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface TowerState {
  active: boolean
  color: string
  repairing: boolean
  repaired: boolean
  megaBurst?: boolean
}

interface Props {
  readonly executeResult: Sim3GraderResult | null
  readonly liveCode: string
  readonly onTestInput?: (code: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sim3Scene({ executeResult, liveCode, onTestInput }: Props) {
  const addXP = useGameStore((s) => s.addXP)
  const unlockLesson = useGameStore((s) => s.unlockLesson)
  const completeLesson = useGameStore((s) => s.completeLesson)
  const setScreen = useGameStore((s) => s.setScreen)

  const makeTowers = (): TowerState[] =>
    Array.from({ length: TOWER_COUNT }, (_, i) => ({
      active: false,
      color: TOWER_COLORS[i],
      repairing: false,
      repaired: false,
      megaBurst: false,
    }))

  const [towers, setTowers] = useState<TowerState[]>(() => makeTowers())
  const towersRef = useRef(towers)
  useEffect(() => {
    towersRef.current = towers
  }, [towers])

  const challengeRef = useRef(1)
  const [challenge, setChallenge] = useState(1)
  challengeRef.current = challenge

  const [novaHudText, setNovaHudText] = useState(NOVA_MSG[1].hud)
  const [restoreLevel, setRestoreLevel] = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const [activeBeam, setActiveBeam] = useState<number | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const animRef = useRef<number[]>([])
  const novaTimersRef = useRef<number[]>([])
  const missionRewardedRef = useRef(false)

  function clearAllTimers() {
    animRef.current.forEach(clearTimeout)
    animRef.current = []
  }

  function clearNovaTimers() {
    novaTimersRef.current.forEach(clearTimeout)
    novaTimersRef.current = []
  }

  useEffect(() => () => clearAllTimers(), [])
  useEffect(() => () => clearNovaTimers(), [])

  useEffect(() => {
    if (executeResult != null) return
    clearAllTimers()
    clearNovaTimers()
    setChallenge(1)
    setTowers(makeTowers())
    setRestoreLevel(0)
    setShowComplete(false)
    setNovaHudText(NOVA_MSG[1].hud)
    missionRewardedRef.current = false
    setActiveBeam(null)
  }, [executeResult])

  // ── Live code parse ───────────────────────────────────────────────────────
  useEffect(() => {
    const m = liveCode.match(/range\s*\(\s*(?:\d+\s*,\s*)?(\d+)/)
    if (m) {
      const end = Number.parseInt(m[1] ?? '0', 10)
      const startM = liveCode.match(/range\s*\(\s*(\d+)\s*,/)
      const start = startM ? Number.parseInt(startM[1] ?? '0', 10) : 0
      setPreviewCount(Math.min(end - start, TOWER_COUNT))
    } else {
      setPreviewCount(null)
    }
  }, [liveCode])

  // ── Execute result → sequential repair + challenge advancement ────────────
  useEffect(() => {
    if (!executeResult || executeResult.error || executeResult.iterations <= 0) return

    clearAllTimers()
    clearNovaTimers()

    const it = executeResult.iterations
    const rangeStartsAtZero = executeResult.rangeStartsAtZero ?? false
    const ch = challengeRef.current

    let passed = false
    if (ch === 1) passed = it >= 5
    else if (ch === 2) passed = it >= 8
    else passed = it >= 8 && rangeStartsAtZero

    let indicesToAnimate: number[] = []
    if (ch === 1) {
      setTowers(makeTowers())
      const n = Math.min(it, 5)
      for (let i = 0; i < n; i += 1) indicesToAnimate.push(i)
    } else if (ch === 2) {
      const unr = towersRef.current
        .map((t, i) => (!t.repaired ? i : -1))
        .filter((idx) => idx >= 0)
      const steps = Math.min(it, unr.length || 1)
      indicesToAnimate = unr.slice(0, Math.max(steps, 0))
      if (indicesToAnimate.length === 0 && it > 0) {
        for (let i = 0; i < Math.min(it, TOWER_COUNT); i += 1) indicesToAnimate.push(i)
      }
    } else {
      const n = Math.min(it, TOWER_COUNT)
      for (let i = 0; i < n; i += 1) indicesToAnimate.push(i)
    }

    const megaGlow = Boolean(ch === 3 && passed)

    const scheduleSequence = (
      indices: number[],
      onDone: () => void,
      opts: { mega: boolean },
    ) => {
      indices.forEach((towerIdx, k) => {
        const beamOn = globalThis.setTimeout(() => {
          setActiveBeam(towerIdx)
          setTowers((prev) =>
            prev.map((t, idx) =>
              idx === towerIdx ? { ...t, repairing: true } : t,
            ),
          )
        }, k * 350)

        const beamOff = globalThis.setTimeout(() => {
          setActiveBeam(null)
          setTowers((prev) =>
            prev.map((t, idx) => {
              if (idx !== towerIdx) return t
              const burst = opts.mega
              return {
                ...t,
                repairing: false,
                repaired: true,
                active: true,
                megaBurst: Boolean(t.megaBurst || burst),
              }
            }),
          )
        }, k * 350 + 300)

        animRef.current.push(beamOn, beamOff)
      })

      const finishId = globalThis.setTimeout(onDone, indices.length * 350 + 420)
      animRef.current.push(finishId)
    }

    scheduleSequence(indicesToAnimate, () => {
      if (!passed) {
        setShowComplete(false)
        return
      }
      if (ch === 1) {
        setNovaHudText('Good. Now repair ALL 8 towers.')
        const h = globalThis.setTimeout(() => setNovaHudText(NOVA_MSG[2].hud), 5600)
        novaTimersRef.current.push(h)
        setChallenge(2)
      } else if (ch === 2) {
        setNovaHudText('Perfect. Now try range(0, 8) — loops can start at 0 too.')
        const h = globalThis.setTimeout(() => setNovaHudText(NOVA_MSG[3].hud), 5600)
        novaTimersRef.current.push(h)
        setRestoreLevel(1)
        setChallenge(3)
      } else if (ch === 3 && passed) {
        setRestoreLevel(2)
        setShowComplete(true)
        setTowers((prev) =>
          prev.map((t) => ({ ...t, megaBurst: true, repaired: true, active: true })),
        )
        if (!missionRewardedRef.current) {
          missionRewardedRef.current = true
          const rewardT = globalThis.setTimeout(() => {
            Audio.play('confirm')
            addXP(175)
            unlockLesson(4)
            completeLesson(3)
            setScreen('success')
          }, 1600)
          animRef.current.push(rewardT)
        }
      }
    }, { mega: megaGlow })
  }, [executeResult])

  const repairedCount = towers.filter((t) => t.repaired).length

  // ── Derived ───────────────────────────────────────────────────────────────
  const effectivePreview =
    previewCount ?? (challenge >= 2 ? TOWER_COUNT : 5)

  const challengeDotsFilled = restoreLevel >= 2 ? 3 : challenge - 1

  const chNum = Math.min(3, Math.max(1, challenge)) as 1 | 2 | 3

  const loopRangeDisplay =
    chNum === 3 ? 'range(0, 8)' : `range(1, ${effectivePreview + 1})`

  const applyLoopCode =
    chNum === 3
      ? 'for i in range(0, 8):\n    print(i)'
      : `for i in range(1, ${effectivePreview + 1}):\n    print(i)`

  const previewSliderMax = chNum === 1 ? 5 : 8

  function cityBackgroundFilter(level: number): string {
    if (level >= 2) return 'hue-rotate(200deg) brightness(0.85) saturate(1.6)'
    if (level >= 1) return 'hue-rotate(200deg) brightness(0.52) saturate(1.12) grayscale(0.22)'
    return 'hue-rotate(200deg) brightness(0.3) saturate(0.8) grayscale(0.4)'
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#050A0F',
      }}
    >
      {/* ── City background layers ─────────────────────────────────────────── */}
      {CITY_LAYERS.map((src, i) => (
        <img
          key={src}
          alt=""
          src={src}
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            imageRendering: 'pixelated',
            zIndex: i + 1,
            filter: cityBackgroundFilter(restoreLevel),
            transition: 'filter 1.8s ease',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Dark gradient overlay ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          background:
            'linear-gradient(to top, rgba(5,10,15,0.9) 0%, rgba(5,10,15,0.3) 50%, rgba(5,10,15,0.1) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Ambient scanlines ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,212,255,0.018) 3px, rgba(0,212,255,0.018) 4px)',
          animation: 'electric-flicker 12s infinite',
        }}
      />

      {/* ── Towers ─────────────────────────────────────────────────────────── */}
      <div
        className="towers-container"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: TOWER_COUNT }).map((_, i) => {
        const tower = towers[i]
        const leftPct = 6 + i * (88 / (TOWER_COUNT - 1))
        const isGhost =
          previewCount !== null && i < previewCount && !tower.active
        const color = tower.color

        return (
          <div
            key={`tower-${i}`}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              bottom: 48,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 8,
            }}
          >
            {/* Repair beam */}
            {activeBeam === i && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 3,
                  height: 200,
                  background: `linear-gradient(to top, ${color}, transparent)`,
                  boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                  animation: 'beam-travel 0.3s ease-out forwards',
                  zIndex: 15,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Sparks on broken towers */}
            {!tower.active && !tower.repairing && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  width: 0,
                  height: 0,
                }}
              >
                {[0, 1, 2, 3].map((s) => (
                  <div
                    key={`spark-${s}`}
                    style={
                      {
                        position: 'absolute',
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: s % 2 === 0 ? '#FF9500' : '#E63946',
                        '--sx': `${(s - 2) * 8}px`,
                        '--sy': `${-10 - s * 4}px`,
                        '--sx2': `${(s - 1) * 6}px`,
                        '--sy2': `${-6 - s * 3}px`,
                        animation: `spark-flicker ${1.5 + s * 0.4}s ${s * 0.3}s infinite`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}

            {/* Ghost preview indicator */}
            {isGhost && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: `2px dashed ${color}`,
                  opacity: 0.3,
                  animation: 'ghost-pulse 1.6s ease-in-out infinite',
                  marginBottom: 4,
                }}
              />
            )}

            {/* Tower sphere */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: tower.active
                  ? `radial-gradient(circle at 35% 30%, white, ${color} 40%, ${color}88 100%)`
                  : 'radial-gradient(circle at 40% 35%, #0F1F2A, #050A0F)',
                border: `2px solid ${tower.active ? color : 'rgba(0,212,255,0.15)'}`,
                boxShadow: tower.active
                  ? `${
                      tower.megaBurst
                        ? `0 0 28px #ffffff, 0 0 56px ${color}, 0 0 92px ${color}, `
                        : ''
                    }0 0 16px ${color}, 0 0 32px ${color}88, 0 0 64px ${color}44`
                  : 'none',
                transition: 'all 0.4s ease',
                animation: tower.active ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                ...(tower.repairing
                  ? { transform: 'scale(1.3)', opacity: 0.5 }
                  : {}),
              }}
            />

            {/* Shockwave ring on repair */}
            {tower.repairing && (
              <div
                style={{
                  position: 'absolute',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: `2px solid ${color}`,
                  top: 0,
                  animation: 'shockwave 0.5s ease-out forwards',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Variable label */}
            {tower.active && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  background: 'rgba(5,10,20,0.92)',
                  border: `1px solid ${color}`,
                  borderRadius: 10,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontWeight: 700,
                  color,
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 8px ${color}44`,
                }}
              >
                i = {i}
              </div>
            )}

            {/* Energy stem */}
            <div
              style={{
                width: 4,
                height: 80,
                background: tower.active
                  ? `linear-gradient(to top, rgba(0,0,0,0), ${color}44)`
                  : 'rgba(0,212,255,0.08)',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.4s ease',
              }}
            >
              {tower.active && (
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '35%',
                    background: `linear-gradient(to top, transparent, ${color}, transparent)`,
                    animation: 'energy-pulse 1.8s ease-in-out infinite',
                  }}
                />
              )}
            </div>

            {/* Base plate */}
            <div
              style={{
                width: 44,
                height: 8,
                borderRadius: 4,
                background: tower.active
                  ? `${color}88`
                  : 'rgba(0,212,255,0.12)',
                boxShadow: tower.active ? `0 2px 12px ${color}` : 'none',
                transition: 'all 0.4s ease',
              }}
            />
          </div>
        )
      })}
      </div>

      {/* ── Lightning arcs between active adjacent towers ──────────────────── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 7,
          pointerEvents: 'none',
        }}
      >
        {towers.map((t, i) => {
          if (!t.active || !towers[i + 1]?.active) return null
          const x1 = 6 + i * (88 / (TOWER_COUNT - 1))
          const x2 = 6 + (i + 1) * (88 / (TOWER_COUNT - 1))
          return (
            <line
              key={`arc-${i}`}
              x1={`${x1}%`}
              y1="52%"
              x2={`${x2}%`}
              y2="52%"
              stroke={t.color}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.5"
              style={{ animation: 'lightning-arc 0.3s ease-in-out infinite alternate' }}
            />
          )
        })}
      </svg>

      {/* ── Repair cannon ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 12,
            height: 40,
            background: 'linear-gradient(to top, #7B2FFF, #00D4FF)',
            borderRadius: '3px 3px 0 0',
            boxShadow:
              activeBeam !== null
                ? '0 0 20px #00D4FF, 0 0 40px rgba(0,212,255,0.6)'
                : '0 0 6px rgba(0,212,255,0.3)',
            transition: 'box-shadow 0.1s ease',
          }}
        />
        <div
          style={{
            width: 48,
            height: 16,
            background: 'rgba(0,212,255,0.15)',
            border: '2px solid rgba(0,212,255,0.4)',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            fontSize: 9,
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            color: 'rgba(0,212,255,0.4)',
            letterSpacing: 2,
            marginTop: 3,
          }}
        >
          REPAIR-CANNON
        </div>
      </div>

      {/* ── Progress HUD ──────────────────────────────────────────────────── */}
      <div
        className="progress-hud"
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            background: 'rgba(5,10,20,0.92)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 20,
            padding: '8px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: TOWER_COUNT }).map((_, i) => (
              <div
                key={`dot-${i}`}
                className="dot"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: towers[i].active ? towers[i].color : '#0A1A24',
                  border: `1.5px solid ${towers[i].active ? towers[i].color : 'rgba(0,212,255,0.2)'}`,
                  boxShadow: towers[i].active
                    ? `0 0 8px ${towers[i].color}`
                    : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              color: '#00D4FF',
              letterSpacing: 2,
            }}
          >
            TOWERS REPAIRED: {repairedCount} / {TOWER_COUNT}
          </div>
        </div>
      </div>

      {/* ── How to Play ───────────────────────────────────────────────────── */}
      <div
        className="sim-panel-right"
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 12,
          width: 200,
          background: 'rgba(5,10,20,0.92)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            color: '#7B2FFF',
            letterSpacing: 3,
            marginBottom: 10,
          }}
        >
          HOW TO PLAY
        </div>

        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 11,
            color: '#FF9500',
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          CHALLENGE {challenge}/3
        </div>
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontSize: 13,
            color: 'white',
            lineHeight: 1.55,
            marginBottom: 12,
          }}
        >
          {NOVA_MSG[chNum].howTo}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {[0, 1, 2].map((idx) => {
            const filled = idx < challengeDotsFilled
            return (
              <div
                key={`ch-dot-${idx}`}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: filled ? '#FF9500' : 'rgba(255,149,0,0.15)',
                  border: `2px solid ${filled ? '#FF9500' : 'rgba(255,149,0,0.35)'}`,
                  boxShadow: filled ? '0 0 10px rgba(255,149,0,0.6)' : 'none',
                }}
              />
            )
          })}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Complete all 3 loops to restore the whole city.
        </div>
      </div>

      {/* ── Loop preview panel ────────────────────────────────────────────── */}
      <div
        className="sim-panel-left"
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          zIndex: 12,
          width: 190,
          background: 'rgba(5,10,20,0.92)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            color: '#00D4FF',
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          LOOP PREVIEW
        </div>
        {chNum <= 2 ? (
          <input
            key={`pv-${chNum}`}
            type="range"
            min={1}
            max={previewSliderMax}
            defaultValue={previewSliderMax}
            style={{ width: '100%', accentColor: '#00D4FF', marginBottom: 8 }}
            onChange={(e) =>
              setPreviewCount(Number.parseInt(e.target.value, 10))
            }
          />
        ) : (
          <div
            style={{
              fontSize: 11,
              fontFamily: 'JetBrainsMono, monospace',
              color: '#7B2FFF',
              marginBottom: 8,
            }}
          >
            Fixed for this stage: range(0, 8)
          </div>
        )}
        <div
          style={{
            fontSize: 13,
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            color: 'white',
            marginBottom: 4,
          }}
        >
          WILL REPAIR{' '}
          {chNum === 3 ? TOWER_COUNT : effectivePreview} TOWERS
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'JetBrainsMono, monospace',
            color: '#7B2FFF',
            marginBottom: 10,
          }}
        >
          {loopRangeDisplay}
        </div>
        <button
          type="button"
          data-hoverable
          onClick={() => {
            if (typeof onTestInput === 'function') {
              onTestInput(applyLoopCode)
            }
          }}
          style={{
            width: '100%',
            height: 32,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid #00D4FF',
            borderRadius: 6,
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            color: '#00D4FF',
            cursor: 'none',
          }}
        >
          APPLY TO CODE
        </button>
      </div>

      {/* ── City-restored flash overlay ───────────────────────────────────── */}
      {restoreLevel >= 2 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 18,
            pointerEvents: 'none',
            background: 'rgba(0,212,255,0.06)',
            animation: 'electric-flicker 0.5s ease-out forwards',
          }}
        />
      )}

      {/* ── Completion banner ─────────────────────────────────────────────── */}
      {showComplete && restoreLevel >= 2 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,10,15,0.5)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              color: '#00FF88',
              textShadow:
                '0 0 30px #00FF88, 0 0 60px rgba(0,255,136,0.5)',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            CITY RESTORED
          </div>
          <div
            style={{
              fontSize: 16,
              fontFamily: 'SpaceGrotesk, sans-serif',
              color: 'rgba(255,255,255,0.5)',
              marginTop: 12,
            }}
          >
            ALL LOOP CHALLENGES COMPLETE • ALL SYSTEMS ONLINE
          </div>
        </div>
      )}

      <NovaHUD
        key={novaHudText}
        className="nova-hud"
        text={novaHudText}
        autoHide={6000}
      />
    </div>
  )
}
