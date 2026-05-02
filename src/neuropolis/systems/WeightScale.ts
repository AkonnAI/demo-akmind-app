import { CONFIG } from '../constants/config'
import type { Platform } from '../world/Level1'

export interface DataBlock {
  id: number
  x: number
  y: number
  w: number
  h: number
  weight: number
  label: string
  onPan: 'none' | 'left' | 'right'
  vx: number
  /** When true, `updateBalanceScales` skips this block; position is driven by the scene. */
  carried: boolean
}

export interface BalanceScale {
  id: number
  x: number
  panY: number
  /** World Y where block feet rest on the pan (flush with walkway). */
  panSurfaceY: number
  leftPanX: number
  rightPanX: number
  target: number
  gateId: number
  solved: boolean
  blocks: DataBlock[]
  isBalanced(): boolean
}

/** Wide enough to land blocks when sliding or dropping from carry */
const PAN_W = 72
const PAN_H = 12

/** Same tolerance in trySolve + isBalanced — gates open when within this of target */
const BALANCE_TOL = 5

function sumOnPan(blocks: DataBlock[], pan: 'left' | 'right'): number {
  let s = 0
  for (const b of blocks) if (b.onPan === pan) s += b.weight
  return s
}

function trySolve(s: BalanceScale): void {
  if (s.solved) return
  // Must match `isBalanced()` tolerance — exact equality never fired when UI showed “balanced”
  const tol = BALANCE_TOL
  const L = sumOnPan(s.blocks, 'left')
  const R = sumOnPan(s.blocks, 'right')
  if (
    Math.abs(L - s.target) <= tol &&
    Math.abs(R - s.target) <= tol
  ) {
    s.solved = true
  }
}

function panSurfaces(s: BalanceScale): { lx: number; ly: number; rx: number; ry: number } {
  const tilt =
    ((sumOnPan(s.blocks, 'left') - sumOnPan(s.blocks, 'right')) / 200) * 0.3
  const offL = Math.sin(tilt) * 6
  const offR = -Math.sin(tilt) * 6
  return {
    lx: s.leftPanX,
    ly: s.panSurfaceY + offL,
    rx: s.rightPanX,
    ry: s.panSurfaceY + offR,
  }
}

function blockFeet(b: DataBlock): number {
  return b.y + b.h
}

function supportY(
  b: DataBlock,
  platforms: Platform[],
  groundY: number,
): number {
  const feet = blockFeet(b)
  const cx = b.x + b.w / 2
  let bestPl: number | null = null
  for (const pl of platforms) {
    if (cx <= pl.x || cx >= pl.x + pl.w) continue
    const d = feet - pl.y
    if (d >= -2 && d <= 52) {
      if (bestPl === null || pl.y > bestPl) bestPl = pl.y
    }
  }
  return bestPl ?? groundY
}

export function createBalanceScale(
  id: number,
  centerX: number,
  groundY: number,
  target: number,
  gateId: number,
  defs: Array<{ weight: number; label: string; spawnX: number }>,
): BalanceScale {
  // Beam/UI stay above the deck; pans sit on the floor so blocks can reach them (carry/shoot/walk).
  const panSurfaceY = groundY
  const panY = panSurfaceY - 72
  const blocks: DataBlock[] = defs.map((d, i) => ({
    id: i,
    x: d.spawnX,
    y: groundY - 32,
    w: 32,
    h: 32,
    weight: d.weight,
    label: d.label,
    onPan: 'none',
    vx: 0,
    carried: false,
  }))
  const scale: BalanceScale = {
    id,
    x: centerX,
    panY,
    panSurfaceY,
    leftPanX: centerX - 80,
    rightPanX: centerX + 80,
    target,
    gateId,
    solved: false,
    blocks,
    isBalanced() {
      const tolerance = BALANCE_TOL
      return (
        Math.abs(sumOnPan(this.blocks, 'left') - this.target) <= tolerance &&
        Math.abs(sumOnPan(this.blocks, 'right') - this.target) <= tolerance
      )
    },
  }
  return scale
}

export function updateBalanceScales(
  scales: BalanceScale[],
  dt: number,
  px: number,
  py: number,
  pw: number,
  ph: number,
  pvx: number,
  groundY: number,
  platforms: Platform[],
  worldWidth: number,
): void {
  const decay = Math.pow(0.88, dt * 60)

  for (const s of scales) {
    if (s.solved) continue

    const { lx, ly, rx, ry } = panSurfaces(s)

    for (const b of s.blocks) {
      if (b.carried) continue
      b.vx *= decay
      if (Math.abs(b.vx) < 3) b.vx = 0

      b.x += b.vx * dt
      b.x = Math.max(8, Math.min(worldWidth - b.w - 8, b.x))

      if (
        px + pw > b.x &&
        px < b.x + b.w &&
        py + ph > b.y &&
        py < b.y + b.h
      ) {
        if (Math.abs(pvx) > 40) b.vx = pvx * 1.5
      }

      const cx = b.x + b.w / 2
      const feet = blockFeet(b)
      let onPan: 'none' | 'left' | 'right' = 'none'
      if (
        cx > lx - PAN_W / 2 &&
        cx < lx + PAN_W / 2 &&
        feet >= ly - 14 &&
        feet <= ly + PAN_H + 14
      ) {
        onPan = 'left'
      } else if (
        cx > rx - PAN_W / 2 &&
        cx < rx + PAN_W / 2 &&
        feet >= ry - 14 &&
        feet <= ry + PAN_H + 14
      ) {
        onPan = 'right'
      }
      b.onPan = onPan

      if (onPan === 'left') b.y = ly - b.h
      else if (onPan === 'right') b.y = ry - b.h
      else {
        const sup = supportY(b, platforms, groundY)
        b.y = sup - b.h
      }
    }
    trySolve(s)
  }
}

