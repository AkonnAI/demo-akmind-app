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
}

export interface BalanceScale {
  id: number
  x: number
  panY: number
  leftPanX: number
  rightPanX: number
  target: number
  gateId: number
  solved: boolean
  blocks: DataBlock[]
}

const PAN_W = 56
const PAN_H = 10

function sumOnPan(blocks: DataBlock[], pan: 'left' | 'right'): number {
  let s = 0
  for (const b of blocks) if (b.onPan === pan) s += b.weight
  return s
}

function trySolve(s: BalanceScale): void {
  if (s.solved) return
  const L = sumOnPan(s.blocks, 'left')
  const R = sumOnPan(s.blocks, 'right')
  if (L === s.target && R === s.target) s.solved = true
}

function panSurfaces(s: BalanceScale): { lx: number; ly: number; rx: number; ry: number } {
  const tilt =
    ((sumOnPan(s.blocks, 'left') - sumOnPan(s.blocks, 'right')) / 200) * 0.3
  const ly = Math.sin(tilt) * 8
  const ry = -Math.sin(tilt) * 8
  return {
    lx: s.leftPanX,
    ly: s.panY - 8 + ly,
    rx: s.rightPanX,
    ry: s.panY - 8 + ry,
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
  const panY = groundY - 110
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
  }))
  return {
    id,
    x: centerX,
    panY,
    leftPanX: centerX - 80,
    rightPanX: centerX + 80,
    target,
    gateId,
    solved: false,
    blocks,
  }
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
        feet >= ly - 4 &&
        feet <= ly + PAN_H + 8
      ) {
        onPan = 'left'
      } else if (
        cx > rx - PAN_W / 2 &&
        cx < rx + PAN_W / 2 &&
        feet >= ry - 4 &&
        feet <= ry + PAN_H + 8
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
    const ly = Math.sin(tilt) * 8
    const ry = -Math.sin(tilt) * 8

    ctx.save()
    const acc = '#00b4d8'
    ctx.strokeStyle = acc
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(s.leftPanX - cameraX, s.panY - 36 + ly)
    ctx.lineTo(s.rightPanX - cameraX, s.panY - 36 + ry)
    ctx.stroke()

    const drawPan = (px: number, py: number) => {
      const sx = px - cameraX
      ctx.fillStyle = '#d0d4e0'
      ctx.fillRect(sx - PAN_W / 2, py, PAN_W, PAN_H)
      ctx.strokeStyle = acc
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
    drawPan(s.leftPanX, s.panY - 8 + ly)
    drawPan(s.rightPanX, s.panY - 8 + ry)

    ctx.fillStyle = '#0a1420'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`BALANCE TO: ${s.target} (each side)`, cx, s.panY - 52)
    ctx.fillStyle = s.solved ? '#00ff88' : acc
    ctx.fillText(`L ${Lw}  |  R ${Rw}`, cx, s.panY - 62)
    if (s.solved) {
      ctx.fillStyle = '#00ff88'
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 10
      ctx.fillText('BALANCED', cx, s.panY - 74)
      ctx.shadowBlur = 0
    }
    ctx.textAlign = 'left'

    for (const b of s.blocks) {
      const bx = b.x - cameraX
      if (bx + b.w < -10 || bx > W + 10) continue
      ctx.fillStyle = '#1a2040'
      ctx.strokeStyle = acc
      ctx.lineWidth = 1
      ctx.fillRect(bx, b.y, b.w, b.h)
      ctx.strokeRect(bx + 0.5, b.y + 0.5, b.w - 1, b.h - 1)
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillStyle = '#e8f0ff'
      ctx.textAlign = 'center'
      ctx.fillText(b.label, bx + b.w / 2, b.y + b.h / 2 + 2)
      ctx.textAlign = 'left'
    }
    ctx.restore()
  }
  void time
}
