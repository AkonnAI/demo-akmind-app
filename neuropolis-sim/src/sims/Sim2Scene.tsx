import { AnimatePresence, motion } from 'framer-motion'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import NovaHUD from '../components/NovaHUD'
import type { Sim2GraderResult, Sim2Route } from './sim2-grader'
import { SIM2_TEST_CASES } from './sim2-grader'

type Branch = Exclude<Sim2Route, 'derail'>

interface Props {
  readonly executeResult: Sim2GraderResult | null
  readonly liveCode: string
  readonly sessionKey: number
  readonly onComplete: () => void
  readonly onTestInput: (age: number) => void | Promise<void>
}

const TRAIN_START = { x: 50, y: 93 }

const ROUTE_COLORS: Record<Sim2Route, string> = {
  senior: '#00FF88',
  student: '#00D4FF',
  regular: 'rgba(255,255,255,0.5)',
  derail: '#E63946',
}

/** Final station / fork positions (percent, matching SVG) */
const DESTINATIONS: Record<Sim2Route, { x: number; y: number }> = {
  senior: { x: 22, y: 17 },
  student: { x: 50, y: 10 },
  regular: { x: 82.5, y: 17 },
  derail: { x: 50, y: 53 },
}

const FORK_PT = { x: 50, y: 53 }

const EASE_PANEL = [0.4, 0, 0.2, 1] as [number, number, number, number]

function expectedForAge(age: number): Sim2Route | null {
  const t = SIM2_TEST_CASES.find((tc) => tc.age === age)
  return t ? t.expected : null
}

const STATION_META: Record<
  Branch,
  { label: string; sub: string; color: string; subRgb: string; left: string; top: string }
> = {
  senior: {
    label: 'SENIOR',
    sub: '-50% FARE',
    color: '#00FF88',
    subRgb: 'rgba(0,255,136,0.6)',
    left: '22%',
    top: '17%',
  },
  student: {
    label: 'STUDENT',
    sub: '-30% FARE',
    color: '#00D4FF',
    subRgb: 'rgba(0,212,255,0.65)',
    left: '50%',
    top: '10%',
  },
  regular: {
    label: 'REGULAR',
    sub: 'STANDARD FARE',
    color: 'rgba(255,255,255,0.72)',
    subRgb: 'rgba(255,255,255,0.55)',
    left: '82.5%',
    top: '17%',
  },
}

function novaFeedback(
  pinRoute: Sim2Route,
  pinAge: number,
  exp: Sim2Route | null,
): string {
  const isCorrect =
    exp !== null && pinRoute !== 'derail' && pinRoute === exp
  const branch = pinRoute === 'derail' ? null : (pinRoute as Branch)
  const meta = branch ? STATION_META[branch] : null

  if (pinRoute === 'derail')
    return exp !== null ?
        `Age ${pinAge} should go to ${exp.charAt(0).toUpperCase() + exp.slice(1)} station.`
      : `Age ${pinAge} should follow your if/elif/else — check branches.`
  if (meta !== undefined && meta !== null && isCorrect === true)
    return branch === 'senior' ?
        `${meta.label} station — senior fare (${meta.sub}).`
      : branch === 'student' ?
        `${meta.label} station — student fare (${meta.sub}).`
      : `${meta.label} station — standard fare (${meta.sub}).`
  if (meta !== undefined && meta !== null && isCorrect !== true && exp !== null) {
    const needStation =
      exp === 'senior' ? 'Senior' : exp === 'student' ? 'Student' : 'Regular'
    const needFare =
      exp === 'senior'
        ? 'senior discounted fare.'
        : exp === 'student'
          ? 'student discounted fare.'
          : 'standard fare lane.'
    return `Age ${pinAge} should go to ${needStation} station (${needFare})`
  }
  return 'Three passengers. Three fares. Write the conditions.'
}

