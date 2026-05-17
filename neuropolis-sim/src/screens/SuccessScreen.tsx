import { motion } from 'framer-motion'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import { LESSONS } from '../data/lessons'
import {
  CITY_FAR,
  CITY_LAYER_FILTER,
  CITY_MID,
  CITY_NEAR,
} from '../lib/cityLayers'
import { Audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'

const CHECK =
  '/assets/icons/kenney_game-icons/PNG/White/2x/checkmark.png'

const PALETTE = ['#00D4FF', '#FFD700', '#7B2FFF'] as const

export default function SuccessScreen() {
  const activeLessonId = useGameStore((s) => s.activeLessonId)
  const xp = useGameStore((s) => s.xp)
  const setScreen = useGameStore((s) => s.setScreen)
  const setActiveLesson = useGameStore((s) => s.setActiveLesson)

  const lesson = useMemo(
    () => LESSONS.find((l) => l.id === activeLessonId),
    [activeLessonId],
  )

  const nextLesson = useMemo(
    () => LESSONS.find((l) => l.id === (activeLessonId ?? 0) + 1),
    [activeLessonId],
  )

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        tx: ((i * 97) % 401) - 200,
        ty: -50 - ((i * 61) % 251),
        c: PALETTE[i % PALETTE.length],
      })),
    [],
  )

  const flashRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lesson) return
    Audio.play('confirm')
  }, [lesson])

  useEffect(() => {
    if (!lesson) return
    const flash = flashRef.current
    const card = cardRef.current
    if (!flash || !card) return

    gsap
      .timeline()
      .fromTo(flash, { opacity: 0 }, { opacity: 0.9, duration: 0.13 })
      .to(flash, { opacity: 0.2, duration: 0.14 })
      .to(flash, { opacity: 0, duration: 0.13 })

    gsap.fromTo(
      card,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.55, delay: 0.5, ease: 'power3.out' },
    )
  }, [lesson])

  if (!lesson) return null

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#050A0F',
      }}
    >
      <div
        ref={flashRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />

      <img
        alt=""
        src={CITY_FAR}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          imageRendering: 'pixelated',
          filter: CITY_LAYER_FILTER,
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
          filter: CITY_LAYER_FILTER,
        }}
      />
      <img
        alt=""
        src={CITY_NEAR}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          filter: CITY_LAYER_FILTER,
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,10,15,0.7)',
          zIndex: 2,
        }}
      />

      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], x: p.tx, y: p.ty }}
          transition={{ duration: 0.8, delay: i * 0.04, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: p.c,
            zIndex: 3,
          }}
        />
      ))}

      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 440,
          zIndex: 4,
          opacity: 0,
        }}
      >
        <div
          className="success-card"
          style={{
            background: 'rgba(8,13,20,0.96)',
            border: '2px solid #00FF88',
            borderRadius: 20,
            padding: 40,
            boxShadow: '0 0 60px rgba(0,255,136,0.15)',
          }}
        >
          <img
            alt=""
            src={CHECK}
            width={48}
            height={48}
            style={{
              filter:
                'brightness(0) invert(1) sepia(1) hue-rotate(90deg) saturate(3)',
            }}
          />

          <div
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              color: '#00FF88',
              letterSpacing: 4,
              marginTop: 16,
            }}
          >
            MISSION COMPLETE
          </div>

          <div
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 32,
              color: '#fff',
              marginTop: 8,
            }}
          >
            {lesson.title}
          </div>

          <div
            style={{
              height: 1,
              background: 'rgba(0,255,136,0.2)',
              margin: '20px 0',
            }}
          />

          <motion.div
            className="success-xp"
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.2, 1] }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 52,
              color: '#FFD700',
            }}
          >
            +{lesson.xpReward} XP
          </motion.div>

          <div
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontSize: 14,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 4,
            }}
          >
            TOTAL XP: {xp}
          </div>

          <div
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontSize: 13,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 24,
            }}
          >
            NEXT MISSION UNLOCKED:
          </div>

          <div
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 20,
              color: '#00D4FF',
              marginTop: 6,
            }}
          >
            {nextLesson ? nextLesson.title : 'All missions cleared'}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 28,
            }}
          >
            <button
              type="button"
              onClick={() => setScreen('terminal')}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
              }}
            >
              REPLAY
            </button>
            <button
              type="button"
              onClick={() => {
                if (nextLesson) {
                  setActiveLesson(nextLesson.id)
                  setScreen('mission-brief')
                } else {
                  setScreen('mission-select')
                }
              }}
              style={{
                flex: 2,
                height: 46,
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #00D4FF, #7B2FFF)',
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                color: '#050A0F',
                cursor: 'pointer',
              }}
            >
              NEXT MISSION →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
