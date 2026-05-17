import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '../data/lessons'
import { CITY_FAR, CITY_MID, CITY_NEAR } from '../lib/cityLayers'

interface Props {
  readonly lesson?: Lesson | null
  readonly onDismiss: () => void
}

const LEARN_POINTS: Record<number, [string, string, string]> = {
  1: [
    'What a variable is and why every program uses them',
    'The 3 main data types: str, int, and float',
    'How to store and print user information',
  ],
  2: [
    'How to make your program take decisions',
    'Writing if, elif, and else conditions',
    'How comparison operators work: >=, <, ==',
  ],
  3: [
    'How to repeat an action many times with one line',
    'Writing for loops with range()',
    'Why loops are the heartbeat of every program',
  ],
  4: [
    'Storing multiple items in a list',
    'Labelling data with dictionaries',
    'How to access, add, and remove items',
  ],
  5: [
    'Writing reusable blocks of code called functions',
    'Passing inputs and getting outputs with return',
    'Why functions make programs cleaner and faster',
  ],
  6: [
    'How to fetch live data from the internet using requests',
    'Reading API responses and parsing JSON output',
    'Connecting your code to real-world data sources',
  ],
  7: [
    'Navigating nested JSON data structures',
    'Using dictionary keys to extract specific values',
    'Handling real API payloads in Python',
  ],
  8: [
    'Combining loops, functions, and APIs in one app',
    'Building an end-to-end mini program from scratch',
    'Structuring code that is readable and reusable',
  ],
  9: [
    'Presenting a complete Python project with confidence',
    'Writing clean, well-commented code',
    'Demonstrating everything you have learned so far',
  ],
  10: [
    'Identifying and fixing common Python syntax errors',
    'Debugging logic errors by reading tracebacks',
    'Writing correct code under time pressure',
  ],
}

function getPoints(id: number): [string, string, string] {
  return (
    LEARN_POINTS[id] ?? [
      'Apply Python skills to a real challenge',
      'Write clean, working code from scratch',
      'Level up your programming confidence',
    ]
  )
}

function stripNovaPrefix(text: string): string {
  return text.replace(/^NOVA:\s*/i, '').trim()
}

export default function MissionIntro({ lesson, onDismiss }: Props) {
  console.log('MissionIntro rendering, lesson:', lesson)

  const [countdown, setCountdown] = useState(4)
  const [leaving, setLeaving] = useState(false)
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function dismiss() {
    if (leaving) return
    setLeaving(true)
    setTimeout(onDismiss, 320)
  }

  useEffect(() => {
    if (lesson === null || lesson === undefined) return undefined

    ivRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(ivRef.current ?? undefined)
          dismiss()
          return 0
        }
        return n - 1
      })
    }, 1000)

    function onKey() {
      dismiss()
    }
    globalThis.addEventListener('keydown', onKey)

    return () => {
      clearInterval(ivRef.current ?? undefined)
      globalThis.removeEventListener('keydown', onKey)
    }
  }, [lesson])

  if (lesson === null || lesson === undefined) {
    return null
  }

  const points = getPoints(lesson.id)
  const briefText = stripNovaPrefix(lesson.briefText)

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="mission-intro-overlay"
          className="mission-intro-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={dismiss}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(5,10,15,0.97)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* City bg layers */}
          <img
            alt=""
            src={CITY_FAR}
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              imageRendering: 'pixelated',
              filter: 'hue-rotate(200deg) brightness(0.4)',
              zIndex: 0,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          />
          <img
            alt=""
            src={CITY_MID}
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              imageRendering: 'pixelated',
              filter: 'hue-rotate(200deg) brightness(0.4)',
              zIndex: 0,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          />
          <img
            alt=""
            src={CITY_NEAR}
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              imageRendering: 'pixelated',
              filter: 'hue-rotate(200deg) brightness(0.4)',
              zIndex: 0,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          />

          {/* Center card */}
          <motion.div
            key="mission-intro-card"
            className="mission-intro-card"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              zIndex: 1,
              width: 520,
              background: 'rgba(8,13,20,0.98)',
              border: '2px solid #00D4FF',
              borderRadius: 20,
              padding: '40px 48px',
              boxShadow: '0 0 60px rgba(0,212,255,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Mission number */}
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: '#7B2FFF',
                letterSpacing: 4,
              }}
            >
              MISSION {String(lesson.id).padStart(2, '0')}
            </div>

            {/* Title */}
            <div
              className="mission-intro-title"
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 40,
                color: 'white',
                marginTop: 8,
                lineHeight: 1.1,
              }}
            >
              {lesson.title}
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px solid rgba(0,212,255,0.2)',
                margin: '20px 0',
              }}
            />

            {/* What you will learn */}
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: 3,
                marginBottom: 12,
              }}
            >
              WHAT YOU WILL LEARN
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {points.map((pt) => (
                <div
                  key={pt}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#00D4FF',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'SpaceGrotesk, sans-serif',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.75)',
                      lineHeight: 1.6,
                    }}
                  >
                    {pt}
                  </span>
                </div>
              ))}
            </div>

            {/* Your mission */}
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: 3,
                marginTop: 20,
                marginBottom: 10,
              }}
            >
              YOUR MISSION
            </div>
            <div
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 15,
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.7,
              }}
            >
              {briefText}
            </div>

            {/* Bottom info row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 20,
              }}
            >
              <span
                style={{
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                Estimated time: 8–12 minutes
              </span>
              <span
                style={{
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#FFD700',
                }}
              >
                +{lesson.xpReward} XP
              </span>
            </div>

            {/* Start button */}
            <button
              type="button"
              onClick={dismiss}
              style={{
                marginTop: 28,
                width: '100%',
                height: 52,
                background: 'linear-gradient(135deg, #00D4FF, #7B2FFF)',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 18,
                color: '#050A0F',
                cursor: 'pointer',
                transition: 'filter 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)'
                e.currentTarget.style.transform = 'scale(1.03)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              START MISSION →
            </button>

            {/* Countdown */}
            <div
              style={{
                textAlign: 'center',
                marginTop: 10,
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 12,
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              {countdown > 0
                ? `Auto-starting in ${countdown}s`
                : 'Starting…'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
