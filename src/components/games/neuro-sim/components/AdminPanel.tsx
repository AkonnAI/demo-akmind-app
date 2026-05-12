/**
 * DEV / ADMIN PANEL
 * Toggle with the ` (backtick) key or the floating ⚙ button.
 * Gives full control over game state without touching localStorage manually.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { LESSONS } from '../data/lessons'
import { useGameStore } from '../store/useGameStore'
import type { GameScreen } from '../store/useGameStore'

const SCREENS: GameScreen[] = ['boot', 'mission-select', 'mission-brief', 'terminal', 'success']

const COL = {
  bg: 'rgba(5,10,20,0.97)',
  border: 'rgba(123,47,255,0.5)',
  accent: '#7B2FFF',
  cyan: '#00D4FF',
  green: '#00FF88',
  red: '#E63946',
  text: 'rgba(255,255,255,0.85)',
  dim: 'rgba(255,255,255,0.35)',
}

function Btn({
  children,
  onClick,
  color = COL.cyan,
  full = false,
}: {
  children: React.ReactNode
  onClick: () => void
  color?: string
  full?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'SpaceGrotesk, sans-serif',
        fontWeight: 700,
        fontSize: 11,
        color,
        background: `${color}18`,
        border: `1px solid ${color}55`,
        borderRadius: 5,
        padding: '5px 10px',
        cursor: 'pointer',
        width: full ? '100%' : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span
        style={{
          fontFamily: 'SpaceGrotesk, sans-serif',
          fontSize: 11,
          color: COL.dim,
          minWidth: 90,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>{children}</div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '10px 0 8px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: `${COL.accent}30` }} />
      <span
        style={{
          fontFamily: 'SpaceGrotesk, sans-serif',
          fontWeight: 700,
          fontSize: 9,
          color: COL.accent,
          letterSpacing: 2,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `${COL.accent}30` }} />
    </div>
  )
}

export default function AdminPanel() {
  const [open, setOpen] = useState(false)
  const [xpInput, setXpInput] = useState('')

  const screen = useGameStore((s) => s.screen)
  const xp = useGameStore((s) => s.xp)
  const unlockedLessons = useGameStore((s) => s.unlockedLessons)
  const completedLessons = useGameStore((s) => s.completedLessons)
  const activeLessonId = useGameStore((s) => s.activeLessonId)

  const setScreen = useGameStore((s) => s.setScreen)
  const setActiveLesson = useGameStore((s) => s.setActiveLesson)
  const addXP = useGameStore((s) => s.addXP)
  const unlockLesson = useGameStore((s) => s.unlockLesson)
  const completeLesson = useGameStore((s) => s.completeLesson)

  // Raw store setter for bulk operations
  const rawSet = useGameStore.setState

  // Keyboard shortcut: backtick toggles panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '`' || e.key === '~') setOpen((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const unlockAll = useCallback(() => {
    rawSet({
      unlockedLessons: LESSONS.map((l) => l.id),
    })
  }, [rawSet])

  const completeAll = useCallback(() => {
    rawSet({
      completedLessons: LESSONS.map((l) => l.id),
      unlockedLessons: LESSONS.map((l) => l.id),
    })
  }, [rawSet])

  const resetProgress = useCallback(() => {
    localStorage.removeItem('neuropolis-game')
    rawSet({
      xp: 0,
      unlockedLessons: [1],
      completedLessons: [],
      screen: 'boot',
      activeLessonId: null,
    })
    globalThis.location.reload()
  }, [rawSet])

  function jumpToLesson(id: number) {
    setActiveLesson(id)
    setScreen('terminal')
  }

  function jumpToBrief(id: number) {
    setActiveLesson(id)
    setScreen('mission-brief')
  }

  function applyXP() {
    const n = Number(xpInput)
    if (!isNaN(n) && n !== 0) addXP(n)
    setXpInput('')
  }

  function setXPDirect(value: number) {
    rawSet({ xp: value })
  }

  return (
    <>
      {/* ── Floating toggle button ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Admin Panel (` key)"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9999,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: open ? COL.accent : 'rgba(8,13,20,0.9)',
          border: `2px solid ${COL.accent}`,
          color: open ? '#fff' : COL.accent,
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: open ? `0 0 20px ${COL.accent}66` : 'none',
          transition: 'all 0.2s',
        }}
      >
        ⚙
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              right: 64,
              bottom: 8,
              zIndex: 9998,
              width: 320,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: COL.bg,
              border: `1px solid ${COL.border}`,
              borderRadius: 12,
              padding: '14px 16px 18px',
              boxShadow: `0 0 40px rgba(123,47,255,0.25)`,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  color: COL.accent,
                  letterSpacing: 2,
                }}
              >
                ⚙ ADMIN PANEL
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 10,
                  color: COL.dim,
                }}
              >
                ` to toggle
              </span>
              <div style={{ flex: 1 }} />
              <span
                style={{
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 11,
                  color: COL.cyan,
                }}
              >
                XP: {xp}
              </span>
            </div>

            {/* ── Status ───────────────────────────────────────────────────── */}
            <Divider label="STATUS" />
            <Row label="Screen">
              <span
                style={{
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 11,
                  color: COL.green,
                }}
              >
                {screen}
              </span>
            </Row>
            <Row label="Lesson">
              <span
                style={{
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 11,
                  color: COL.cyan,
                }}
              >
                {activeLessonId ?? 'none'}
              </span>
            </Row>
            <Row label="Unlocked">
              <span
                style={{
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 11,
                  color: COL.text,
                }}
              >
                [{unlockedLessons.join(', ')}]
              </span>
            </Row>
            <Row label="Completed">
              <span
                style={{
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 11,
                  color: COL.text,
                }}
              >
                {completedLessons.length === 0 ? 'none' : `[${completedLessons.join(', ')}]`}
              </span>
            </Row>

            {/* ── Navigate screens ─────────────────────────────────────────── */}
            <Divider label="NAVIGATE" />
            <Row label="Screen">
              {SCREENS.map((s) => (
                <Btn
                  key={s}
                  onClick={() => setScreen(s)}
                  color={screen === s ? COL.green : COL.cyan}
                >
                  {s === 'mission-select' ? 'select' : s === 'mission-brief' ? 'brief' : s}
                </Btn>
              ))}
            </Row>

            {/* ── Jump to lesson terminal ───────────────────────────────────── */}
            <Divider label="JUMP TO LESSON" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 5,
                marginBottom: 6,
              }}
            >
              {LESSONS.map((l) => {
                const isActive = activeLessonId === l.id
                const isUnlocked = unlockedLessons.includes(l.id)
                const isDone = completedLessons.includes(l.id)
                const color = isDone ? COL.green : isUnlocked ? COL.cyan : COL.dim

                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => jumpToLesson(l.id)}
                    title={l.title}
                    style={{
                      fontFamily: 'SpaceGrotesk, sans-serif',
                      fontWeight: 700,
                      fontSize: 12,
                      color,
                      background: isActive ? `${color}22` : 'transparent',
                      border: `1px solid ${color}44`,
                      borderRadius: 5,
                      padding: '6px 0',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isDone ? '✓' : isUnlocked ? '' : '🔒'}
                    {l.id}
                  </button>
                )
              })}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 5,
                marginBottom: 2,
              }}
            >
              <Btn onClick={() => setScreen('mission-select')} color={COL.cyan} full>
                ← Mission Select
              </Btn>
              <Btn onClick={() => jumpToBrief(activeLessonId ?? 1)} color={COL.accent} full>
                → Mission Brief
              </Btn>
            </div>

            {/* ── Unlock / complete ─────────────────────────────────────────── */}
            <Divider label="UNLOCK / COMPLETE" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 5,
                marginBottom: 8,
              }}
            >
              {LESSONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    unlockLesson(l.id)
                    completeLesson(l.id)
                  }}
                  title={`Unlock + complete lesson ${l.id}`}
                  style={{
                    fontFamily: 'JetBrainsMono, monospace',
                    fontSize: 11,
                    color: completedLessons.includes(l.id) ? COL.green : COL.dim,
                    background: completedLessons.includes(l.id) ? `${COL.green}14` : 'transparent',
                    border: `1px solid ${completedLessons.includes(l.id) ? COL.green : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 5,
                    padding: '5px 0',
                    cursor: 'pointer',
                  }}
                >
                  L{l.id}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              <Btn onClick={unlockAll} color={COL.cyan} full>
                Unlock All
              </Btn>
              <Btn onClick={completeAll} color={COL.green} full>
                Complete All
              </Btn>
            </div>

            {/* ── XP ───────────────────────────────────────────────────────── */}
            <Divider label="XP" />
            <Row label="Set XP">
              {[0, 500, 1000, 2000].map((v) => (
                <Btn key={v} onClick={() => setXPDirect(v)} color={COL.cyan}>
                  {v}
                </Btn>
              ))}
            </Row>
            <Row label="Add XP">
              <input
                type="number"
                value={xpInput}
                onChange={(e) => setXpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyXP()}
                placeholder="±amount"
                style={{
                  fontFamily: 'JetBrainsMono, monospace',
                  fontSize: 12,
                  background: 'rgba(0,212,255,0.06)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: 5,
                  color: COL.cyan,
                  padding: '4px 8px',
                  width: 80,
                  outline: 'none',
                }}
              />
              <Btn onClick={applyXP} color={COL.green}>
                Apply
              </Btn>
            </Row>

            {/* ── Danger zone ──────────────────────────────────────────────── */}
            <Divider label="DANGER ZONE" />
            <Btn onClick={resetProgress} color={COL.red} full>
              ⚠ Reset All Progress + Reload
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
