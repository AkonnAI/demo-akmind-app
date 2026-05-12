import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import NovaHUD from '../components/NovaHUD'
import {
  CITY_FAR,
  CITY_MID,
  CITY_NEAR,
} from '../lib/cityLayers'
import type { Sim2GraderResult, Sim2Route } from './sim2-grader'

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_FILTER = 'hue-rotate(160deg) brightness(0.45) saturate(1.2)'

const ROUTE_COLOR: Record<Sim2Route, string> = {
  senior: '#00FF88',
  student: '#00D4FF',
  regular: 'rgba(255,255,255,0.5)',
  derail: '#E63946',
}

const BANNER_TEXT: Record<Sim2Route, string> = {
  senior: 'SENIOR FARE — 50% DISCOUNT APPLIED',
  student: 'STUDENT FARE — 30% DISCOUNT APPLIED',
  regular: 'REGULAR FARE',
  derail: 'CONDITION ERROR — TRAIN DERAILED',
}

type TrainState =
  | 'idle'
  | 'departing'
  | 'routing-left'
  | 'routing-center'
  | 'routing-right'
  | 'derailing'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  readonly executeResult: Sim2GraderResult | null
  readonly liveCode: string
  readonly onTestInput: (age: number) => void
  readonly onComplete?: () => void
  readonly onExit?: () => void
}

// ─── TrainSVG 100×40 ───────────────────────────────────────────────────────────

function TrainSVG({ flipped = false }: { readonly flipped?: boolean }) {
  const rid = useId().replaceAll(':', '')
  const filterId = `sim2-headlight-${rid}`

  return (
    <svg
      width="100"
      height="40"
      viewBox="0 0 100 40"
      fill="none"
      style={{ transform: flipped ? 'scaleX(-1)' : undefined, display: 'block' }}
    >
      <defs>
        <filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.7" />
        </filter>
      </defs>
      {/* Body */}
      <rect
        x="1.25"
        y="2.5"
        width="97.5"
        height="32.5"
        rx="7.5"
        fill="rgba(0,212,255,0.25)"
        stroke="#00D4FF"
        strokeWidth="2.5"
      />
      <rect x="12" y="6.5" width="73" height="6" rx="2" fill="rgba(0,212,255,0.12)"/>
      {/* Windows */}
      <rect x="10" y="10" width="16" height="12" rx="2" fill="rgba(0,212,255,0.25)"/>
      <rect x="34" y="10" width="16" height="12" rx="2" fill="rgba(0,212,255,0.25)"/>
      <rect x="58" y="10" width="16" height="12" rx="2" fill="rgba(0,212,255,0.25)"/>
      <circle cx="17" cy="36.5" r="5" fill="#050A0F" stroke="#00D4FF" strokeWidth="1.25"/>
      <circle cx="44" cy="36.5" r="5" fill="#050A0F" stroke="#00D4FF" strokeWidth="1.25"/>
      <circle cx="69" cy="36.5" r="5" fill="#050A0F" stroke="#00D4FF" strokeWidth="1.25"/>
      <circle cx="82" cy="36.5" r="5" fill="#050A0F" stroke="#00D4FF" strokeWidth="1.25"/>
      {/* Bright headlight */}
      <circle
        cx="92.5"
        cy="19"
        r="4"
        fill="white"
        opacity={0.9}
        filter={`url(#${filterId})`}
      />
    </svg>
  )
}

// ─── Track SVG ────────────────────────────────────────────────────────────────

function getTrackGlow(route: Sim2Route | null, trackRoute: Sim2Route): string | undefined {
  if (route === 'derail' || route !== trackRoute) return undefined
  if (trackRoute === 'senior')  return 'drop-shadow(0 0 4px #00FF88)'
  if (trackRoute === 'student') return 'drop-shadow(0 0 4px #00D4FF)'
  if (trackRoute === 'regular') return 'drop-shadow(0 0 4px rgba(255,255,255,0.4))'
  return undefined
}

