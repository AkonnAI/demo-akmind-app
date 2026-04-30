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
  /** Grid 2 stays off until grid 1 is solved */
  activated: boolean
}

const TILE = 48
const COLS = 4

/**
 * Creates a horizontal row of COLS tiles at ground level.
 * steps[i] = gridIndex of the tile that is the (i+1)-th step.
 * e.g. steps=[0,1,2,3] means tile0=step1, tile1=step2, tile2=step3, tile3=step4.
 */
function makeTiles(centerX: number, groundY: number, steps: number[]): PatternTile[] {
  const left = centerX - (COLS * TILE) / 2
  const tileY = groundY - TILE
  const tiles: PatternTile[] = []
  for (let col = 0; col < COLS; col++) {
    const gi = col
    const stepOrder = steps.indexOf(gi) + 1
    const patternStep = stepOrder > 0 ? stepOrder : null
    tiles.push({
      x: left + col * TILE,
      y: tileY,
      gridIndex: gi,
      patternStep,
      state: patternStep != null ? 'highlighted' : 'inactive',
      flashTimer: 0,
    })
  }
  return tiles
}

export function createL3PatternGrid1(groundY: number): PatternGrid {
  // Placed well before Gate 1 at x=2200.
  // steps=[0,1,2,3]: walk left→right in order. Numbers 1,2,3,4 run L to R.
  const centerX = 1700
  const steps = [0, 1, 2, 3]
  return {
    id: 1,
    centerX,
    tiles: makeTiles(centerX, groundY, steps),
    currentStep: 1,
    solved: false,
    gateId: 1,
    displayPanel: {
      x: centerX - 100,
      y: groundY - TILE - 80,
      w: 200,
      h: 60,
    },
    novaIntro: 'Floor pattern. Step tiles 1→4 in order. Walk straight through.',
    activated: true,
  }
}

