import { useEffect, useRef, useState } from 'react'

interface Props {
  readonly text: string
  readonly autoHide?: number
  readonly className?: string
}

export default function NovaHUD({
  text,
  autoHide = 6000,
  className,
}: Props) {
  const [visible, setVisible] = useState(true)
  const [chars, setChars] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startTypewriter(str: string) {
    if (timerRef.current) clearInterval(timerRef.current)
    if (hideRef.current) clearTimeout(hideRef.current)
    setVisible(true)
    setChars('')

    let i = 0
    timerRef.current = setInterval(() => {
      i += 1
      setChars(str.slice(0, i))
      if (i >= str.length) {
        clearInterval(timerRef.current ?? undefined)
        timerRef.current = null
      }
    }, 22)

    if (autoHide > 0) {
      hideRef.current = setTimeout(() => setVisible(false), autoHide)
    }
  }

  useEffect(() => {
    startTypewriter(text)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (hideRef.current) clearTimeout(hideRef.current)
    }
  }, [text])

  if (!visible) return null

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 14,
        width: 220,
        background: 'rgba(5,10,20,0.95)',
        border: '1px solid #00D4FF',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 0 16px rgba(0,212,255,0.2)',
      }}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'none',
          border: 'none',
          fontSize: 14,
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          lineHeight: 1,
          padding: 2,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {/* Avatar circle */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00D4FF 0%, #7B2FFF 100%)',
            border: '1.5px solid #00D4FF',
            boxShadow: '0 0 10px #00D4FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        >
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              color: 'white',
            }}
          >
            N
          </span>
        </div>

        <div>
          <span
            style={{
              display: 'block',
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              color: '#00D4FF',
            }}
          >
            NOVA
          </span>
          <span
            style={{
              display: 'block',
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            AI Instructor
          </span>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid rgba(0,212,255,0.15)',
          marginBottom: 8,
        }}
      />

      {/* Message */}
      <div
        style={{
          fontFamily: 'SpaceGrotesk, sans-serif',
          fontSize: 12,
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.6,
          minHeight: 36,
        }}
      >
        {chars}
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: '#00D4FF',
            marginLeft: 1,
            verticalAlign: 'text-bottom',
            animation: 'blink 0.8s step-end infinite',
          }}
        />
      </div>
    </div>
  )
}
