import { CONFIG } from '../constants/config'
import type { ChaosBoss } from '../bosses/ChaosBoss'
import type { Platform } from './Level1'

export const LEVEL8_WORLD_WIDTH = 4000
const LEVEL_END_X = 3800

export interface L8NPC {
  id: string
  x: number
  y: number
  lines: { speaker: 'NOVA' | 'AX' | 'NPC' | 'KIRAN' | 'CHAOS' | 'NARRATOR'; text: string }[]
  talked: boolean
}

export class Level8 {
  readonly groundY: number
  readonly levelEnd = LEVEL_END_X
  readonly worldWidth = LEVEL8_WORLD_WIDTH

  platforms: Platform[] = []
  npcs: L8NPC[] = []
  levelComplete = false

  constructor(groundY: number) {
    this.groundY = groundY
    const GY = groundY
    this.platforms = [
      { x: 100, y: GY - 100, w: 140, h: 14 },
      { x: 320, y: GY - 140, w: 120, h: 14 },
    ]
    this.npcs = [
      {
        id: 'L8_REYES',
        x: 400,
        y: GY,
        talked: false,
        lines: [
          {
            speaker: 'NPC',
            text: "I am reading NOVA's signal from here. AX — the corruption",
          },
          {
            speaker: 'NPC',
            text: 'It is not NEXUS attacking her. It is NEXUS completing her.',
          },
          {
            speaker: 'NPC',
            text: 'She was already partially NEXUS. She always was. She was built by them.',
          },
          {
            speaker: 'NPC',
            text: 'What she chose to become — that is the part you are about to fight for.',
          },
        ],
      },
    ]
  }

  checkPlatformCollision(
    px: number,
    py: number,
    pw: number,
    ph: number,
    vy: number,
  ): number | null {
    if (vy < 0) return null
    const feet = py + ph
    if (vy >= 0) {
      for (const pl of this.platforms) {
        if (
          px + pw > pl.x &&
          px < pl.x + pl.w &&
          feet >= pl.y &&
          feet <= pl.y + pl.h + 10 &&
          py < pl.y + 5
        ) {
          return pl.y - ph
        }
      }
    }
    return null
  }

  getNearNPC(cx: number): L8NPC | null {
    for (const n of this.npcs) {
      if (n.talked) continue
      if (Math.abs(cx - n.x) < 70) return n
    }
    return null
  }

  markNPCTalked(id: string): void {
    const n = this.npcs.find(x => x.id === id)
    if (n) n.talked = true
  }

  /** Corridor uses local fill; CHAOS arena delegates to `ChaosBoss.renderArena`. */
  renderBackground(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    boss: ChaosBoss | null,
  ): void {
    if (boss) {
      boss.renderArena(ctx, cameraX)
      return
    }
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.groundY
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, W, GY)
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, 'rgba(180,0,0,0.12)')
    g.addColorStop(1, 'rgba(40,0,0,0.35)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, GY)

    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -20 || sx > W + 20) continue
      ctx.fillStyle = 'rgba(74,13,158,0.28)'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = '#7c3dff'
      ctx.fillRect(sx, p.y, p.w, 4)
    }

    ctx.fillStyle = '#050510'
    ctx.fillRect(0, GY, W, H - GY)
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.renderBackground(ctx, cameraX, null)
    const W = CONFIG.CANVAS_WIDTH
    const GY = this.groundY
    for (const n of this.npcs) {
      if (n.talked) continue
      const sx = n.x - cameraX
      if (sx < -40 || sx > W + 40) continue
      ctx.strokeStyle = '#00b4d8'
      ctx.strokeRect(sx - 60, GY - 100, 120, 70)
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillStyle = '#00b4d8'
      ctx.textAlign = 'center'
      ctx.fillText('DR. REYES (RADIO)', sx, GY - 108)
      ctx.textAlign = 'left'
    }
  }
}