export function createL3PatternGrid2(groundY: number): PatternGrid {
  // Placed before Gate 3 at x=7000 (correct position already).
  // steps=[3,2,1,0]: walk right→left. Numbers 4,3,2,1 run L to R —
  // player must reverse direction to solve it.
  const centerX = 6600
  const steps = [3, 2, 1, 0]
  return {
    id: 2,
    centerX,
    tiles: makeTiles(centerX, groundY, steps),
    currentStep: 1,
    solved: false,
    gateId: 3,
    displayPanel: {
      x: centerX - 100,
      y: groundY - TILE - 80,
      w: 200,
      h: 60,
    },
    novaIntro: 'Second pattern. Numbers run right-to-left this time. Adapt.',
    activated: false,
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

/** Player center X must be over the tile, and feet must be at ground level of the tile. */
function footOnTile(pcx: number, feetY: number, t: PatternTile): boolean {
  const inX = pcx >= t.x + 2 && pcx <= t.x + TILE - 2
  if (!inX) return false
  const bot = t.y + TILE
  return feetY >= bot - 16 && feetY <= bot + 16
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
    if (!g.activated || g.solved) continue
    for (const t of g.tiles) {
      if (!footOnTile(pcx, feetY, t)) continue
      if (t.state === 'correct') continue
      if (t.patternStep === g.currentStep) {
        t.state = 'correct'
        t.flashTimer = 0.2
        g.currentStep++
        if (g.currentStep > COLS) {
          g.solved = true
          return { type: 'solved', gridId: g.id, gateId: g.gateId }
        }
        return { type: 'correct', gridId: g.id }
      }
      if (t.patternStep != null) {
        g.currentStep = 1
        resetTilesToOriginal(g)
        t.state = 'wrong'
        t.flashTimer = 0.4
        return { type: 'wrong', gridId: g.id }
      }
    }
  }
  return null
}

const ORB = 'Orbitron'

/** Floor tiles with wrong/correct styling and in-world hint panel. */
export function renderPatternGridFloorTiles(
  ctx: CanvasRenderingContext2D,
  grids: PatternGrid[],
  cameraX: number,
  time: number,
  playerX: number,
): void {
  for (const g of grids) {
    if (!g.activated) continue

    const tileY = g.tiles[0]!.y
    const showHint = Math.abs(playerX - g.centerX) < 320 && !g.solved

    if (showHint) {
      const cx = g.centerX - cameraX
      const panelTop = tileY - 100
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.82)'
      ctx.strokeStyle = '#e040fb'
      ctx.lineWidth = 1
      ctx.fillRect(cx - 110, panelTop, 220, 70)
      ctx.strokeRect(cx - 110 + 0.5, panelTop + 0.5, 219, 69)
      ctx.textAlign = 'center'
      ctx.font = `9px ${ORB}, sans-serif`
      ctx.fillStyle = '#e040fb'
      ctx.fillText('PATTERN LOCK', cx, panelTop + 14)
      ctx.font = `8px ${ORB}, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText('Step tiles 1 → 2 → 3 → 4 in order', cx, panelTop + 28)
      ctx.font = `7px ${ORB}, sans-serif`
      ctx.fillStyle = '#ff9100'
      ctx.fillText('Wrong step resets the sequence', cx, panelTop + 42)
      const pulseA = Math.sin(time * 3) * 0.3 + 0.7
      ctx.globalAlpha = pulseA
      ctx.font = `bold 10px ${ORB}, sans-serif`
      ctx.fillStyle = '#00e5ff'
      ctx.fillText(`NEXT: ${g.currentStep}`, cx, panelTop + 60)
      ctx.globalAlpha = 1
      ctx.textAlign = 'left'
      ctx.restore()
    }

    for (const t of g.tiles) {
      const sx = t.x - cameraX
      if (sx + TILE < -10 || sx > CONFIG.CANVAS_WIDTH + 10) continue
      ctx.save()
      const isNext =
        !g.solved &&
        t.patternStep != null &&
        t.patternStep === g.currentStep &&
        t.state !== 'correct'
      let fill = '#0e0c18'
      let stroke = '#2a2048'
      if (g.solved) {
        fill = '#0a2818'
        stroke = '#00ff88'
      } else if (t.state === 'correct') {
        fill = 'rgba(0,255,136,0.6)'
        stroke = '#00ff88'
      } else if (t.state === 'wrong' && t.flashTimer > 0) {
        fill = '#ff3030'
        stroke = '#ff3030'
      } else if (t.state === 'highlighted') {
        fill = '#1a0e2e'
        stroke = '#e040fb'
      } else if (t.state === 'active') {
        fill = '#200a38'
        stroke = '#e040fb'
      }
      ctx.fillStyle = fill
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      if (isNext) {
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 14
      }
      ctx.fillRect(sx, t.y, TILE, TILE)
      ctx.shadowBlur = 0
      ctx.strokeRect(sx + 0.5, t.y + 0.5, TILE - 1, TILE - 1)

      if (t.patternStep != null && !g.solved) {
        ctx.font = `bold 18px ${ORB}, sans-serif`
        ctx.fillStyle = isNext ? '#00e5ff' : '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(t.patternStep), sx + TILE / 2, t.y + TILE / 2)
        ctx.textBaseline = 'alphabetic'
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
      ctx.fillText('SOLVED', cx, tileY - 12)
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'
      ctx.restore()
    }
  }
}

/** HUD mini-panels above each grid — shows a 1×4 row of tiles. */
export function renderPatternGridHudPanels(
  ctx: CanvasRenderingContext2D,
  grids: PatternGrid[],
  cameraX: number,
  _time: number,
  _playerX: number,
): void {
  void _time
  void _playerX
  for (const g of grids) {
    if (!g.activated) continue

    const { displayPanel: dp } = g
    const psx = dp.x - cameraX
    if (psx > CONFIG.CANVAS_WIDTH + 220 || psx + dp.w < -20) continue

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

    // 1×4 mini tile row
    const mini = 14
    const gap = 2
    const rowW = COLS * mini + (COLS - 1) * gap
    const mx0 = psx + dp.w / 2 - rowW / 2
    const my0 = dp.y + 18

    for (let c = 0; c < COLS; c++) {
      const tile = g.tiles.find(tt => tt.gridIndex === c)
      const step = tile?.patternStep
      const isCorrected = tile?.state === 'correct'
      ctx.fillStyle = isCorrected ? '#0a2818' : step ? '#2a1040' : '#0e0c18'
      ctx.strokeStyle = isCorrected ? '#00ff88' : '#e040fb'
      ctx.lineWidth = 1
      const mxx = mx0 + c * (mini + gap)
      ctx.fillRect(mxx, my0, mini, mini)
      ctx.strokeRect(mxx + 0.5, my0 + 0.5, mini - 1, mini - 1)
      if (step) {
        ctx.fillStyle = isCorrected ? '#00ff88' : '#e040fb'
        ctx.font = `7px ${ORB}, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(String(step), mxx + mini / 2, my0 + mini - 3)
      }
    }

    ctx.font = `6px ${ORB}, sans-serif`
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'center'
    ctx.fillText(
      g.solved ? 'SOLVED' : `STEP: ${g.currentStep} / ${COLS}`,
      psx + dp.w / 2,
      dp.y + dp.h - 4,
    )
    ctx.textAlign = 'left'
    ctx.restore()
  }
}
