import { CONFIG } from '../constants/config'

export interface FrequencyDial {
  id: string
  wx: number; wy: number
  target: number
  current: number
  solved: boolean
  nearPlayer: boolean
  confirmFlash: number
}

export function createFrequencyDial(
  id: string, wx: number, wy: number, target: number,
): FrequencyDial {
  return { id, wx, wy, target, current: 5, solved: false, nearPlayer: false, confirmFlash: 0 }
}

export function adjustFrequency(dial: FrequencyDial, dir: number): void {
  if (dial.solved) return
  dial.current = Math.max(1, Math.min(10, dial.current + dir))
}

export function confirmFrequency(dial: FrequencyDial): 'solved' | 'wrong' {
  if (dial.current === dial.target) {
    dial.solved = true
    return 'solved'
  }
  dial.confirmFlash = 0.4
  return 'wrong'
}

export function updateFrequencyDial(dial: FrequencyDial, dt: number): void {
  if (dial.confirmFlash > 0) dial.confirmFlash = Math.max(0, dial.confirmFlash - dt)
}

export function isPlayerNearDial(dial: FrequencyDial, pcx: number, pcy: number): boolean {
  return Math.hypot(pcx - dial.wx, pcy - dial.wy) < 80
}

export function renderFrequencyDial(
  ctx: CanvasRenderingContext2D,
  dial: FrequencyDial,
  cameraX: number,
  time: number,
): void {
  const sx = dial.wx - cameraX
  if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return

  const sy = dial.wy
  ctx.save()

  // Body
  ctx.fillStyle = '#0a0a10'
  ctx.strokeStyle = dial.solved ? '#00ff88' : '#ff1744'
  ctx.lineWidth = 2
  ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10
  ctx.fillRect(sx - 44, sy - 64, 88, 64)
  ctx.strokeRect(sx - 44 + 0.5, sy - 63.5, 87, 63)
  ctx.shadowBlur = 0

  // Corner brackets
  const BL = 8
  ctx.strokeStyle = dial.solved ? '#00ff88' : '#ff4444'; ctx.lineWidth = 1.5
  for (const [bx, by, dx, dy] of [
    [sx - 44, sy - 64, 1, 1], [sx + 44, sy - 64, -1, 1],
    [sx - 44, sy, 1, -1], [sx + 44, sy, -1, -1],
  ] as [number, number, number, number][]) {
    ctx.beginPath()
    ctx.moveTo(bx, by); ctx.lineTo(bx + dx * BL, by)
    ctx.moveTo(bx, by); ctx.lineTo(bx, by + dy * BL)
    ctx.stroke()
  }

  // Frequency bars (10 bars)
  const barW = 6, spacing = 8, startBX = sx - 38
  for (let i = 0; i < 10; i++) {
    const bx = startBX + i * spacing
    const h = 6 + i * 2.5
    const active = i < dial.current
    ctx.fillStyle = active ? (dial.solved ? '#00ff88' : '#ff1744') : '#1a0808'
    ctx.fillRect(bx, sy - 12 - h, barW, h)
  }

  // Target arrow
  const targetBX = startBX + (dial.target - 1) * spacing + barW / 2
  ctx.fillStyle = '#ff9100'
  ctx.shadowColor = '#ff9100'; ctx.shadowBlur = 6
  ctx.beginPath(); ctx.arc(targetBX, sy - 56, 4, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Label
  ctx.font = '6px Orbitron, sans-serif'; ctx.textAlign = 'center'
  ctx.fillStyle = dial.solved ? '#00ff88' : '#ff1744'
  ctx.fillText(dial.solved ? 'LOCKED IN' : `FREQ ${dial.current} / ${dial.target}`, sx, sy - 52)

  // Prompt
  if (dial.nearPlayer && !dial.solved) {
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7 + Math.sin(time * 4) * 0.2
    ctx.fillText('← → TUNE   E LOCK', sx, sy - 76)
    ctx.globalAlpha = 1
  }

  // Error flash
  if (dial.confirmFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${dial.confirmFlash * 0.5})`
    ctx.fillRect(sx - 44, sy - 64, 88, 64)
  }

  ctx.textAlign = 'left'
  ctx.restore()
}

// ── Level 6 — MHz broadcast tuning terminals ─────────────────────────────

export interface MHzDialTerminal {
  id: number
  wx: number
  wy: number
  currentFreq: number
  targetFreq: number
  tolerance: number
  solved: boolean
  gateId: number
}

function clamp01(f: number): number {
  return Math.max(0, Math.min(1, f / 100))
}

function drawMHzDialFace(
  ctx: CanvasRenderingContext2D,
  dial: MHzDialTerminal,
  cx: number,
  cy: number,
  radius: number,
  accent: string,
): void {
  const lo = clamp01(dial.targetFreq - dial.tolerance)
  const hi = clamp01(dial.targetFreq + dial.tolerance)
  const a0 = lo * Math.PI * 2 - Math.PI / 2
  const a1 = hi * Math.PI * 2 - Math.PI / 2

  ctx.fillStyle = '#0a0604'
  ctx.strokeStyle = dial.solved ? '#00ff88' : accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  if (!dial.solved) {
    ctx.fillStyle = 'rgba(255,23,68,0.18)'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius - 4, a0, a1)
    ctx.closePath()
    ctx.fill()
  }

  const ang = clamp01(dial.currentFreq) * Math.PI * 2 - Math.PI / 2
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ang) * (radius - 8), cy + Math.sin(ang) * (radius - 8))
  ctx.stroke()

  ctx.font = '8px Orbitron, sans-serif'
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.fillText(`TARGET ${dial.targetFreq.toFixed(1)} MHz`, cx, cy - radius - 14)
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(`NOW ${dial.currentFreq.toFixed(1)}`, cx, cy + radius + 22)
  ctx.textAlign = 'left'
}

/** Compact dial drawn in the level (beside the gantry). */
export function renderMHzDialWorld(
  ctx: CanvasRenderingContext2D,
  dial: MHzDialTerminal,
  cameraX: number,
  accent = '#ff1744',
): void {
  const sx = dial.wx - cameraX
  if (sx < -100 || sx > CONFIG.CANVAS_WIDTH + 100) return
  ctx.save()
  drawMHzDialFace(ctx, dial, sx, dial.wy, 50, accent)
  ctx.font = '7px Orbitron, sans-serif'
  ctx.textAlign = 'center'
  if (!dial.solved) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText('E — TUNE AT TERMINAL', sx, dial.wy - 66)
  } else {
    ctx.fillStyle = '#00ff88'
    ctx.fillText('LOCKED', sx, dial.wy - 66)
  }
  ctx.textAlign = 'left'
  ctx.restore()
}

/** Full-screen tuning station while the player adjusts frequency. */
export function renderMHzDialFullscreen(
  ctx: CanvasRenderingContext2D,
  dial: MHzDialTerminal,
  time: number,
): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = 'rgba(5,2,8,0.88)'
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)

  const cx = CONFIG.CANVAS_WIDTH / 2
  const cy = CONFIG.CANVAS_HEIGHT / 2 - 10
  const PW = 420
  const PH = 320
  ctx.fillStyle = '#08040a'
  ctx.strokeStyle = '#ff1744'
  ctx.lineWidth = 2
  ctx.shadowColor = '#ff1744'
  ctx.shadowBlur = 18
  ctx.fillRect(cx - PW / 2, cy - PH / 2, PW, PH)
  ctx.strokeRect(cx - PW / 2 + 0.5, cy - PH / 2 + 0.5, PW - 1, PH - 1)
  ctx.shadowBlur = 0

  ctx.font = "bold 9px 'Press Start 2P', monospace"
  ctx.fillStyle = '#ff8a80'
  ctx.textAlign = 'center'
  ctx.fillText('BROADCAST FREQUENCY LOCK', cx, cy - PH / 2 + 28)

  drawMHzDialFace(ctx, dial, cx, cy + 8, 88, '#ff1744')

  ctx.font = '7px Orbitron, sans-serif'
  ctx.fillStyle = '#94a3b8'
  const pulse = 0.65 + Math.sin(time * 5) * 0.2
  ctx.globalAlpha = pulse
  ctx.fillText('HOLD ← → TO SWEEP   E TO LOCK   ESC TO CANCEL', cx, cy + PH / 2 - 36)
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  ctx.restore()
}
