import { useEffect, useRef } from 'react'

export default function BackgroundGrid() {
  const ref = useRef<HTMLDivElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let rafId: number
    const tick = () => {
      offsetRef.current.x += 0.008
      offsetRef.current.y += 0.008
      if (ref.current) {
        ref.current.style.backgroundPosition = `${offsetRef.current.x}px ${offsetRef.current.y}px`
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(5,10,15,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
