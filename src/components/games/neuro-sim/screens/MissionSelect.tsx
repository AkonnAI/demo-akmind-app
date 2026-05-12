import { motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { LESSONS } from '../data/lessons'
import {
  CITY_FAR,
  CITY_LAYER_FILTER,
  CITY_MID,
  CITY_NEAR,
} from '../lib/cityLayers'
import { Audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'

const LOCKED =
  '/assets/icons/kenney_game-icons/PNG/White/2x/locked.png'
const CHECK =
  '/assets/icons/kenney_game-icons/PNG/White/2x/checkmark.png'

export default function MissionSelect() {
  const xp = useGameStore((s) => s.xp)
  const unlockedLessons = useGameStore((s) => s.unlockedLessons)
  const completedLessons = useGameStore((s) => s.completedLessons)
  const setScreen = useGameStore((s) => s.setScreen)
  const setActiveLesson = useGameStore((s) => s.setActiveLesson)

  const [mouseX, setMouseX] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  )

  const centerX = useMemo(
    () => (typeof window !== 'undefined' ? window.innerWidth / 2 : 0),
    [],
  )

  const onMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX)
  }, [])

  const dx = mouseX - centerX

  return (
    <div
      className="mission-select-root"
      onMouseMove={onMove}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#050A0F',
      }}
    >
      <img
        alt=""
        className="mission-bg-layer"
        src={CITY_FAR}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-10%',
          width: '120%',
          imageRendering: 'pixelated',
          filter: CITY_LAYER_FILTER,
          transform: `translateX(${dx * 0.003}px)`,
          transition: 'transform 0.1s linear',
        }}
      />
      <img
        alt=""
        className="mission-bg-layer"
        src={CITY_MID}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-5%',
          width: '110%',
          filter: CITY_LAYER_FILTER,
          transform: `translateX(${dx * 0.006}px)`,
          transition: 'transform 0.1s linear',
        }}
      />
      <img
        alt=""
        className="mission-bg-layer"
        src={CITY_NEAR}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-2.5%',
          width: '105%',
          filter: CITY_LAYER_FILTER,
          transform: `translateX(${dx * 0.01}px)`,
          transition: 'transform 0.1s linear',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, #050A0F 15%, rgba(5,10,15,0.6) 50%, rgba(5,10,15,0.3) 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      <header
        className="mission-top-bar"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#00D4FF',
            }}
          >
            NEUROPOLIS
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            •
          </span>
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            MISSION SELECT
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontSize: 13,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            XP
          </span>
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 18,
              color: '#7B2FFF',
            }}
          >
            {xp}
          </span>
        </div>
      </header>

      <motion.div
        className="mission-cards-container"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.06 },
          },
        }}
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '0 24px',
          zIndex: 5,
        }}
      >
        {LESSONS.map((lesson) => {
          const unlocked = unlockedLessons.includes(lesson.id)
          const completed = completedLessons.includes(lesson.id)

          const onCard = () => {
            if (!unlocked) {
              Audio.play('error')
              return
            }
            Audio.play('select')
            setActiveLesson(lesson.id)
            window.setTimeout(() => setScreen('mission-brief'), 100)
          }

          return (
            <motion.div
              key={lesson.id}
              className="mission-card"
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={
                unlocked
                  ? {
                      scale: 1.06,
                      borderColor: 'rgba(0,212,255,0.9)',
                      boxShadow: '0 0 24px rgba(0,212,255,0.25)',
                      transition: { duration: 0.15 },
                    }
                  : undefined
              }
              whileTap={
                !unlocked
                  ? { x: [-4, 4, -4, 0], transition: { duration: 0.35 } }
                  : undefined
              }
              onClick={onCard}
              style={{
                width: 160,
                height: 200,
                background: 'rgba(8,13,20,0.88)',
                border: `1px solid rgba(0,212,255,${unlocked ? 0.6 : 0.15})`,
                borderRadius: 10,
                padding: 14,
                cursor: unlocked ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  height: 80,
                  background: 'rgba(0,212,255,0.05)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {completed ? (
                  <img
                    alt=""
                    src={CHECK}
                    width={40}
                    height={40}
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(1) sepia(1) saturate(3) hue-rotate(90deg)',
                    }}
                  />
                ) : unlocked ? (
                  <span
                    style={{
                      fontFamily: 'SpaceGrotesk, sans-serif',
                      fontWeight: 700,
                      fontSize: 36,
                      color: '#00D4FF',
                      opacity: 0.4,
                    }}
                  >
                    {String(lesson.id).padStart(2, '0')}
                  </span>
                ) : (
                  <img
                    alt=""
                    src={LOCKED}
                    width={32}
                    height={32}
                    style={{ opacity: 0.4 }}
                  />
                )}
              </div>

              <div
                style={{
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#fff',
                  marginTop: 10,
                }}
              >
                {lesson.title}
              </div>
              <div
                style={{
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 4,
                }}
              >
                {lesson.subtitle}
              </div>

              <div
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 10,
                  background: 'rgba(123,47,255,0.25)',
                  border: '1px solid rgba(123,47,255,0.5)',
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontWeight: 700,
                  fontSize: 11,
                  color: '#7B2FFF',
                }}
              >
                +{lesson.xpReward} XP
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
