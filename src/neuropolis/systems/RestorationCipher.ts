import { InputManager } from '../engine/InputManager'
import { CONFIG } from '../constants/config'

const YEAR_POOL = [1950, 1956, 1997, 2012, 2022, 1969, 1984, 2001, 2010, 2018] as const
const CORRECT = [1950, 1956, 1997, 2012, 2022] as const
const TOTAL_TIME = 20

export interface RestorationCipherState {
  active: boolean
  round: number
  cycleIndex: number
  timeLeft: number
  pauseTimer: number
  failed: boolean
  partialOutcome: boolean | null
}

export function createRestorationCipher(): RestorationCipherState {
  return {
    active: true,
    round: 0,
    cycleIndex: 0,
    timeLeft: TOTAL_TIME,
    pauseTimer: 0,
    failed: false,
    partialOutcome: null,
  }
}

export function updateRestorationCipher(
  state: RestorationCipherState | null,
  dt: number,
  input: InputManager,
  onCorrectYear: (round: number) => void,
  onWrongYear: () => void,
  onComplete: () => void,
  onFailTimer: () => void,
): RestorationCipherState | null {
  if (!state?.active) return state

  if (state.pauseTimer > 0) {
    state.pauseTimer = Math.max(0, state.pauseTimer - dt)
    if (state.pauseTimer <= 0) state.failed = false
    return state
  }

  state.timeLeft -= dt
  if (state.timeLeft <= 0) {
    state.active = false
    state.partialOutcome = true
    onFailTimer()
    return state
  }

  if (input.isJustPressed('ArrowLeft')) {
    state.cycleIndex = (state.cycleIndex - 1 + YEAR_POOL.length) % YEAR_POOL.length
  }
  if (input.isJustPressed('ArrowRight')) {
    state.cycleIndex = (state.cycleIndex + 1) % YEAR_POOL.length
  }

  if (input.isJustPressed('KeyE')) {
    const picked = YEAR_POOL[state.cycleIndex]!
    const need = CORRECT[state.round]!
    if (picked === need) {
      onCorrectYear(state.round)
      state.round++
      if (state.round >= CORRECT.length) {
        state.active = false
        state.partialOutcome = false
        onComplete()
      }
    } else {
      state.failed = true
      state.round = 0
      state.pauseTimer = 3
      onWrongYear()
    }
  }

  if (input.isJustPressed('Escape')) {
    state.pauseTimer = 0.5
  }

  return state
}

export function renderRestorationCipherOverlay(
  ctx: CanvasRenderingContext2D,
  state: RestorationCipherState,
  time: number,
): void {
  if (!state.active) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = 'rgba(2,0,6,0.88)'
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)

  const cx = CONFIG.CANVAS_WIDTH / 2
  const cy = CONFIG.CANVAS_HEIGHT / 2
  const PW = 520
  const PH = 340
  const PX = cx - PW / 2
  const PY = cy - PH / 2

  const prog = state.round / CORRECT.length
  const g = ctx.createLinearGradient(PX, PY, PX + PW, PY)
  g.addColorStop(0, `rgba(0,229,255,${0.08 + prog * 0.2})`)
  g.addColorStop(1, `rgba(255,68,68,${0.12 + (1 - prog) * 0.15})`)
  ctx.fillStyle = g
  ctx.fillRect(PX, PY, PW, PH)

  ctx.strokeStyle = '#00e5ff'
  ctx.lineWidth = 2
  ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1)

  ctx.font = "bold 8px 'Press Start 2P', monospace"
  ctx.fillStyle = '#00e5ff'
  ctx.textAlign = 'center'
  ctx.fillText('NOVA RESTORATION CIPHER', cx, PY + 28)

  ctx.font = '7px Orbitron, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(`ENTER YEAR ${state.round + 1} OF 5  (CHRONOLOGICAL)`, cx, PY + 48)

  const y = YEAR_POOL[state.cycleIndex]!
  ctx.font = "bold 56px 'Press Start 2P', monospace"
  ctx.fillStyle = state.failed ? '#ff4444' : '#ffffff'
  ctx.shadowColor = state.failed ? '#ff4444' : '#00e5ff'
  ctx.shadowBlur = state.failed ? 14 : 10
  ctx.fillText(String(y), cx, cy + 12)
  ctx.shadowBlur = 0

  ctx.font = '7px Orbitron, sans-serif'
  ctx.fillStyle = '#cbd5e1'
  ctx.fillText('ARROW KEYS — CYCLE    E — CONFIRM', cx, PY + PH - 52)

  const BW = PW - 80
  const BH = 10
  const BX = cx - BW / 2
  const BY = PY + PH - 28
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(BX, BY, BW, BH)
  ctx.fillStyle = '#00e5ff'
  ctx.fillRect(BX, BY, BW * (state.timeLeft / TOTAL_TIME), BH)
  ctx.strokeStyle = '#334155'
  ctx.strokeRect(BX, BY, BW, BH)

  if (state.pauseTimer > 0) {
    ctx.fillStyle = 'rgba(255,68,68,0.35)'
    ctx.fillRect(PX, PY, PW, PH)
    ctx.fillStyle = '#ffffff'
    ctx.font = "bold 9px 'Press Start 2P', monospace"
    ctx.fillText('SEQUENCE RESET — PENALTY', cx, cy - 80)
  }

  const frag = [
    '...1950... Turing asked...',
    '...1956... Dartmouth...',
    '...1997... Deep Blue...',
    '...2012... Deep Learning...',
    '...2022... everyone overnight...',
  ][state.round]
  if (frag) {
    ctx.font = '6px Orbitron, sans-serif'
    ctx.fillStyle = `rgba(0,229,255,${0.45 + Math.sin(time * 3) * 0.15})`
    ctx.fillText(frag, cx, PY + PH - 12)
  }

  for (let i = 0; i < CORRECT.length; i++) {
    const px = cx - CORRECT.length * 10 + i * 20
    ctx.fillStyle = i < state.round ? '#00ff88' : '#1e293b'
    ctx.beginPath()
    ctx.arc(px, PY + 68, 6, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textAlign = 'left'
  ctx.restore()
}
