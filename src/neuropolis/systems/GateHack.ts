import { InputManager } from '../engine/InputManager'
import { CONFIG } from '../constants/config'

export interface GateHackOptions {
  /** Seconds per key once the prompt is live (default 1). */
  roundDuration?: number
  /** Optional subtitle under the main header (e.g. inject uplink). */
  title?: string
}

export interface GateHackState {
  gateId:   number
  round:    number
  key:      string
  label:    string
  timeLeft: number
  prepTime: number
  failed:   boolean
  /** Decays each frame; border flash without `setTimeout`. */
  failedFlash: number
  rounds:   number
  /** Total time budget for the current key (bar + timeout). */
  roundDuration: number
  title?: string
}

type GameKey = 'KeyZ'|'Space'|'ArrowLeft'|'ArrowRight'|'KeyE'

const KEY_POOL: Array<{ key: GameKey; label: string }> = [
  { key: 'KeyZ',       label: 'Z' },
  { key: 'Space',      label: 'SPACE' },
  { key: 'ArrowLeft',  label: '←' },
  { key: 'ArrowRight', label: '→' },
  { key: 'KeyE',       label: 'E' },
]

function pickKey(): { key: GameKey; label: string } {
  return KEY_POOL[Math.floor(Math.random() * KEY_POOL.length)]!
}

export function createGateHack(
  gateId: number,
  rounds = 4,
  options?: GateHackOptions,
): GateHackState {
  const roundDuration = options?.roundDuration ?? 1.0
  const pick = pickKey()
  return {
    gateId,
    round:    0,
    key:      pick.key,
    label:    pick.label,
    timeLeft: roundDuration,
    prepTime: 0.45,
    failed:   false,
    failedFlash: 0,
    rounds,
    roundDuration,
    title: options?.title,
  }
}

export function updateGateHack(
  state: GateHackState | null,
  dt: number,
  input: InputManager,
  onSuccess: () => void,
  onFail: () => void,
  hudMessage: (msg: string, dur: number) => void,
  triggerShake: (mag: number, dur: number) => void,
): GateHackState | null {
  if (!state) return null

  if (state.failedFlash > 0) {
    state.failedFlash = Math.max(0, state.failedFlash - dt)
    if (state.failedFlash <= 0) state.failed = false
  }

  if (state.prepTime > 0) {
    state.prepTime -= dt
    if (state.prepTime <= 0) {
      const pick = pickKey()
      state.key   = pick.key
      state.label = pick.label
      state.timeLeft = state.roundDuration
    }
    return state
  }

  state.timeLeft -= dt
  if (state.timeLeft <= 0) {
    state.timeLeft = state.roundDuration
    state.prepTime = 0.25
    state.failed = true
    state.failedFlash = 0.4
    state.round = 0
    hudMessage('SEQUENCE BROKEN — RESTART', 1.2)
    triggerShake(3, 0.15)
    onFail()
    return state
  }

  for (const kp of KEY_POOL) {
    if (!input.isJustPressed(kp.key)) continue
    if (kp.key === state.key) {
      state.round++
      if (state.round >= state.rounds) {
        onSuccess()
        return null
      }
      state.timeLeft = state.roundDuration
      state.prepTime = 0.2
      const pick = pickKey()
      state.key   = pick.key
      state.label = pick.label
    } else {
      state.round    = 0
      state.timeLeft = state.roundDuration
      state.prepTime = 0.3
      state.failed   = true
      state.failedFlash = 0.32
      hudMessage('WRONG KEY', 0.8)
    }
    return state
  }

  if (input.isJustPressed('Escape')) {
    hudMessage('HACK ABORTED', 1)
    return null
  }

  return state
}

