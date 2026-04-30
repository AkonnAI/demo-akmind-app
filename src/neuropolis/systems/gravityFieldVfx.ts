import { CONFIG } from '../constants/config'
import type { GravityField } from '../entities/Projectile'

export function renderGravityFieldsVfx(
  ctx: CanvasRenderingContext2D,
  fields: GravityField[],
  cameraX: number,
  time: number,
  opts?: { accent?: string; maxTimer?: number },
): void {
  const accent = opts?.accent ?? '#00b4d8'
  const maxT = opts?.maxTimer ?? 1.5
  for (const gf of fields) {
    const sx = gf.x - cameraX
    if (sx + gf.radius < -40 || sx - gf.radius > CONFIG.CANVAS_WIDTH + 40) continue
    const a = Math.max(0, gf.timer / maxT)
    const pulse = 0.85 + Math.sin(time * 5 + gf.x * 0.01) * 0.15
    ctx.save()
    ctx.strokeStyle = accent
    ctx.shadowColor = accent
    for (let ring = 0; ring < 3; ring++) {
      const rr = gf.radius * (0.35 + ring * 0.32)
      const rot = time * (0.9 + ring * 0.2) * (ring % 2 === 0 ? 1 : -1)
      ctx.globalAlpha = (0.12 + ring * 0.06) * a * pulse
      ctx.lineWidth = 2 + ring
      ctx.beginPath()
      ctx.arc(sx, gf.y, rr, rot, rot + Math.PI * 1.65)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.18 * a
    ctx.lineWidth = 1
    ctx.shadowBlur = 0
    ctx.setLineDash([6, 10])
    ctx.beginPath()
    ctx.arc(sx, gf.y, gf.radius * 0.92, -time * 1.2, -time * 1.2 + Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
}
