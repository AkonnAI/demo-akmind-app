import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import NovaHUD from '../components/NovaHUD'
import { CITY_FAR, CITY_MID, CITY_NEAR } from '../lib/cityLayers'

const NOVA_TEXT = 'Define 5 variables to restore power to the city grid.'

// ─── Types ────────────────────────────────────────────────────────────────────

type VarEntry = { name: string; type: string; value: string }

type ExecuteResult = {
  variables: VarEntry[]
  correct: number
  error: string | null
} | null

interface Props {
  executeResult: ExecuteResult
  liveCode: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOWER_LEFT_PCT = [8, 24, 42, 60, 78]

const EXCLUDED_NAMES = new Set([
  'print','input','int','float','str','bool','len','range',
  'for','if','else','while','def','return','import',
])

const TYPE_COLOR: Record<string, string> = {
  str: '#00D4FF',
  int: '#00FF88',
  float: '#FF9500',
  bool: '#7B2FFF',
}

const TYPE_DARK: Record<string, string> = {
  str: '#004466',
  int: '#004422',
  float: '#663300',
  bool: '#220044',
}

function tColor(t: string) {
  return TYPE_COLOR[t] ?? '#FFFFFF'
}
function tDark(t: string) {
  return TYPE_DARK[t] ?? '#111'
}

// ─── Tower state ──────────────────────────────────────────────────────────────

type TowerState = {
  active: boolean
  varData: VarEntry | null
  slamming: boolean
  showShockwave: boolean
}

function emptyTower(): TowerState {
  return { active: false, varData: null, slamming: false, showShockwave: false }
}

// ─── Stable particle data ────────────────────────────────────────────────────

type ParticleData = {
  left: string
  top: string
  size: number
  opacity: number
  driftDur: number
  driftDelay: number
  floatDur: number
  floatDelay: number
}

function buildParticles(): ParticleData[] {
  // Pseudo-random using deterministic seed so SSR/render stable
  const s = (n: number) => {
    const x = Math.sin(n * 9301 + 49297) * 233280
    return x - Math.floor(x)
  }
  return Array.from({ length: 25 }, (_, i) => ({
    left: `${s(i * 7 + 1) * 100}%`,
    top: `${10 + s(i * 7 + 2) * 70}%`,
    size: 2 + s(i * 7 + 3) * 2,
    opacity: 0.1 + s(i * 7 + 4) * 0.3,
    driftDur: 4 + s(i * 7 + 5) * 5,
    driftDelay: -(s(i * 7 + 6) * 8),
    floatDur: 3 + s(i * 7 + 0) * 3,
    floatDelay: -(s(i * 7 + 8) * 6),
  }))
}

// ─── Lightning SVG ────────────────────────────────────────────────────────────

function LightningLayer({ towers }: { towers: TowerState[] }) {
  // Each active tower sphere center: x = left% of 48vw panel, y fixed
  const PANEL_W = typeof window !== 'undefined' ? window.innerWidth * 0.48 : 600
  const SPHERE_Y = 340 // approx px from top of right panel

  const paths: { d: string; color: string }[] = []

  for (let i = 0; i < TOWER_LEFT_PCT.length - 1; i++) {
    if (towers[i]?.active && towers[i + 1]?.active) {
      const x1 = (TOWER_LEFT_PCT[i] / 100) * PANEL_W
      const x2 = (TOWER_LEFT_PCT[i + 1] / 100) * PANEL_W
      const y = SPHERE_Y
      const mx = (x1 + x2) / 2
      const my = y - 30
      const color = tColor(towers[i].varData?.type ?? 'str')
      paths.push({
        d: `M ${x1} ${y} Q ${mx} ${my} ${x2} ${y}`,
        color,
      })
    }
  }

  if (paths.length === 0) return null

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 8,
        pointerEvents: 'none',
      }}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.color}
          strokeWidth={1}
          fill="none"
          opacity={0.5}
          strokeDasharray="8 4"
          style={{ animation: 'lightning-arc 0.3s ease-in-out infinite alternate' }}
        />
      ))}
    </svg>
  )
}

// ─── Single Tower ─────────────────────────────────────────────────────────────

