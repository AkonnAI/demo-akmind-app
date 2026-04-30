import { CONFIG } from '../constants/config'
import type { Platform } from '../world/Level1'

const MIRROR_HALF_LEN = 20
const MAX_BOUNCES = 8
const TARGET_R = 20
const RAY_EPS = 0.02

export interface PuzzleMirror {
  wx: number
  wy: number
  /** 0–7 → orientation in 45° steps (panel rotates clockwise with E). */
  angleSteps: number
  nearPlayer: boolean
  /** Discriminator — never a lock-on / homing target. */
  readonly isMirrorPanel: true
}

export interface MirrorPuzzle {
  id: string
  emitterX: number
  emitterY: number
  /** Initial laser direction in radians (+X = 0). */
  emitterDir: number
  targetX: number
  targetY: number
  mirrors: PuzzleMirror[]
  solved: boolean
  /** Last traced path in world space (for rendering). */
  beamPath: { x: number; y: number }[]
  beamHitTarget: boolean
}

export function createMirrorPuzzle(
  id: string,
  emitterX: number,
  emitterY: number,
  targetX: number,
  targetY: number,
  mirrors: { x: number; y: number; angleSteps?: number }[],
  emitterDir = 0,
): MirrorPuzzle {
  return {
    id,
    emitterX,
    emitterY,
    emitterDir,
    targetX,
    targetY,
    mirrors: mirrors.map(m => ({
      wx: m.x,
      wy: m.y,
      angleSteps: m.angleSteps ?? 0,
      nearPlayer: false,
      isMirrorPanel: true as const,
    })),
    solved: false,
    beamPath: [],
    beamHitTarget: false,
  }
}

export function rotateMirrorPanel(puzzle: MirrorPuzzle, idx: number): void {
  const m = puzzle.mirrors[idx]
  if (m) m.angleSteps = (m.angleSteps + 1) & 7
}

/** @deprecated use rotateMirrorPanel */
export function flipMirror(puzzle: MirrorPuzzle, idx: number): void {
  rotateMirrorPanel(puzzle, idx)
}

function mirrorSurfaceAngle(m: PuzzleMirror): number {
  return m.angleSteps * (Math.PI / 4)
}

function mirrorEndpoints(m: PuzzleMirror): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const θ = mirrorSurfaceAngle(m)
  const c = Math.cos(θ) * MIRROR_HALF_LEN
  const s = Math.sin(θ) * MIRROR_HALF_LEN
  return {
    x1: m.wx - c,
    y1: m.wy - s,
    x2: m.wx + c,
    y2: m.wy + s,
  }
}

/** Unit normal facing the incoming ray side (so dot(in, n) < 0 after choosing sign). */
function mirrorNormal(
  m: PuzzleMirror,
  inX: number,
  inY: number,
): { nx: number; ny: number } {
  const θ = mirrorSurfaceAngle(m)
  let nx = -Math.sin(θ)
  let ny = Math.cos(θ)
  if (inX * nx + inY * ny > 0) {
    nx = -nx
    ny = -ny
  }
  return { nx, ny }
}

function reflect(
  ix: number,
  iy: number,
  nx: number,
  ny: number,
): { x: number; y: number } {
  const d = 2 * (ix * nx + iy * ny)
  return { x: ix - d * nx, y: iy - d * ny }
}

