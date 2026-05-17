import { motion } from 'framer-motion'
import { useEffect } from 'react'
import NovaSVG from '../components/NovaSVG'
import { LESSONS } from '../data/lessons'
import {
  CITY_FAR,
  CITY_LAYER_FILTER,
  CITY_MID,
  CITY_NEAR,
} from '../lib/cityLayers'
import { Audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'

const STAR = '/assets/icons/kenney_game-icons/PNG/White/2x/star.png'

export default function MissionBrief() {
  const activeLessonId = useGameStore((s) => s.activeLessonId)
  const setScreen = useGameStore((s) => s.setScreen)

  const lesson = LESSONS.find((l) => l.id === activeLessonId)

  useEffect(() => {
    if (!activeLessonId || !lesson) setScreen('mission-select')
  }, [activeLessonId, lesson, setScreen])

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
      <img
        alt=""
        src={CITY_FAR}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-10%',
          width: '120%',
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
          left: '-5%',
          width: '110%',
          filter: CITY_LAYER_FILTER,
        }}
      />
      <img
        alt=""
        src={CITY_NEAR}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-2.5%',
          width: '105%',
          filter: CITY_LAYER_FILTER,
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,10,15,0.82)',
          zIndex: 2,
        }}
      />

      <button
        type="button"
        onClick={() => setScreen('mission-select')}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 5,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'SpaceGrotesk, sans-serif',
          fontSize: 13,
          color: '#00D4FF',
          opacity: 0.6,
        }}
      >
        ← BACK
      </button>

      <motion.div
        className="nova-character-brief"
        initial={{ x: 200, opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        style={{
          position: 'absolute',
          right: '8%',
          bottom: 0,
          width: 200,
          zIndex: 4,
          filter:
            'drop-shadow(0 0 12px #00D4FF) drop-shadow(0 0 30px rgba(0,212,255,0.3))',
          animation: 'float 3s ease-in-out infinite',
        }}
      >
        <NovaSVG />
      </motion.div>

      <motion.div
        className="brief-card"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 20,
          delay: 0.1,
        }}
        style={{
          position: 'absolute',
          left: '8%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 400,
          background: 'rgba(8,13,20,0.94)',
          border: '2px solid rgba(0,212,255,0.7)',
          borderRadius: 16,
          padding: 32,
          boxShadow:
            '0 0 40px rgba(0,212,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
          zIndex: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 11,
            color: '#7B2FFF',
            letterSpacing: 4,
          }}
        >
          MISSION {lesson.id.toString().padStart(2, '0')}
        </div>
        <div
          className="brief-title"
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 30,
            color: '#fff',
            marginTop: 8,
          }}
        >
          {lesson.title}
        </div>

        <div
          style={{
            height: 1,
            background: 'rgba(0,212,255,0.2)',
            margin: '16px 0',
          }}
        />

        <div
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          DISTRICT: {lesson.district}
        </div>

        <p
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontSize: 15,
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.7,
            marginTop: 16,
          }}
        >
          {lesson.briefText}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 20,
          }}
        >
          <img alt="" src={STAR} width={16} height={16} />
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              color: '#00FF88',
            }}
          >
            REWARD: {lesson.xpReward} XP
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            Audio.play('maximize')
            setScreen('terminal')
          }}
          style={{
            width: '100%',
            height: 50,
            marginTop: 24,
            background: 'linear-gradient(135deg, #00D4FF, #7B2FFF)',
            color: '#050A0F',
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 17,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9'
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,212,255,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ENTER TERMINAL
        </button>
      </motion.div>
    </div>
  )
}
