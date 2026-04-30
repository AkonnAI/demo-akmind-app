import { CONFIG } from '../constants/config'

export type PatternTileState =
  | 'inactive'
  | 'highlighted'
  | 'active'
  | 'correct'
  | 'wrong'

export interface PatternTile {
  x: number
  y: number
  gridIndex: number
  patternStep: number | null
  state: PatternTileState
  flashTimer: number
}

export interface PatternGrid {
  id: number
  centerX: number
  tiles: PatternTile[]
  currentStep: number
  solved: boolean
  gateId: number
  displayPanel: { x: number; y: number; w: number; h: number }
  novaIntro: string
}

const TILE = 48

function makeTiles(centerX: number, groundY: number, steps: number[]): PatternTile[] {
  const left = centerX - (3 * TILE) / 2
  const tiles: PatternTile[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const gi = row * 3 + col
      const stepOrder = steps.indexOf(gi) + 1
      const patternStep = stepOrder > 0 ? stepOrder : null
      tiles.push({
        x: left + col * TILE,
        y: groundY - 48 - row * TILE,
        gridIndex: gi,
        patternStep,
        state: patternStep != null ? 'highlighted' : 'inactive',
        flashTimer: 0,
      })
    }
  }
  return tiles
}

export function createL3PatternGrid1(groundY: number): PatternGrid {
  const centerX = 2760
  const steps = [0, 4, 8, 2]
  return {
    id: 1,
    centerX,
    tiles: makeTiles(centerX, groundY, steps),
    currentStep: 1,
    solved: false,
    gateId: 1,
    displayPanel: { x: centerX - 80, y: groundY - 48 * 4 - 70, w: 160, h: 56 },
    novaIntro:
      'Floor pattern. The sequence matters — same as training data order.',
  }
}

export function createL3PatternGrid2(groundY: number): PatternGrid {
  const centerX = 6600
  const steps = [6, 3, 0, 5]
  return {
    id: 2,
    centerX,
    tiles: makeTiles(centerX, groundY, steps),
    currentStep: 1,
    solved: false,
    gateId: 3,
    displayPanel: { x: centerX - 80, y: groundY - 48 * 4 - 70, w: 160, h: 56 },
    novaIntro: 'Another pattern. Different sequence this time. AI adapts.',
  }
}

function resetTilesToOriginal(g: PatternGrid): void {
  for (const t of g.tiles) {
    t.flashTimer = 0
    if (t.patternStep != null) {
      t.state = 'highlighted'
    } else {
      t.state = 'inactive'
    }
  }
}

/** Foot overlap: center x in tile, feet near tile top. */
function footOnTile(
  pcx: number,
  feetY: number,
  t: PatternTile,
): boolean {
  return (
    pcx > t.x &&
    pcx < t.x + TILE &&
    feetY >= t.y &&
    feetY <= t.y + 4
  )
}

export type PatternGridEvent =
  | { type: 'correct'; gridId: number }
  | { type: 'wrong'; gridId: number }
  | { type: 'solved'; gridId: number; gateId: number }

export function updatePatternGrids(
  grids: PatternGrid[],
  playerX: number,
  playerY: number,
  playerW: number,
  playerH: number,
  dt: number,
): PatternGridEvent | null {
  const pcx = playerX + playerW / 2
  const feetY = playerY + playerH

  for (const g of grids) {
    for (const t of g.tiles) {
      if (t.flashTimer > 0) {
        t.flashTimer = Math.max(0, t.flashTimer - dt)
        if (t.flashTimer <= 0 && t.state !== 'correct') {
          if (t.patternStep != null && !g.solved) t.state = 'highlighted'
          else if (t.patternStep == null) t.state = 'inactive'
        }
      }
    }
  }

  for (const g of grids) {
    if (g.solved) continue
    for (const t of g.tiles) {
      if (!footOnTile(pcx, feetY, t)) continue
      if (t.state === 'correct') continue
      if (t.patternStep === g.currentStep) {
        t.state = 'correct'
        t.flashTimer = 0.2
        g.currentStep++
        if (g.currentStep > 4) {
          g.solved = true
          return { type: 'solved', gridId: g.id, gateId: g.gateId }
        }
        return { type: 'correct', gridId: g.id }
      }
      if (t.patternStep != null) {
        t.state = 'wrong'
        t.flashTimer = 0.3
        g.currentStep = 1
        resetTilesToOriginal(g)
        return { type: 'wrong', gridId: g.id }
      }
    }
  }
  return null
}