/** Ray–segment intersection; returns distance t along ray (dir need not be unit). */
function raySegT(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minT: number,
): number | null {
  const sx = x2 - x1
  const sy = y2 - y1
  const cross = dx * sy - dy * sx
  if (Math.abs(cross) < 1e-9) return null
  const t = ((x1 - ox) * sy - (y1 - oy) * sx) / cross
  const u = ((x1 - ox) * dy - (y1 - oy) * dx) / cross
  if (t < minT - 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null
  return t
}

function rayCircleT(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  r: number,
  minT: number,
): number | null {
  const fx = ox - cx
  const fy = oy - cy
  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - r * r
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const s = Math.sqrt(disc)
  const t1 = (-b - s) / (2 * a)
  const t2 = (-b + s) / (2 * a)
  const cand = [t1, t2].filter(t => t >= minT - 1e-6)
  if (cand.length === 0) return null
  return Math.min(...cand)
}

function normalize(x: number, y: number): { x: number; y: number } {
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}

export function buildMirrorWallSegments(
  groundY: number,
  worldMin: number,
  worldMax: number,
  platforms: Platform[],
  ceilingY: number,
): Array<{ x1: number; y1: number; x2: number; y2: number; kind: 'wall' }> {
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number; kind: 'wall' }> = []
  segs.push(
    { x1: worldMin, y1: ceilingY, x2: worldMin, y2: groundY + 40, kind: 'wall' },
    { x1: worldMax, y1: ceilingY, x2: worldMax, y2: groundY + 40, kind: 'wall' },
    { x1: worldMin, y1: groundY, x2: worldMax, y2: groundY, kind: 'wall' },
    { x1: worldMin, y1: ceilingY, x2: worldMax, y2: ceilingY, kind: 'wall' },
  )
  for (const pl of platforms) {
    const x1 = pl.x
    const y1 = pl.y
    const x2 = pl.x + pl.w
    const y2 = pl.y + pl.h
    segs.push(
      { x1, y1, x2: x2, y2: y1, kind: 'wall' },
      { x1: x2, y1, x2: x2, y2, kind: 'wall' },
      { x1: x2, y1: y2, x2: x1, y2, kind: 'wall' },
      { x1, y1: y2, x2: x1, y2: y1, kind: 'wall' },
    )
  }
  return segs
}

export function refreshMirrorPuzzleBeam(
  puzzle: MirrorPuzzle,
  wallSegs: Array<{ x1: number; y1: number; x2: number; y2: number; kind: 'wall' }>,
): void {
  let ox = puzzle.emitterX
  let oy = puzzle.emitterY
  let dir = normalize(Math.cos(puzzle.emitterDir), Math.sin(puzzle.emitterDir))
  const path: { x: number; y: number }[] = [{ x: ox, y: oy }]
  let hitTarget = false

  for (let bounce = 0; bounce < MAX_BOUNCES; bounce++) {
    let bestT = Infinity
    let bestKind: 'wall' | 'mirror' | 'target' | null = null
    let bestMirror: PuzzleMirror | null = null

    const tTarget = rayCircleT(
      ox,
      oy,
      dir.x,
      dir.y,
      puzzle.targetX,
      puzzle.targetY,
      TARGET_R,
      RAY_EPS,
    )
    if (tTarget != null && tTarget < bestT) {
      bestT = tTarget
      bestKind = 'target'
    }

    for (const m of puzzle.mirrors) {
      const { x1, y1, x2, y2 } = mirrorEndpoints(m)
      const t = raySegT(ox, oy, dir.x, dir.y, x1, y1, x2, y2, RAY_EPS)
      if (t != null && t < bestT - 1e-4) {
        bestT = t
        bestKind = 'mirror'
        bestMirror = m
      }
    }

    for (const w of wallSegs) {
      const t = raySegT(ox, oy, dir.x, dir.y, w.x1, w.y1, w.x2, w.y2, RAY_EPS)
      if (t != null && t < bestT - 1e-4) {
        bestT = t
        bestKind = 'wall'
      }
    }

    if (bestKind == null || !Number.isFinite(bestT)) break

    const hx = ox + dir.x * bestT
    const hy = oy + dir.y * bestT

    if (bestKind === 'target') {
      path.push({ x: hx, y: hy })
      hitTarget = true
      break
    }

    path.push({ x: hx, y: hy })

    if (bestKind === 'wall') {
      break
    }

    if (bestKind === 'mirror' && bestMirror) {
      const { nx, ny } = mirrorNormal(bestMirror, dir.x, dir.y)
      const r = reflect(dir.x, dir.y, nx, ny)
      ox = hx + r.x * 0.08
      oy = hy + r.y * 0.08
      dir = normalize(r.x, r.y)
    }
  }

  puzzle.beamPath = path
  puzzle.beamHitTarget = hitTarget
  if (hitTarget) puzzle.solved = true
}

