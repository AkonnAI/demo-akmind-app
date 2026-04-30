import { CONFIG } from '../constants/config'

export interface NPCData {
  id:          string
  x:           number
  y:           number
  name:        string
  color:       string
  accentColor: string
  dialogue:    { speaker: 'NOVA'|'AX'|'KIRAN'|'NPC'; text: string; expression?: string }[]
  talked:      boolean
  isKiran:     boolean
}

export class NPC {
  data: NPCData
  private time = 0
  private bobY = 0

  constructor(data: NPCData) {
    this.data = data
  }

  update(dt: number): void {
    this.time += dt
    this.bobY  = Math.sin(this.time * 1.8) * 1.5
  }

  isNear(px: number): boolean {
    return Math.abs(px - this.data.x) < 80
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    playerCenterX?: number,
  ): void {
    const sx = this.data.x - cameraX
    const GY = this.data.y
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return

    const by = this.bobY
    const near =
      playerCenterX != null && this.isNear(playerCenterX)

    // Shadow
    ctx.fillStyle   = '#000000'
    ctx.globalAlpha = 0.3
    ctx.fillRect(sx - 10, GY - 2, 20, 4)
    ctx.globalAlpha = 1

    // Legs
    ctx.fillStyle = '#0d0b1e'
    ctx.fillRect(sx - 8, GY - 24 + by, 7, 24)
    ctx.fillRect(sx + 2, GY - 24 + by, 7, 24)

    // Body
    ctx.fillStyle = this.data.color
    ctx.fillRect(sx - 12, GY - 52 + by, 24, 30)

    // Accent detail
    ctx.fillStyle   = this.data.accentColor
    ctx.globalAlpha = 0.6
    ctx.fillRect(sx - 10, GY - 48 + by, 4, 18)
    ctx.globalAlpha = 1

    // Head
    ctx.fillStyle = '#c68642'
    ctx.fillRect(sx - 9, GY - 68 + by, 18, 16)

    // Hair
    ctx.fillStyle = '#1a0a00'
    ctx.fillRect(sx - 10, GY - 72 + by, 20, 8)

    // Eyes
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx - 6, GY - 64 + by, 5, 4)
    ctx.fillRect(sx + 2, GY - 64 + by, 5, 4)
    ctx.fillStyle = '#000000'
    ctx.fillRect(sx - 5, GY - 63 + by, 3, 3)
    ctx.fillRect(sx + 3, GY - 63 + by, 3, 3)

    // Talk indicator above head (first visit only)
    if (!this.data.talked) {
      const pulse = 0.5 + Math.sin(this.time * 3) * 0.4
      ctx.fillStyle   = '#ffcc00'
      ctx.globalAlpha = pulse
      ctx.font        = `bold 12px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('!', sx, GY - 88 + by)
      ctx.globalAlpha = 1
    }

    if (near) {
      ctx.fillStyle   = '#ffcc00'
      ctx.globalAlpha = 0.7
      ctx.font        = `9px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('[E] TALK', sx, GY - 100 + by)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
    }

    // Name label
    ctx.fillStyle   = this.data.accentColor
    ctx.globalAlpha = 0.8
    ctx.font        = `9px Orbitron, sans-serif`
    ctx.textAlign   = 'center'
    ctx.fillText(this.data.name, sx, GY - 76 + by)
    ctx.textAlign   = 'left'
    ctx.globalAlpha = 1
  }
}