function Tower({
  tower,
  index,
}: {
  tower: TowerState
  index: number
}) {
  const color = tColor(tower.varData?.type ?? 'str')
  const dark = tDark(tower.varData?.type ?? 'str')

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 60,
        left: `${TOWER_LEFT_PCT[index]}%`,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 6,
      }}
    >
      {/* Variable label */}
      <AnimatePresence>
        {tower.active && tower.varData && (
          <motion.div
            key="label"
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              position: 'absolute',
              top: -38,
              whiteSpace: 'nowrap',
              background: 'rgba(5,10,20,0.92)',
              border: `1px solid ${color}`,
              borderRadius: 10,
              padding: '3px 10px',
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 10,
              color,
              letterSpacing: 0.5,
              zIndex: 2,
            }}
          >
            {tower.varData.name}: {tower.varData.type}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sphere */}
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        <AnimatePresence mode="wait">
          {tower.active ? (
            <motion.div
              key="active-sphere"
              initial={{ y: -180, scale: 1.3, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 14 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, white 0%, ${color} 30%, ${dark} 100%)`,
                border: `2px solid ${color}`,
                boxShadow: `0 0 16px ${color}, 0 0 32px ${color}aa, 0 0 64px ${color}55`,
                animation: 'pulse-glow 2.2s ease-in-out infinite',
              }}
            />
          ) : (
            <motion.div
              key="inactive-sphere"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 40% 35%, #0F1F2A, #050A0F)',
                border: '2px solid rgba(0,212,255,0.15)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Shockwave */}
        {tower.showShockwave && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 36,
              height: 36,
              border: `2px solid ${color}`,
              borderRadius: '50%',
              pointerEvents: 'none',
              animation: 'shockwave 0.55s ease-out forwards',
            }}
          />
        )}
      </div>

      {/* Energy stem */}
      <div
        style={{
          width: 4,
          height: 100,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
          background: tower.active
            ? `linear-gradient(to top, rgba(0,212,255,0.05), ${color}44)`
            : 'rgba(0,212,255,0.08)',
          marginTop: 0,
        }}
      >
        {tower.active && (
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '35%',
              left: 0,
              background: `linear-gradient(to top, transparent, ${color}, transparent)`,
              animation: 'energy-pulse 1.8s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Base plate */}
      <div
        style={{
          width: 48,
          height: 8,
          borderRadius: 4,
          background: tower.active ? `${color}88` : 'rgba(0,212,255,0.12)',
          boxShadow: tower.active ? `0 2px 12px ${color}` : 'none',
          transition: 'all 0.4s ease',
        }}
      />
    </div>
  )
}

// ─── Ghost capsule ────────────────────────────────────────────────────────────

function GhostSphere({ index }: { index: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 60,
        left: `${TOWER_LEFT_PCT[index]}%`,
        transform: 'translateX(-50%)',
        width: 36,
        height: 36,
        background: 'transparent',
        border: '2px dashed rgba(0,212,255,0.35)',
        borderRadius: '50%',
        animation: 'ghost-pulse 1.8s ease-in-out infinite',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sim1Scene({ executeResult, liveCode }: Props) {
  const particles = useMemo(() => buildParticles(), [])

  const [towers, setTowers] = useState<TowerState[]>(() =>
    Array.from({ length: 5 }, emptyTower),
  )
  const [citySurging, setCitySurging] = useState(false)
  const [showPowerRestored, setShowPowerRestored] = useState(false)

  // Parse live code for ghost capsule names
  const ghostNames = useMemo(() => {
    const varRegex = /^([a-zA-Z_]\w*)\s*=/gm
    const found: string[] = []
    let m: RegExpExecArray | null
    while ((m = varRegex.exec(liveCode)) !== null) {
      const name = m[1]
      if (!EXCLUDED_NAMES.has(name) && !found.includes(name)) {
        found.push(name)
      }
    }
    return found.slice(0, 5)
  }, [liveCode])

  // Wire execute result to towers with stagger
  const prevResultRef = useRef<ExecuteResult>(null)
  useEffect(() => {
    if (!executeResult) return
    if (executeResult === prevResultRef.current) return
    prevResultRef.current = executeResult

    const vars = executeResult.variables ?? []

    setTowers(Array.from({ length: 5 }, emptyTower))

    vars.forEach((v, i) => {
      const delay = i * 150
      window.setTimeout(() => {
        setTowers((prev) => {
          const next = [...prev]
          next[i] = {
            active: true,
            varData: v,
            slamming: true,
            showShockwave: false,
          }
          return next
        })

        // Shockwave after slam settles (~400ms)
        window.setTimeout(() => {
          setTowers((prev) => {
            const next = [...prev]
            next[i] = { ...next[i], showShockwave: true }
            return next
          })
          // Remove shockwave after 600ms
          window.setTimeout(() => {
            setTowers((prev) => {
              const next = [...prev]
              next[i] = { ...next[i], showShockwave: false }
              return next
            })
          }, 600)
        }, 400 + delay)
      }, delay)
    })
  }, [executeResult])

  // Detect all 5 active for power surge
  useEffect(() => {
    const allActive = towers.every((t) => t.active)
    if (!allActive) return

    setCitySurging(true)
    const t1 = window.setTimeout(() => setShowPowerRestored(true), 300)
    const t2 = window.setTimeout(() => {
      setCitySurging(false)
      setShowPowerRestored(false)
    }, 2800)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [towers])

  const activeCount = towers.filter((t) => t.active).length

  const cityStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    imageRendering: 'pixelated',
    animation: citySurging ? 'city-surge 1.5s ease forwards' : undefined,
    filter: citySurging ? undefined : 'hue-rotate(200deg) brightness(0.5) saturate(1.3)',
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* City layers */}
      <img alt="" src={CITY_FAR} style={{ ...cityStyle, zIndex: 0 }} />
      <img alt="" src={CITY_MID} style={{ ...cityStyle, zIndex: 0 }} />
      <img alt="" src={CITY_NEAR} style={{ ...cityStyle, zIndex: 0 }} />

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(5,10,15,0.8) 0%, rgba(5,10,15,0.3) 60%, rgba(5,10,15,0.15) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Ambient particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: '#00D4FF',
            borderRadius: '50%',
            opacity: p.opacity,
            zIndex: 2,
            pointerEvents: 'none',
            animation: `ambient-drift ${p.driftDur}s ease-in-out ${p.driftDelay}s infinite, float ${p.floatDur}s ease-in-out ${p.floatDelay}s infinite`,
          }}
        />
      ))}

      {/* Scanline overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,212,255,0.025) 3px, rgba(0,212,255,0.025) 4px)',
          animation: 'electric-flicker 10s infinite',
        }}
      />

      {/* Progress HUD */}
      <div
        className="progress-hud"
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'rgba(5,10,20,0.85)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 20,
          padding: '8px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const filled = i < activeCount
            return (
              <motion.div
                key={i}
                className="dot"
                animate={
                  filled
                    ? { scale: [0.5, 1.2, 1] }
                    : { scale: 1 }
                }
                transition={
                  filled
                    ? {
                        type: 'tween',
                        duration: 0.45,
                        times: [0, 0.55, 1],
                        ease: ['easeOut', 'easeOut', 'easeInOut'],
                      }
                    : {}
                }
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: filled ? '#00D4FF' : '#0A1A24',
                  border: filled
                    ? '1.5px solid #00D4FF'
                    : '1.5px solid rgba(0,212,255,0.2)',
                  boxShadow: filled
                    ? '0 0 10px #00D4FF, 0 0 20px rgba(0,212,255,0.5)'
                    : 'none',
                }}
              />
            )
          })}
        </div>
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 11,
            color: '#00D4FF',
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          VARIABLES DEFINED: {activeCount} / 5
        </div>
      </div>

      {/* Ghost spheres (live parse) */}
      {ghostNames.map((name, i) => {
        const slotFilled = towers[i]?.active
        if (slotFilled) return null
        return (
          <AnimatePresence key={`ghost-${name}-${i}`}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GhostSphere index={i} />
            </motion.div>
          </AnimatePresence>
        )
      })}

      {/* Towers */}
      <div
        className="towers-container"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          pointerEvents: 'none',
        }}
      >
        {towers.map((tower, i) => (
          <Tower key={i} tower={tower} index={i} />
        ))}
      </div>

      {/* Lightning SVG */}
      <LightningLayer towers={towers} />

      {/* Power Restored overlay */}
      <AnimatePresence>
        {showPowerRestored && (
          <motion.div
            key="power-restored"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,212,255,0.04)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 56,
                color: '#00D4FF',
                animation: 'power-restored-glow 1.5s infinite',
                letterSpacing: 4,
              }}
            >
              POWER RESTORED
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 18,
                color: 'rgba(0,212,255,0.6)',
                letterSpacing: 3,
              }}
            >
              ALL SYSTEMS ONLINE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NovaHUD className="nova-hud" text={NOVA_TEXT} autoHide={6000} />
    </div>
  )
}
