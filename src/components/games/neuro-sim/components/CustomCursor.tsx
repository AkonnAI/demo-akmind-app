import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [scale, setScale] = useState(1)
  const [hovering, setHovering] = useState(false)
  const rafRef = useRef<number>(0)
  const targetRef = useRef({ x: -100, y: -100 })
  const currentRef = useRef({ x: -100, y: -100 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const onDown = () => setScale(0.6)
    const onUp = () => setScale(hovering ? 1.6 : 1)

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      currentRef.current.x = lerp(currentRef.current.x, targetRef.current.x, 0.18)
      currentRef.current.y = lerp(currentRef.current.y, targetRef.current.y, 0.18)
      setPos({ x: currentRef.current.x, y: currentRef.current.y })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)

    const onEnter = (e: MouseEvent) => {
      const t = e.target as Element
      if (
        t.closest('button') ||
        t.closest('[data-hoverable]') ||
        t.tagName === 'BUTTON'
      ) {
        setHovering(true)
        setScale(1.6)
      }
    }
    const onLeave = (e: MouseEvent) => {
      const t = e.target as Element
      if (
        t.closest('button') ||
        t.closest('[data-hoverable]') ||
        t.tagName === 'BUTTON'
      ) {
        setHovering(false)
        setScale(1)
      }
    }

    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [hovering])

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x - 12,
        top: pos.y - 12,
        width: 24,
        height: 24,
        border: '2px solid #00D4FF',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 99999,
        transform: `scale(${scale})`,
        transition: 'transform 0.08s ease',
        background: hovering ? 'rgba(0,212,255,0.1)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          background: '#00D4FF',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}
