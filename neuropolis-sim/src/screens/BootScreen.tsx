import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'

const LINES = [
  'NEUROPOLIS OS v2.6.1',
  'Copyright Akonnai Pvt Ltd 2026',
  'Initializing kernel...',
  'Loading neural pathways... [OK]',
  'Mounting simulation core... [OK]',
  'Calibrating Python interpreter... [OK]',
  'Establishing district connection... [OK]',
  'Loading asset registry... [OK]',
  'Welcome, Cadet.',
  '',
  '>> PRESS ANY KEY TO BEGIN',
]

export default function BootScreen() {
  const setScreen = useGameStore((s) => s.setScreen)
  const [visible, setVisible] = useState<string[]>([])
  const [doneTyping, setDoneTyping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const begunRef = useRef(false)

  useEffect(() => {
    Audio.play('music')

    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setVisible(LINES.slice(0, i))
      if (i >= LINES.length) {
        window.clearInterval(id)
        setDoneTyping(true)
      }
    }, 120)

    return () => window.clearInterval(id)
  }, [])

  const begin = useCallback(() => {
    if (begunRef.current) return
    begunRef.current = true

    Audio.play('glitch')

    const el = containerRef.current
    if (!el) {
      setScreen('mission-select')
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setScreen('mission-select')
      },
    })

    tl.to(el, { x: -4, duration: 0.06 })
      .to(el, { x: 4, duration: 0.06 })
      .to(el, { x: -3, duration: 0.06 })
      .to(el, { x: 3, duration: 0.06 })
      .to(el, { x: 0, duration: 0.06 })
      .to(el, { opacity: 0, duration: 0.4 })
  }, [setScreen])

  useEffect(() => {
    const go = () => begin()
    window.addEventListener('keydown', go)
    window.addEventListener('click', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('click', go)
    }
  }, [begin])

  return (
    <div
      className="boot-root"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#050A0F',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        className="boot-container"
        style={{
          padding: '48px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {visible.map((line, idx) => {
          const isFirst = idx === 0
          return (
            <div
              key={`${idx}-${line}`}
              style={{
                fontFamily: 'JetBrainsMono, monospace',
                fontSize: isFirst ? '20px' : '15px',
                fontWeight: isFirst ? 700 : 400,
                color: isFirst ? '#00D4FF' : '#00FF41',
                lineHeight: 2,
              }}
            >
              {line}
              {doneTyping && idx === LINES.length - 1 ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '18px',
                    background: '#00FF41',
                    marginLeft: 4,
                    verticalAlign: 'text-bottom',
                    animation: 'boot-cursor-blink 1s step-end infinite',
                  }}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