export function renderPatternGrids(
  ctx: CanvasRenderingContext2D,
  grids: PatternGrid[],
  cameraX: number,
  time: number,
): void {
  const ORB = 'Orbitron'
  for (const g of grids) {
    const { displayPanel: dp } = g
    const psx = dp.x - cameraX
    if (psx > -200 && psx < CONFIG.CANVAS_WIDTH + 200) {
      ctx.save()
      ctx.fillStyle = '#0a0614'
      ctx.strokeStyle = '#e040fb'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#e040fb'
      ctx.shadowBlur = 8
      ctx.fillRect(psx, dp.y, dp.w, dp.h)
      ctx.strokeRect(psx + 0.5, dp.y + 0.5, dp.w - 1, dp.h - 1)
      ctx.shadowBlur = 0
      ctx.font = `bold 7px ${ORB}, sans-serif`
      ctx.fillStyle = '#e040fb'
      ctx.textAlign = 'center'
      ctx.fillText('PATTERN', psx + dp.w / 2, dp.y + 12)
      const mini = 12
      const mx0 = psx + dp.w / 2 - (mini * 3) / 2
      const my0 = dp.y + 18
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const gi = r * 3 + c
          const tile = g.tiles.find(t => t.gridIndex === gi)
          const step = tile?.patternStep
          ctx.fillStyle = step ? '#2a1040' : '#0e0c18'
          ctx.strokeStyle = '#e040fb'
          ctx.lineWidth = 1
          const mxx = mx0 + c * mini
          const myy = my0 + r * mini
          ctx.fillRect(mxx, myy, mini - 1, mini - 1)
          ctx.strokeRect(mxx + 0.5, myy + 0.5, mini - 2, mini - 2)
          if (step) {
            ctx.fillStyle = '#e040fb'
            ctx.font = `6px ${ORB}, sans-serif`
            ctx.fillText(String(step), mxx + mini / 2 - 0.5, myy + 9)
          }
        }
      }
      ctx.font = `6px ${ORB}, sans-serif`
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(
        g.solved ? 'SOLVED' : `STEP: ${g.currentStep} / 4`,
        psx + dp.w / 2,
        dp.y + dp.h - 4,
      )
      ctx.textAlign = 'left'
      ctx.restore()
    }

    for (const t of g.tiles) {
      const sx = t.x - cameraX
      if (sx + TILE < -10 || sx > CONFIG.CANVAS_WIDTH + 10) continue
      ctx.save()
      let fill = '#0e0c18'
      let stroke = '#2a2048'
      if (g.solved) {
        fill = '#0a2818'
        stroke = '#00ff88'
      } else if (t.state === 'correct' || t.state === 'highlighted') {
        fill = t.state === 'correct' ? '#0a3018' : '#1a0e2e'
        stroke = '#e040fb'
      } else if (t.state === 'wrong') {
        fill = '#301010'
        stroke = '#ff4444'
      } else if (t.state === 'active') {
        fill = '#200a38'
        stroke = '#e040fb'
      }
      ctx.fillStyle = fill
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      if (t.state === 'active' || t.state === 'correct') {
        ctx.shadowColor = '#e040fb'
        ctx.shadowBlur = 14
      }
      ctx.fillRect(sx, t.y, TILE, TILE)
      ctx.shadowBlur = 0
      ctx.strokeRect(sx + 0.5, t.y + 0.5, TILE - 1, TILE - 1)
      if (t.patternStep != null && !g.solved) {
        ctx.font = `10px ${ORB}, sans-serif`
        ctx.fillStyle = '#e040fb'
        ctx.textAlign = 'center'
        ctx.fillText(String(t.patternStep), sx + TILE / 2, t.y + TILE / 2 + 4)
        ctx.textAlign = 'left'
      }
      ctx.restore()
    }

    if (g.solved) {
      const cx = g.centerX - cameraX
      ctx.save()
      ctx.font = `8px ${ORB}, sans-serif`
      ctx.fillStyle = '#00ff88'
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 12
      ctx.textAlign = 'center'
      ctx.fillText('SOLVED', cx, g.tiles[8]!.y - 12)
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'
      ctx.restore()
    }
  }
  void time
}