export function renderGateHackOverlay(
  ctx: CanvasRenderingContext2D,
  state: GateHackState,
  _time: number,
): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)

  const cx = CONFIG.CANVAS_WIDTH / 2
  const cy = CONFIG.CANVAS_HEIGHT / 2 - 10
  const PW = 480, PH = 240
  const PX = cx - PW / 2, PY = cy - PH / 2

  ctx.fillStyle = '#06040e'
  ctx.fillRect(PX, PY, PW, PH)
  const borderColor =
    state.failed || state.failedFlash > 0
      ? '#ff4444'
      : state.round > 0
        ? '#00ff88'
        : '#4a9eff'
  ctx.strokeStyle = borderColor; ctx.lineWidth = 2
  ctx.shadowColor = borderColor; ctx.shadowBlur = 16
  ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1)
  ctx.shadowBlur = 0

  const L = 12
  for (const [bx, by, dx, dy] of [
    [PX, PY, 1, 1], [PX + PW, PY, -1, 1],
    [PX, PY + PH, 1, -1], [PX + PW, PY + PH, -1, -1],
  ] as [number, number, number, number][]) {
    ctx.beginPath()
    ctx.moveTo(bx, by); ctx.lineTo(bx + dx * L, by)
    ctx.moveTo(bx, by); ctx.lineTo(bx, by + dy * L)
    ctx.stroke()
  }

  ctx.font = "bold 8px 'Press Start 2P', monospace"
  ctx.fillStyle = '#4a9eff'; ctx.textAlign = 'center'
  ctx.fillText('◈ SECURITY OVERRIDE', cx, PY + 24)
  if (state.title) {
    ctx.font = "6px 'Press Start 2P', monospace"
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(state.title, cx, PY + 38)
    ctx.font = "bold 8px 'Press Start 2P', monospace"
  }

  const roundDotY = PY + (state.title ? 52 : 42)
  for (let r = 0; r < state.rounds; r++) {
    const px = cx - (state.rounds * 16) + r * 32
    const py2 = roundDotY
    ctx.fillStyle = r < state.round ? '#00ff88' : '#1a1040'
    ctx.strokeStyle = r < state.round ? '#00ff88' : '#334155'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(px, py2, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    if (r < state.round) {
      ctx.fillStyle = '#000000'; ctx.font = '7px Orbitron, monospace'
      ctx.fillText('✓', px, py2 + 3)
    }
  }

  if (state.prepTime > 0) {
    ctx.font = "bold 14px 'Press Start 2P', monospace"
    ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 10
    ctx.fillText('READY…', cx, cy + 20); ctx.shadowBlur = 0
  } else {
    const dur = state.roundDuration > 0 ? state.roundDuration : 1
    const timeF = Math.max(0, state.timeLeft / dur)
    const urgent = timeF < 0.35
    ctx.font = "bold 52px 'Press Start 2P', monospace"
    const keyColor =
      state.failed || state.failedFlash > 0
        ? '#ff4444'
        : urgent
          ? '#ff9100'
          : '#ffffff'
    ctx.fillStyle = keyColor; ctx.shadowColor = keyColor; ctx.shadowBlur = 20
    ctx.fillText(state.label, cx, cy + 24); ctx.shadowBlur = 0

    ctx.font = '8px Orbitron, monospace'; ctx.fillStyle = '#94a3b8'
    ctx.fillText('PRESS NOW', cx, cy - 26)

    const BW = 320, BH = 8, BX = cx - BW / 2, BY = PY + PH - 32
    ctx.fillStyle = '#1e293b'; ctx.fillRect(BX, BY, BW, BH)
    const barColor = urgent ? '#ff4444' : '#4a9eff'
    ctx.fillStyle = barColor; ctx.shadowColor = barColor; ctx.shadowBlur = 4
    ctx.fillRect(BX, BY, BW * timeF, BH); ctx.shadowBlur = 0
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(BX, BY, BW, BH)

    if (urgent) {
      const f = ((0.35 - timeF) / 0.35) * 0.12
      ctx.fillStyle = `rgba(255,68,0,${f})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }
  }

  ctx.textAlign = 'left'
  ctx.restore()
}