export default function Sim2Scene({
  executeResult,
  liveCode,
  sessionKey,
  onComplete,
  onTestInput,
}: Props) {
  const prevTimers = useRef<ReturnType<typeof globalThis.setTimeout>[]>([])
  const [trainPos, setTrainPos] = useState(TRAIN_START)
  const [trainSpeed, setTrainSpeed] = useState(0.7)
  const [trainRotation, setTrainRotation] = useState(0)
  const [trainShaking, setTrainShaking] = useState(false)
  const [mainTrackActive, setMainTrackActive] = useState(false)
  const [activeRoute, setActiveRoute] = useState<Sim2Route | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [testAge, setTestAge] = useState<number | null>(null)
  const [stationPulse, setStationPulse] = useState<Branch | null>(null)
  const [allRoutesSuccess, setAllRoutesSuccess] = useState(false)
  const [novaText, setNovaText] = useState(
    'Three passengers. Three fares. Write the conditions.',
  )

  const testedAgesRef = useRef<Set<number>>(new Set())
  const correctCountRef = useRef(0)
  const missionTriggeredRef = useRef(false)

  useEffect(() => {
    return () => {
      prevTimers.current.forEach(globalThis.clearTimeout)
      prevTimers.current = []
    }
  }, [])

  useEffect(() => {
    testedAgesRef.current = new Set()
    correctCountRef.current = 0
    missionTriggeredRef.current = false
    prevTimers.current.forEach(globalThis.clearTimeout)
    prevTimers.current = []
    setTrainPos(TRAIN_START)
    setTrainSpeed(0.5)
    setTrainRotation(0)
    setTrainShaking(false)
    setMainTrackActive(false)
    setActiveRoute(null)
    setShowResult(false)
    setIsMoving(false)
    setTestAge(null)
    setStationPulse(null)
    setAllRoutesSuccess(false)
    setNovaText('Three passengers. Three fares. Write the conditions.')
  }, [sessionKey])

  function animateTrainToRoute(
    route: Sim2Route,
    runOnArrival: () => void,
  ): ReturnType<typeof globalThis.setTimeout>[] {
    setIsMoving(true)
    setTrainRotation(0)
    setTrainPos(FORK_PT)
    setTrainSpeed(0.7)

    const t1 = globalThis.setTimeout(() => {
      setActiveRoute(route)
      setTrainPos(DESTINATIONS[route])
      setTrainSpeed(0.6)
      let rot = 0
      if (route === 'senior') rot = -35
      else if (route === 'regular') rot = 35
      setTrainRotation(rot)
    }, 750)

    const t2 = globalThis.setTimeout(() => {
      runOnArrival()
      setShowResult(true)
      if (route === 'derail') {
        setTrainShaking(true)
        const shakeEnd = globalThis.setTimeout(() => setTrainShaking(false), 500)
        prevTimers.current.push(shakeEnd)
      }
    }, 1400)

    const t3 = globalThis.setTimeout(() => {
      setShowResult(false)
      setActiveRoute(null)
      setMainTrackActive(false)
      setTrainRotation(180)
      setTrainPos(TRAIN_START)
      setTrainSpeed(0.5)
      setTestAge(null)
      setStationPulse(null)
      const tRotateReset = globalThis.setTimeout(() => {
        setTrainRotation(0)
      }, 520)
      prevTimers.current.push(tRotateReset)
    }, 3200)

    return [t1, t2, t3]
  }

  useEffect(() => {
    const res = executeResult
    if (res === undefined || res === null) return

    prevTimers.current.forEach(globalThis.clearTimeout)
    prevTimers.current = []

    setTrainPos(TRAIN_START)
    setTrainSpeed(0.5)
    setTrainRotation(0)
    setActiveRoute(null)
    setMainTrackActive(false)
    setShowResult(false)
    setTrainShaking(false)
    setStationPulse(null)
    setIsMoving(false)

    const pinRoute = (res.route ?? 'derail') as Sim2Route
    const pinAge = res.age ?? 67
    setNovaText(`Testing age ${pinAge}…`)

    const t0 = globalThis.setTimeout(() => {
      setTestAge(res.age ?? 67)
      setMainTrackActive(true)
      const onArrival = (): void => {
        setIsMoving(false)
        const exp = expectedForAge(pinAge)
        if (pinRoute !== 'derail') setStationPulse(pinRoute as Branch)
        else setStationPulse(null)
        setNovaText(novaFeedback(pinRoute, pinAge, exp))
        const expected: Sim2Route =
          pinAge >= 60 ? 'senior' : pinAge < 25 ? 'student' : 'regular'
        if (pinRoute === expected) {
          testedAgesRef.current.add(pinAge)
          correctCountRef.current = testedAgesRef.current.size
        }
        if (
          correctCountRef.current >= 3 &&
          missionTriggeredRef.current === false
        ) {
          missionTriggeredRef.current = true
          setAllRoutesSuccess(true)
          setNovaText(
            'All three passengers routed correctly. You understand conditions.',
          )
          globalThis.setTimeout(() => onComplete(), 2000)
        }
      }

      const animTimers = animateTrainToRoute(pinRoute, onArrival)
      prevTimers.current.push(...animTimers)
    }, 300)

    prevTimers.current = [t0]

    return () => {
      prevTimers.current.forEach(globalThis.clearTimeout)
      prevTimers.current = []
    }
  }, [executeResult, onComplete])

  const hasIf = useMemo(() => /\bif\b/.test(liveCode), [liveCode])
  const hasElif = useMemo(() => /\belif\b/.test(liveCode), [liveCode])
  const hasElse = useMemo(() => /\belse\b/.test(liveCode), [liveCode])

  const structRef = useRef({ hasIf, hasElif, hasElse })
  useEffect(() => {
    structRef.current = { hasIf, hasElif, hasElse }
  }, [hasIf, hasElif, hasElse])

  const validStructure = hasIf && hasElif && hasElse
  const [hintVisible, setHintVisible] = useState(false)
  const idleTimerRef = useRef<number | null>(null)
  const hintDismissRef = useRef<number | null>(null)
  const hintReshowRef = useRef<number | null>(null)

  function clearTimers() {
    if (idleTimerRef.current !== null)
      globalThis.clearTimeout(idleTimerRef.current)
    if (hintDismissRef.current !== null)
      globalThis.clearTimeout(hintDismissRef.current)
    if (hintReshowRef.current !== null)
      globalThis.clearTimeout(hintReshowRef.current)
    idleTimerRef.current =
      hintDismissRef.current =
      hintReshowRef.current =
      null
  }

  function scheduleHintReshow() {
    hintReshowRef.current = globalThis.setTimeout(() => {
      const s = structRef.current
      if (!(s.hasIf && s.hasElif && s.hasElse)) setHintVisible(true)
    }, 10000)
  }

  useEffect(() => {
    clearTimers()
    if (validStructure === true) {
      setHintVisible(false)
      return
    }
    setHintVisible(false)
    idleTimerRef.current = globalThis.setTimeout(() => setHintVisible(true), 8000)
    return () => clearTimers()
  }, [liveCode, validStructure])

  useEffect(() => {
    if (!hintVisible || validStructure) return
    hintDismissRef.current = globalThis.setTimeout(() => {
      setHintVisible(false)
      scheduleHintReshow()
    }, 12000)
    return () => {
      if (hintDismissRef.current !== null)
        globalThis.clearTimeout(hintDismissRef.current)
    }
  }, [hintVisible, validStructure])

  const hintBody = useMemo(() => {
    if (!hasIf)
      return (
        <>
          <span>Start with:</span>
          <span style={{ ...hintCodeStyle }}>if age &gt;= 60:</span>
        </>
      )
    if (!hasElif)
      return (
        <>
          <span>Then:</span>
          <span style={{ ...hintCodeStyle }}>elif age &lt; 25:</span>
        </>
      )
    if (!hasElse)
      return (
        <>
          <span>Finally:</span>
          <span style={{ ...hintCodeStyle }}>else:</span>
        </>
      )
    return null
  }, [hasIf, hasElif, hasElse])

  const resultBanner = (): {
    line3: string
    line4: string
    color: string
    subColor: string
  } | null => {
    const r = executeResult?.route
    const age = executeResult?.age ?? testAge
    const show = showResult === true && isMoving === false
    if (
      show === false ||
      r === undefined ||
      r === null ||
      executeResult === null ||
      age === null
    )
      return null

    switch (r) {
      case 'senior':
        return {
          line3: 'SENIOR FARE ✓',
          line4: '50% discount applied',
          color: '#00FF88',
          subColor: 'rgba(0,255,136,0.62)',
        }
      case 'student':
        return {
          line3: 'STUDENT FARE ✓',
          line4: '30% discount applied',
          color: '#00D4FF',
          subColor: 'rgba(0,212,255,0.62)',
        }
      case 'regular':
        return {
          line3: 'REGULAR ✓',
          line4: 'Standard fare lane',
          color: 'rgba(255,255,255,0.75)',
          subColor: 'rgba(255,255,255,0.42)',
        }
      default:
        return {
          line3: 'CONDITION ERROR ✗',
          line4: 'Check your if / elif logic',
          color: '#E63946',
          subColor: 'rgba(230,57,70,0.55)',
        }
    }
  }

  function handleAgeClick(n: number): void {
    prevTimers.current.forEach(globalThis.clearTimeout)
    prevTimers.current = []
    setTrainPos(TRAIN_START)
    setTrainSpeed(0.5)
    setTrainRotation(0)
    setTrainShaking(false)
    setMainTrackActive(false)
    setActiveRoute(null)
    setShowResult(false)
    setIsMoving(false)
    setTestAge(n)
    setStationPulse(null)
    void onTestInput(n)
  }

  const b = resultBanner()

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#050A0F',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <svg
        viewBox="0 0 400 600"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <line x1={200} y1={560} x2={200} y2={320} stroke="rgba(255,255,255,0.2)" strokeWidth={10} strokeLinecap="round"/>
        <line x1={200} y1={320} x2={88} y2={100} stroke="rgba(255,255,255,0.15)" strokeWidth={10} strokeLinecap="round"/>
        <line x1={200} y1={320} x2={200} y2={60} stroke="rgba(255,255,255,0.15)" strokeWidth={10} strokeLinecap="round"/>
        <line x1={200} y1={320} x2={330} y2={100} stroke="rgba(255,255,255,0.15)" strokeWidth={10} strokeLinecap="round"/>
        <circle cx={200} cy={320} r={14} fill="#050A0F" stroke="#00D4FF" strokeWidth={2}/>

        {mainTrackActive && (
          <line
            x1={200}
            y1={560}
            x2={200}
            y2={320}
            stroke={
              activeRoute !== null ? ROUTE_COLORS[activeRoute] : '#00D4FF'
            }
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
        {activeRoute === 'senior' && (
          <line x1={200} y1={320} x2={88} y2={100} stroke="#00FF88" strokeWidth={8} strokeLinecap="round"/>
        )}
        {activeRoute === 'student' && (
          <line x1={200} y1={320} x2={200} y2={60} stroke="#00D4FF" strokeWidth={8} strokeLinecap="round"/>
        )}
        {activeRoute === 'regular' && (
          <line x1={200} y1={320} x2={330} y2={100} stroke="rgba(255,255,255,0.5)" strokeWidth={8} strokeLinecap="round"/>
        )}
      </svg>

      {(Object.keys(STATION_META) as Branch[]).map((key) => {
        const meta = STATION_META[key]
        const pulsing =
          allRoutesSuccess ||
          stationPulse === key ||
          (showResult === true && executeResult?.route === key)
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: meta.left,
              top: meta.top,
              transform: 'translate(-50%, -50%)',
              zIndex: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
              gap: 8,
            }}
          >
            <motion.div
              animate={
                pulsing ?
                  key === 'senior' ?
                    {
                      boxShadow: [
                        '0 0 30px rgba(0,255,136,1), 0 0 60px rgba(0,255,136,0.4)',
                        '0 0 55px rgba(0,255,136,1), 0 0 90px rgba(0,255,136,0.45)',
                        '0 0 30px rgba(0,255,136,1), 0 0 60px rgba(0,255,136,0.4)',
                      ],
                    }
                  : key === 'student' ?
                    {
                      boxShadow: [
                        '0 0 30px rgba(0,212,255,1), 0 0 60px rgba(0,212,255,0.4)',
                        '0 0 55px rgba(0,212,255,1), 0 0 90px rgba(0,212,255,0.42)',
                        '0 0 30px rgba(0,212,255,1), 0 0 60px rgba(0,212,255,0.4)',
                      ],
                    }
                  : {
                      boxShadow: [
                        '0 0 28px rgba(255,255,255,0.55), 0 0 58px rgba(255,255,255,0.22)',
                        '0 0 50px rgba(255,255,255,0.65), 0 0 88px rgba(255,255,255,0.3)',
                        '0 0 28px rgba(255,255,255,0.55), 0 0 58px rgba(255,255,255,0.22)',
                      ],
                    }
                : { boxShadow: '0 0 0 transparent' }
              }
              transition={{
                duration: pulsing === true ? 0.72 : 0.45,
                repeat: allRoutesSuccess && pulsing === true ? Infinity : 0,
              }}
              style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                border: `3px solid ${meta.color}`,
                background: `${meta.color}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background:
                    pulsing === true ? `${meta.color}66` : `${meta.color}33`,
                  transition: 'background 0.35s ease',
                }}
              />
            </motion.div>
            {key === 'senior' ? (
              <>
                <div
                  style={{
                    fontFamily: 'SpaceGrotesk, sans-serif',
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#00FF88',
                  }}
                >
                  SENIOR
                </div>
                <div
                  style={{
                    marginTop: -4,
                    fontFamily: 'SpaceGrotesk, sans-serif',
                    fontSize: 11,
                    color: 'rgba(0,255,136,0.6)',
                  }}
                >
                  -50% FARE
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: 'SpaceGrotesk, sans-serif',
                    fontWeight: 700,
                    fontSize: 14,
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </div>
                <div
                  style={{
                    marginTop: -4,
                    fontFamily: 'SpaceGrotesk, sans-serif',
                    fontSize: 11,
                    color: meta.subRgb,
                  }}
                >
                  {meta.sub}
                </div>
              </>
            )}
          </div>
        )
      })}

      <div
        style={{
          position: 'absolute',
          left: `${trainPos.x}%`,
          top: `${trainPos.y}%`,
          transform: 'translate(-50%, -50%)',
          transition: `left ${trainSpeed}s ease-in-out, top ${trainSpeed}s ease-in-out`,
          zIndex: 6,
          width: 50,
          height: 80,
        }}
      >
        <motion.div
          animate={{
            rotate: trainRotation,
            x: trainShaking ? [0, -5, 5, -4, 4, 0] : 0,
          }}
          transition={{
            rotate: { duration: 0.3, ease: 'easeInOut' },
            x: { duration: 0.5, ease: 'easeInOut' },
          }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px 12px 6px 6px',
            border: '2px solid rgba(0,212,255,0.8)',
            background: 'linear-gradient(to top, #7B2FFF, #00D4FF)',
            boxShadow:
              '0 0 20px rgba(0,212,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 6,
            gap: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 12,
              height: 8,
              background: 'white',
              borderRadius: 4,
              boxShadow: '0 0 16px white',
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: 12, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ width: 12, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div
            style={{
              marginTop: 'auto',
              width: '100%',
              height: 8,
              background: 'rgba(123,47,255,0.5)',
              borderBottomLeftRadius: 4,
              borderBottomRightRadius: 4,
            }}
          />
        </motion.div>
      </div>

      {testAge !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${trainPos.x}%`,
            top: `calc(${trainPos.y}% - 44px)`,
            transform: 'translateX(-50%)',
            transition: `left ${trainSpeed}s ease-in-out, top ${trainSpeed}s ease-in-out`,
            zIndex: 7,
            whiteSpace: 'nowrap',
            background: 'rgba(5,10,20,0.95)',
            border: '1px solid #00D4FF',
            borderRadius: 20,
            padding: '4px 12px',
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            color: '#00D4FF',
          }}
        >
          AGE: {testAge}
        </div>
      )}

      <motion.div
        animate={{ bottom: showResult === true ? 80 : 20 }}
        transition={{ duration: 0.38, ease: EASE_PANEL }}
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 13,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        {([
          { n: 67, c: '#00FF88' },
          { n: 20, c: '#00D4FF' },
          { n: 35, c: 'rgba(255,255,255,0.5)' },
        ] satisfies ReadonlyArray<{ n: number; c: string }>).map((t) => (
          <motion.button
            key={t.n}
            type="button"
            data-hoverable
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAgeClick(t.n)}
            style={{
              width: 64,
              height: 40,
              cursor: 'pointer',
              border: `2px solid ${t.c}`,
              borderRadius: 8,
              background: 'transparent',
              color: t.c,
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t.n}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {b !== null && (
          <motion.div
            key={`ban-${executeResult?.route}-${executeResult?.age}`}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 220,
              zIndex: 15,
              textAlign: 'center',
              background: 'rgba(5,10,20,0.97)',
              border: `2px solid ${b.color}`,
              borderRadius: 16,
              padding: '12px 20px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontFamily: 'SpaceGrotesk, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 4 }}>
              AGE {executeResult?.age}
            </div>
            <div style={{ fontFamily: 'SpaceGrotesk, sans-serif', fontWeight: 700, fontSize: 16, color: b.color, margin: '4px 0' }}>
              →
            </div>
            <div style={{ fontFamily: 'SpaceGrotesk, sans-serif', fontWeight: 700, fontSize: 22, color: b.color, marginBottom: 6 }}>
              {b.line3}
            </div>
            <div style={{ fontFamily: 'SpaceGrotesk, sans-serif', fontSize: 12, color: b.subColor }}>
              {b.line4}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {allRoutesSuccess && (
          <motion.div
            key="all-routes"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 17,
              pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 44,
                color: '#00FF88',
              }}
            >
              ALL ROUTES CORRECT
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          top: 'auto',
          right: 'auto',
          zIndex: 12,
          width: 190,
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid rgba(0,212,255,0.16)',
          background: 'rgba(5,10,20,0.88)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 9, letterSpacing: 3, color: '#7B2FFF', marginBottom: 6 }}>
          HOW TO PLAY
        </div>
        {([
          { step: 1, text: 'The age variable is already set', on: false },
          { step: 2, text: 'if age >= 60: seniors', on: hasIf },
          { step: 3, text: 'elif age < 25: students', on: hasElif },
          { step: 4, text: 'else: regular fare', on: hasElse },
        ] satisfies ReadonlyArray<{ step: number; text: string; on: boolean }>).map(
          ({ step, text, on }) => (
            <div key={step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: step < 4 ? 6 : 0 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: on ? '#00D4FF' : 'rgba(0,212,255,0.08)',
                  border: '1px solid #00D4FF',
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: 'SpaceGrotesk',
                  color: on ? '#050A0F' : '#00D4FF',
                }}
              >
                {step}
              </div>
              <span style={{ fontFamily: 'SpaceGrotesk', fontSize: 11, color: on ? '#fff' : 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                {text}
              </span>
            </div>
          ),
        )}
      </div>

      <NovaHUD text={novaText} autoHide={0} className="nova-hud" />

      <AnimatePresence>
        {hintVisible && !validStructure && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              right: 14,
              top: '18%',
              left: 'auto',
              zIndex: 18,
              maxWidth: 200,
              padding: '11px 14px',
              borderRadius: 9,
              background: 'rgba(5,10,20,0.96)',
              border: '1px solid #FF9500',
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setHintVisible(false)
              }}
              style={{
                float: 'right',
                margin: '-4px 0 6px 6px',
                background: 'none',
                border: 'none',
                color: '#FF9500',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <div style={{ fontFamily: 'SpaceGrotesk', fontWeight: 700, fontSize: 10, color: '#FF9500', marginBottom: 6 }}>
              HINT
            </div>
            <div style={{ fontFamily: 'SpaceGrotesk', fontSize: 12.5, color: 'rgba(255,255,255,0.88)', clear: 'right' }}>
              {hintBody}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const hintCodeStyle: CSSProperties = {
  fontFamily: 'JetBrainsMono, monospace',
  fontSize: 11,
  color: '#00FF88',
  background: 'rgba(0,255,136,0.08)',
  padding: '4px 8px',
  borderRadius: 5,
  display: 'inline-block',
  marginTop: 6,
}