export function renderBalanceScales(
  ctx: CanvasRenderingContext2D,
  scales: BalanceScale[],
  cameraX: number,
  time: number,
): void {
  const W = CONFIG.CANVAS_WIDTH
  for (const s of scales) {
    const cx = s.x - cameraX
    if (cx < -220 || cx > W + 220) continue

    const Lw = sumOnPan(s.blocks, 'left')
    const Rw = sumOnPan(s.blocks, 'right')
    const tilt = s.solved ? 0 : ((Lw - Rw) / 200) * 0.3
    const offL = Math.sin(tilt) * 6
    const offR = -Math.sin(tilt) * 6

    ctx.save()
    ctx.imageSmoothingEnabled = false
    const balanced = s.isBalanced()
    const acc = balanced ? '#00ff88' : '#00b4d8'

    // One small HUD box above the beam — clipped so text never spills out
    const panelW = 228
    const panelH = 44
    const pad = 8
    const panelX = Math.floor(cx - panelW / 2) + 0.5
    const panelY = Math.floor(s.panY - 102)
    ctx.fillStyle = 'rgba(5, 8, 18, 0.94)'
    ctx.strokeStyle = balanced ? '#00ff88' : acc
    ctx.lineWidth = 1
    ctx.fillRect(panelX, panelY, panelW, panelH)
    ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1)

    ctx.save()
    ctx.beginPath()
    ctx.rect(panelX + pad, panelY + 2, panelW - pad * 2, panelH - 4)
    ctx.clip()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 11px Orbitron, sans-serif'
    ctx.fillStyle = balanced ? '#00ff88' : '#f1f5f9'
    ctx.fillText(`L:${Lw}     R:${Rw}`, Math.floor(cx) + 0.5, panelY + 14)

    ctx.font = '10px Orbitron, sans-serif'
    ctx.fillStyle = balanced ? '#6ee7b7' : '#94a3b8'
    ctx.fillText(
      balanced ? `each pan ${s.target} ✓` : `each pan ${s.target}`,
      Math.floor(cx) + 0.5,
      panelY + 30,
    )
    ctx.restore()

    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'

    ctx.strokeStyle = acc
    ctx.lineWidth = 3
    const pivotY = s.panSurfaceY - 88
    ctx.beginPath()
    ctx.moveTo(cx, pivotY)
    ctx.lineTo(s.leftPanX - cameraX, s.panSurfaceY + offL - PAN_H)
    ctx.moveTo(cx, pivotY)
    ctx.lineTo(s.rightPanX - cameraX, s.panSurfaceY + offR - PAN_H)
    ctx.stroke()

    if (balanced) {
      ctx.fillStyle = '#00ff88'
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(cx, pivotY - 6, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    const drawPan = (px: number, py: number) => {
      const sx = px - cameraX
      ctx.fillStyle = balanced ? '#c8e8dc' : '#d0d4e0'
      ctx.fillRect(sx - PAN_W / 2, py, PAN_W, PAN_H)
      ctx.strokeStyle = balanced ? '#00ff88' : acc
      ctx.lineWidth = 1
      ctx.strokeRect(sx - PAN_W / 2 + 0.5, py + 0.5, PAN_W - 1, PAN_H - 1)
      for (const corner of [-1, 1] as const) {
        ctx.fillStyle = '#8890a0'
        ctx.beginPath()
        ctx.arc(
          sx + corner * (PAN_W / 2 - 4),
          py + PAN_H / 2,
          2,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    }
    drawPan(s.leftPanX, s.panSurfaceY + offL - PAN_H)
    drawPan(s.rightPanX, s.panSurfaceY + offR - PAN_H)

    for (const b of s.blocks) {
      const bx = b.x - cameraX
      if (bx + b.w < -10 || bx > W + 10) continue
      ctx.fillStyle = '#1a2040'
      ctx.strokeStyle = acc
      ctx.lineWidth = 1
      ctx.fillRect(bx, b.y, b.w, b.h)
      ctx.strokeRect(bx + 0.5, b.y + 0.5, b.w - 1, b.h - 1)
      ctx.font = 'bold 10px Orbitron, sans-serif'
      ctx.fillStyle = '#e8f0ff'
      ctx.textAlign = 'center'
      ctx.fillText(
        b.label,
        Math.floor(bx + b.w / 2) + 0.5,
        Math.floor(b.y + b.h / 2 + 3) + 0.5,
      )
      ctx.textAlign = 'left'
    }
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.setLineDash([])
    ctx.restore()
  }
  void time
}