function TracksSVG({ route }: { readonly route: Sim2Route | null }) {
  const isDerail  = route === 'derail'
  const isActive  = (trackRoute: Sim2Route) => !isDerail && route === trackRoute

  const activeStyle = (trackRoute: Sim2Route) => {
    const active = isActive(trackRoute)
    let stroke = 'rgba(255,255,255,0.15)'
    if (isDerail) stroke = '#E63946'
    else if (active) stroke = ROUTE_COLOR[trackRoute]

    return {
      stroke,
      strokeWidth: (isDerail || active) ? 1.5 : 0.8,
      strokeDasharray: (isDerail || active) ? undefined : '2 1',
      filter: getTrackGlow(route, trackRoute),
      animation: isDerail ? 'status-blink 0.25s ease-in-out infinite' : undefined,
    }
  }

  const baseStyle = {
    stroke: 'rgba(255,255,255,0.15)',
    strokeWidth: 0.8,
    strokeDasharray: '2 1',
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55%' }}
    >
      {/* CENTER track — always visible base */}
      <line x1="50" y1="0" x2="50" y2="40" {...baseStyle} />
      {/* CENTER track below fork */}
      <line
        x1="50" y1="40" x2="50" y2="100"
        {...(route ? activeStyle('student') : baseStyle)}
      />
      {/* LEFT track (senior) */}
      <path
        d="M 50 40 C 50 65 12 82 10 100"
        fill="none"
        {...(route ? activeStyle('senior') : baseStyle)}
      />
      {/* RIGHT track (regular) */}
      <path
        d="M 50 40 C 50 65 88 82 90 100"
        fill="none"
        {...(route ? activeStyle('regular') : baseStyle)}
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Sim2SceneView({ executeResult, liveCode, onTestInput }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelSize, setPanelSize] = useState({ w: 600, h: 800 })

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setPanelSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const [trainState, setTrainState] = useState<TrainState>('idle')
  const [showBanner, setShowBanner]   = useState(false)
  const [showSparks, setShowSparks]   = useState(false)
  const [showSteam, setShowSteam]     = useState(false)
  const [testingAge, setTestingAge]   = useState<number | null>(null)

  // Stable random values for particles
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: `spark-${i}`,
        tx: -60 + ((i * 37 + 11) % 121),
        ty: -40 + ((i * 17 + 5) % 61),
        color: i % 2 === 0 ? '#E63946' : '#FF9500',
      })),
    [],
  )

  const steam = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: `steam-${i}`,
        idx: i,
        x: -28 + ((i * 19 + 3) % 57),
        color: i % 2 === 0 ? 'white' : '#00D4FF',
      })),
    [],
  )

  // Train animation sequence driven by executeResult
  useEffect(() => {
    if (!executeResult?.route) {
      setTrainState('idle')
      setShowBanner(false)
      setShowSparks(false)
      setShowSteam(false)
      return
    }

    const route = executeResult.route

    setTrainState('idle')
    setShowBanner(false)
    setShowSparks(false)
    setShowSteam(false)

    const t1 = globalThis.setTimeout(() => setTrainState('departing'), 80)

    const t2 = globalThis.setTimeout(() => {
      if (route === 'derail') {
        setTrainState('derailing')
        setShowSparks(true)
      } else if (route === 'senior') {
        setTrainState('routing-left')
      } else if (route === 'student') {
        setTrainState('routing-center')
      } else {
        setTrainState('routing-right')
      }
    }, 900)

    const t3 = globalThis.setTimeout(() => {
      if (route !== 'derail') setShowSteam(true)
      setShowBanner(true)
    }, 2200)

    return () => {
      globalThis.clearTimeout(t1)
      globalThis.clearTimeout(t2)
      globalThis.clearTimeout(t3)
    }
  }, [executeResult])

  // Live-code checklist
  const hasIf   = useMemo(() => /\bif\b/.test(liveCode),   [liveCode])
  const hasElif = useMemo(() => /\belif\b/.test(liveCode), [liveCode])
  const hasElse = useMemo(() => /\belse\b/.test(liveCode), [liveCode])

  const validStructure = hasIf && hasElif && hasElse

  const [hintVisible, setHintVisible] = useState(false)
  const structRef = useRef({ hasIf, hasElif, hasElse })
  useEffect(() => {
    structRef.current = { hasIf, hasElif, hasElse }
  }, [hasIf, hasElif, hasElse])

  const idleTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const hintDismissTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const hintReshowTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  const clearIdleTimer = () => {
    if (idleTimerRef.current != null) {
      globalThis.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }
  const clearHintDismissTimer = () => {
    if (hintDismissTimerRef.current != null) {
      globalThis.clearTimeout(hintDismissTimerRef.current)
      hintDismissTimerRef.current = null
    }
  }
  const clearHintReshowTimer = () => {
    if (hintReshowTimerRef.current != null) {
      globalThis.clearTimeout(hintReshowTimerRef.current)
      hintReshowTimerRef.current = null
    }
  }

  const scheduleHintReshow = () => {
    clearHintReshowTimer()
    hintReshowTimerRef.current = globalThis.setTimeout(() => {
      const s = structRef.current
      if (!(s.hasIf && s.hasElif && s.hasElse)) setHintVisible(true)
      hintReshowTimerRef.current = null
    }, 10000)
  }

  // Reset on every edit: hide hint, then 8s idle → show if still incomplete
  useEffect(() => {
    clearIdleTimer()
    clearHintReshowTimer()
    if (validStructure) {
      setHintVisible(false)
      return
    }
    setHintVisible(false)
    idleTimerRef.current = globalThis.setTimeout(() => {
      setHintVisible(true)
      idleTimerRef.current = null
    }, 8000)
    return () => {
      clearIdleTimer()
    }
  }, [liveCode, validStructure])

  // While hint is open: auto-dismiss at 12s, then re-show flow after 10s
  useEffect(() => {
    clearHintDismissTimer()
    if (!hintVisible || validStructure) return

    hintDismissTimerRef.current = globalThis.setTimeout(() => {
      setHintVisible(false)
      hintDismissTimerRef.current = null
      scheduleHintReshow()
    }, 12000)

    return () => {
      clearHintDismissTimer()
    }
  }, [hintVisible, validStructure])

  useEffect(
    () => () => {
      clearIdleTimer()
      clearHintDismissTimer()
      clearHintReshowTimer()
    },
    [],
  )

  function dismissHint() {
    setHintVisible(false)
    clearHintDismissTimer()
    scheduleHintReshow()
  }

  const hintBody = useMemo(() => {
    if (!hasIf) {
      return (
        <>
          <span>Start with:</span>
          <span
            style={{
              fontFamily: 'JetBrainsMono, monospace',
              fontSize: 12,
              color: '#00FF88',
              background: 'rgba(0,255,136,0.08)',
              padding: '4px 8px',
              borderRadius: 4,
              display: 'block',
              marginTop: 6,
            }}
          >
            if age &gt;= 60:
            <br />
            {'    '}print(&apos;Senior Fare&apos;)
          </span>
        </>
      )
    }
    if (!hasElif) {
      return (
        <>
          <span>Now add:</span>
          <span
            style={{
              fontFamily: 'JetBrainsMono, monospace',
              fontSize: 12,
              color: '#00FF88',
              background: 'rgba(0,255,136,0.08)',
              padding: '4px 8px',
              borderRadius: 4,
              display: 'block',
              marginTop: 6,
            }}
          >
            elif age &lt; 25:
            <br />
            {'    '}print(&apos;Student Fare&apos;)
          </span>
        </>
      )
    }
    if (!hasElse) {
      return (
        <>
          <span>Finally add:</span>
          <span
            style={{
              fontFamily: 'JetBrainsMono, monospace',
              fontSize: 12,
              color: '#00FF88',
              background: 'rgba(0,255,136,0.08)',
              padding: '4px 8px',
              borderRadius: 4,
              display: 'block',
              marginTop: 6,
            }}
          >
            else:
            <br />
            {'    '}print(&apos;Regular Fare&apos;)
          </span>
        </>
      )
    }
    return null
  }, [hasIf, hasElif, hasElse])

  const route = executeResult?.route ?? null

  // ── Train pixel positions (default station: left 44%, bottom 52%) ─────────
  const { w: W, h: H } = panelSize
  const trainW = 100
  const trainH = 40

  // bottom: 52% → top = H − 0.52H − trainH ; fork depart bottom: 44%
  const IDLE_TOP = H * 0.48 - trainH
  const DEPART_TOP = H * 0.56 - trainH
  const ARRIVED_TOP = H * 0.94 - trainH
  const DERAIL_TOP = H * 0.56 - trainH

  const CENTER_LEFT = W * 0.44 - trainW / 2
  const LEFT_LEFT = W * 0.1 - trainW / 2
  const RIGHT_LEFT = W * 0.9 - trainW / 2

  interface TrainAnim {
    left: number | number[]
    top: number | number[]
    rotate?: number
    opacity?: number | number[]
  }

  const trainAnim: TrainAnim = (() => {
    switch (trainState) {
      case 'idle':
        return {
          left: CENTER_LEFT,
          top: [IDLE_TOP - 3, IDLE_TOP + 3, IDLE_TOP - 3],
          rotate: 0,
          opacity: 1,
        }
      case 'departing':
        return { left: CENTER_LEFT, top: DEPART_TOP, rotate: 0, opacity: 1 }
      case 'routing-left':
        return { left: LEFT_LEFT,   top: ARRIVED_TOP, rotate: -15, opacity: 1 }
      case 'routing-center':
        return { left: CENTER_LEFT, top: ARRIVED_TOP, rotate: 0,   opacity: 1 }
      case 'routing-right':
        return { left: RIGHT_LEFT,  top: ARRIVED_TOP, rotate: 15,  opacity: 1 }
      case 'derailing':
        return {
          left: [CENTER_LEFT - 8, CENTER_LEFT + 8, CENTER_LEFT - 6, CENTER_LEFT + 6, CENTER_LEFT],
          top: DERAIL_TOP,
          rotate: 0,
          opacity: [1, 1, 1, 0.5, 0],
        }
    }
  })()

  function getTrainTransition() {
    if (trainState === 'idle') {
      return {
        top:     { duration: 2, ease: 'easeInOut' as const, repeat: Infinity },
        left:    { duration: 0.1 },
        rotate:  { duration: 0.1 },
        opacity: { duration: 0.1 },
      }
    }
    if (trainState === 'derailing') {
      return {
        left:    { duration: 0.4, ease: 'easeInOut' as const },
        top:     { duration: 0.1 },
        opacity: { duration: 0.5, delay: 0.3 },
      }
    }
    return { duration: 1.2, ease: 'easeInOut' as const }
  }
  const trainTransition = getTrainTransition()

  // ── Signal light data ──────────────────────────────────────────────────────
  const signals: Array<{
    id: Sim2Route
    leftPct: string
    label: string
    labelColor: string
  }> = [
    { id: 'senior',  leftPct: '18%', label: 'SENIOR -50%', labelColor: '#00FF88'               },
    { id: 'student', leftPct: '50%', label: 'STUDENT -30%', labelColor: '#00D4FF'              },
    { id: 'regular', leftPct: '80%', label: 'REGULAR',      labelColor: 'rgba(255,255,255,0.4)' },
  ]

  const platforms: Array<{ id: Sim2Route; leftPct: string }> = [
    { id: 'senior',  leftPct: '8%'  },
    { id: 'student', leftPct: '46%' },
    { id: 'regular', leftPct: '78%' },
  ]

  // ── Steam destination position ─────────────────────────────────────────────
  function getSteamAnchorLeft(): number {
    if (route === 'senior')  return LEFT_LEFT   + trainW / 2
    if (route === 'regular') return RIGHT_LEFT  + trainW / 2
    return CENTER_LEFT + trainW / 2
  }
  const steamLeft = getSteamAnchorLeft()

  // ── Test button state ──────────────────────────────────────────────────────
  const TEST_AGES = [
    { label: 'AGE: 67', age: 67 },
    { label: 'AGE: 20', age: 20 },
    { label: 'AGE: 35', age: 35 },
  ]

  function handleTestClick(age: number) {
    setTestingAge(age)
    onTestInput(age)
    globalThis.setTimeout(() => setTestingAge(null), 1200)
  }

  return (
    <div
      ref={panelRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* ── City background layers ─────────────────────────────────────────── */}
      <img
        alt=""
        src={CITY_FAR}
        style={{
          position: 'absolute', bottom: 0, width: '100%',
          imageRendering: 'pixelated', filter: BG_FILTER,
          zIndex: 0,
        }}
      />
      <img
        alt=""
        src={CITY_MID}
        style={{
          position: 'absolute', bottom: 0, width: '100%',
          imageRendering: 'pixelated', filter: BG_FILTER,
          zIndex: 0,
        }}
      />
      <img
        alt=""
        src={CITY_NEAR}
        style={{
          position: 'absolute', bottom: 0, width: '100%',
          filter: BG_FILTER,
          zIndex: 0,
        }}
      />

      {/* ── Top gradient ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(to bottom, rgba(5,10,15,0.75), transparent)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* ── Track SVG ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <TracksSVG route={route} />
      </div>

      {/* ── How to play (instructions) ────────────────────────────────────── */}
      <div
        className="sim-panel-right"
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          zIndex: 12,
          width: 220,
          background: 'rgba(5,10,20,0.92)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 10,
          padding: 14,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 10,
            color: '#7B2FFF',
            letterSpacing: 3,
            marginBottom: 10,
          }}
        >
          HOW TO PLAY
        </div>
        {(
          [
            { step: 1, text: 'The age variable is already set for you', on: false },
            { step: 2, text: 'Write if age >= 60: for senior passengers', on: hasIf },
            { step: 3, text: 'Add elif age < 25: for students', on: hasElif },
            { step: 4, text: 'Add else: for everyone else', on: hasElse },
          ] as const
        ).map(({ step, text, on }) => (
          <div
            key={step}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: step < 4 ? 10 : 0,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: on ? '#00D4FF' : 'rgba(0,212,255,0.15)',
                border: '1px solid #00D4FF',
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: on ? '#050A0F' : '#00D4FF',
              }}
            >
              {step}
            </div>
            <span
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 12,
                lineHeight: 1.5,
                color: on ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
              }}
            >
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* ── Signal lights ─────────────────────────────────────────────────── */}
      {signals.map((sig) => {
        const isDerailActive = route === 'derail'
        const isActive = !isDerailActive && route === sig.id
        const bgColor  = isActive ? '#00FF88' : '#E63946'
        let glow = '0 0 8px #E63946'
        if (isActive)        glow = '0 0 16px #00FF88, 0 0 32px rgba(0,255,136,0.4)'
        if (isDerailActive)  glow = '0 0 8px #E63946'

        return (
          <div
            key={sig.id}
            style={{
              position: 'absolute',
              left: sig.leftPct,
              bottom: '45%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              zIndex: 11,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              animate={{ backgroundColor: bgColor, boxShadow: glow }}
              transition={{ duration: 0.3 }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
              }}
            />
            <span
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 10,
                color: sig.labelColor,
                opacity: 0.6,
                letterSpacing: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {sig.label}
            </span>
          </div>
        )
      })}

      {/* ── Arrival platforms ─────────────────────────────────────────────── */}
      {platforms.map((p) => {
        const isActive = route === p.id && route !== 'derail'
        return (
          <motion.div
            key={p.id}
            animate={{
              backgroundColor: isActive ? ROUTE_COLOR[p.id] : 'rgba(255,255,255,0.08)',
              boxShadow: isActive
                ? `0 0 12px ${ROUTE_COLOR[p.id]}, 0 0 24px ${ROUTE_COLOR[p.id]}55`
                : 'none',
            }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              left: p.leftPct,
              bottom: 4,
              transform: 'translateX(-50%)',
              width: 60,
              height: 6,
              borderRadius: 3,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
        )
      })}

      {/* ── Train ─────────────────────────────────────────────────────────── */}
      <motion.div
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animate={trainAnim as any}
        transition={trainTransition}
        style={{
          position: 'absolute',
          width: trainW,
          height: trainH,
          zIndex: 10,
          boxShadow: '0 0 20px rgba(0,212,255,0.6)',
        }}
      >
        <TrainSVG flipped={trainState === 'routing-left'} />
      </motion.div>

      {/* ── Derail sparks ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSparks &&
          sparks.map((spark) => (
            <motion.div
              key={spark.id}
              initial={{ x: CENTER_LEFT + trainW / 2, y: DERAIL_TOP + trainH / 2, opacity: 1, scale: 1 }}
              animate={{ x: CENTER_LEFT + trainW / 2 + spark.tx, y: DERAIL_TOP + trainH / 2 + spark.ty, opacity: 0, scale: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: sparks.indexOf(spark) * 0.03, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: spark.color,
                zIndex: 11,
                pointerEvents: 'none',
              }}
            />
          ))}
      </AnimatePresence>

      {/* ── Steam burst on arrival ────────────────────────────────────────── */}
      <AnimatePresence>
        {showSteam &&
          steam.map((puff) => (
            <motion.div
              key={puff.id}
              initial={{ x: steamLeft + puff.x, y: ARRIVED_TOP, scale: 0, opacity: 0.8 }}
              animate={{ x: steamLeft + puff.x, y: ARRIVED_TOP - 24 - puff.idx * 4, scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: puff.idx * 0.05, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: puff.color,
                zIndex: 11,
                pointerEvents: 'none',
              }}
            />
          ))}
      </AnimatePresence>

      {/* ── Result banner ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBanner && route && (
          <motion.div
            key={route}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0 }}
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(5,10,20,0.92)',
              border: `1px solid ${ROUTE_COLOR[route]}`,
              borderRadius: 12,
              padding: '10px 24px',
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 16,
              color: ROUTE_COLOR[route],
              whiteSpace: 'nowrap',
              zIndex: 13,
            }}
          >
            {BANNER_TEXT[route]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Test buttons ──────────────────────────────────────────────────── */}
      <div
        className="test-buttons-container"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 12,
        }}
      >
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          TEST YOUR LOGIC
        </div>
        {TEST_AGES.map(({ label, age }) => (
          <motion.button
            key={age}
            type="button"
            className="test-btn"
            data-hoverable
            onClick={() => handleTestClick(age)}
            whileHover={{
              scale: 1.03,
              borderColor: 'rgba(0,212,255,0.7)',
              backgroundColor: 'rgba(0,212,255,0.08)',
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              background: 'rgba(8,13,20,0.9)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              padding: '8px 16px',
              width: 120,
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {testingAge === age ? 'TESTING…' : label}
          </motion.button>
        ))}
      </div>

      {/* ── Live code checklist ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 12,
          background: 'rgba(5,10,20,0.85)',
          border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {(
          [
            { found: hasIf,   label: 'if condition'  },
            { found: hasElif, label: 'elif condition' },
            { found: hasElse, label: 'else branch'    },
          ] as const
        ).map(({ found, label }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <motion.div
              animate={{
                backgroundColor: found ? '#00FF88' : 'rgba(255,255,255,0.1)',
                boxShadow: found ? '0 0 6px #00FF88' : 'none',
                scale: found ? [1, 1.4, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 12,
                color: found ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── NOVA hint bubble ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {hintVisible && !validStructure && (
          <motion.div
            key="nova-hint"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 120,
              transform: 'translateX(-50%)',
              zIndex: 15,
              background: 'rgba(5,10,20,0.95)',
              border: '1px solid #FF9500',
              borderRadius: 10,
              padding: '12px 16px',
              paddingRight: 36,
              maxWidth: 280,
              pointerEvents: 'auto',
            }}
          >
            <button
              type="button"
              onClick={dismissHint}
              style={{
                position: 'absolute',
                top: 8,
                right: 10,
                background: 'none',
                border: 'none',
                color: '#FF9500',
                fontSize: 18,
                lineHeight: 1,
                cursor: 'pointer',
                padding: 4,
              }}
              aria-label="Dismiss hint"
            >
              ×
            </button>
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: '#FF9500',
                marginBottom: 8,
              }}
            >
              💡 NOVA HINT
            </div>
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.6,
              }}
            >
              {hintBody}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NovaHUD
        className="nova-hud"
        text="Write if/elif/else to route the train to the right platform."
        autoHide={6000}
      />
    </div>
  )
}