export function getNearMirror(
  puzzle: MirrorPuzzle,
  playerCX: number,
  playerCY: number,
): number {
  let bestIdx = -1
  let bestDist = 80
  for (let i = 0; i < puzzle.mirrors.length; i++) {
    const m = puzzle.mirrors[i]!
    m.nearPlayer = false
    const d = Math.hypot(playerCX - m.wx, playerCY - m.wy)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  if (bestIdx >= 0) puzzle.mirrors[bestIdx]!.nearPlayer = true
  return bestIdx
}

export function renderMirrorPuzzle(
  ctx: CanvasRenderingContext2D,
  puzzle: MirrorPuzzle,
  cameraX: number,
  time: number,
): void {
  const W = CONFIG.CANVAS_WIDTH
  const ex = puzzle.emitterX - cameraX

  if (ex > -40 && ex < W + 40) {
    ctx.save()
    ctx.fillStyle = puzzle.solved ? '#00ff88' : '#ffffff'
    ctx.shadowColor = ctx.fillStyle
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(ex, puzzle.emitterY, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0a0a12'
    ctx.font = '6px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SRC', ex, puzzle.emitterY - 14)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  const tx = puzzle.targetX - cameraX
  if (tx > -60 && tx < W + 60) {
    ctx.save()
    const pulse = 0.45 + Math.sin(time * 4) * 0.25
    ctx.strokeStyle = puzzle.solved ? '#00ff88' : puzzle.beamHitTarget ? '#aaffcc' : '#aac0ff'
    ctx.lineWidth = 2
    ctx.globalAlpha = puzzle.solved ? 1 : pulse
    ctx.shadowColor = ctx.strokeStyle
    ctx.shadowBlur = puzzle.beamHitTarget || puzzle.solved ? 16 : 8
    ctx.beginPath()
    ctx.arc(tx, puzzle.targetY, TARGET_R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle =
      puzzle.solved ? 'rgba(0,255,136,0.25)' : 'rgba(170,192,255,0.12)'
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // Laser beam polyline
  if (puzzle.beamPath.length >= 2) {
    ctx.save()
    const nearT =
      puzzle.beamHitTarget || puzzle.solved
    ctx.strokeStyle = nearT ? '#ffffff' : '#aac0ff'
    ctx.lineWidth = 2
    ctx.shadowColor = nearT ? '#ffffff' : '#aac0ff'
    ctx.shadowBlur = nearT ? 18 : 12
    ctx.beginPath()
    for (let i = 0; i < puzzle.beamPath.length; i++) {
      const p = puzzle.beamPath[i]!
      const sx = p.x - cameraX
      const sy = p.y
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()
  }

  for (let i = 0; i < puzzle.mirrors.length; i++) {
    const m = puzzle.mirrors[i]!
    const sx = m.wx - cameraX
    if (sx < -40 || sx > W + 40) continue
    const θ = mirrorSurfaceAngle(m)
    ctx.save()
    ctx.translate(sx, m.wy)
    ctx.rotate(θ)
    const mirrorColor = puzzle.solved ? '#00ff88' : '#e2e8f0'
    ctx.strokeStyle = mirrorColor
    ctx.shadowColor = mirrorColor
    ctx.shadowBlur = 10
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-MIRROR_HALF_LEN, 0)
    ctx.lineTo(MIRROR_HALF_LEN, 0)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(226,232,240,0.15)'
    ctx.fillRect(-MIRROR_HALF_LEN, -3, MIRROR_HALF_LEN * 2, 6)
    ctx.restore()

    if (m.nearPlayer && !puzzle.solved) {
      ctx.save()
      ctx.font = '7px Orbitron, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText('[ E ] ROTATE 45°', sx, m.wy - 26)
      ctx.textAlign = 'left'
      ctx.restore()
    }
  }
}
