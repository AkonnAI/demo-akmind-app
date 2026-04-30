import { CONFIG } from '../constants/config'

export interface WeaponCrateData {
  x: number
  y: number
  weaponSlot: number     // which slot this unlocks (2=prism, 3=gravity, etc.)
  weaponName: string
  color: string
  collected: boolean
}

export class WeaponCrate {
  data: WeaponCrateData
  private time = 0
  private spinAngle = 0

  constructor(data: WeaponCrateData) {
    this.data = data
  }

  overlapsPlayer(px: number, py: number, pw: number, ph: number): boolean {
    if (this.data.collected) return false
    const d = this.data
    return !(px + pw < d.x - 12 || px > d.x + 12 || py + ph < d.y - 12 || py > d.y + 12)
  }

  update(dt: number): void {
    this.time      += dt
    this.spinAngle += 2 * dt
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (this.data.collected) return
    const sx = this.data.x - cameraX
    if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) return

    const d = this.data
    const sy = d.y

    ctx.save()
    ctx.fillStyle = '#1a0a2e'
    ctx.strokeStyle = d.color
    ctx.shadowColor = d.color
    ctx.shadowBlur = 12
    ctx.lineWidth = 2
    ctx.fillRect(sx - 12, sy - 12, 24, 24)
    ctx.strokeRect(sx - 12 + 0.5, sy - 12 + 0.5, 23, 23)
    ctx.shadowBlur = 0

    // Spinning inner diamond
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(this.spinAngle)
    ctx.fillStyle = d.color
    ctx.shadowColor = d.color; ctx.shadowBlur = 8
    ctx.fillRect(-5, -5, 10, 10)
    ctx.shadowBlur = 0
    ctx.restore()

    // Label above
    ctx.font = '6px Orbitron, sans-serif'
    ctx.fillStyle = d.color
    ctx.textAlign = 'center'
    ctx.fillText(d.weaponName, sx, sy - 18)
    ctx.textAlign = 'left'
    ctx.restore()
  }
}
