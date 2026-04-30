import { CONFIG } from '../constants/config'

interface Cube {
  angle:    number   // orbit angle
  hit:      boolean
  scattered: boolean
  sx:       number   // scatter vx
  sy:       number   // scatter vy
  wx:       number   // world x when scattered
  wy:       number   // world y when scattered
  life:     number   // life after scatter
}

export class ProcessorSwarm {
  x: number
  y: number
  active      = true
  exploded    = false
  scoreEmitted = false
  activated = false

  private cubes: Cube[] = []
  private orbitAngle = 0
  private time = 0
  private scattered = false

  constructor(x: number, y: number) {
    this.x = x; this.y = y
    for (let i = 0; i < 4; i++) {
      this.cubes.push({
        angle: (i / 4) * Math.PI * 2,
        hit: false, scattered: false,
        sx: 0, sy: 0, wx: x, wy: y,
        life: 1.2,
      })
    }
  }

  getActiveCount(): number { return this.cubes.filter(c => !c.hit).length }

  getCubeRects(): Array<{ x: number; y: number; w: number; h: number; idx: number }> {
    if (this.scattered) return []
    return this.cubes.map((c, idx) => {
      const cx = this.x + Math.cos(c.angle) * 20
      const cy = this.y + Math.sin(c.angle) * 20
      return { x: cx - 6, y: cy - 6, w: 12, h: 12, idx }
    })
  }

  getScatterRects(): Array<{ x: number; y: number; w: number; h: number }> {
    if (!this.scattered) return []
    return this.cubes.filter(c => !c.hit && c.life > 0).map(c => ({
      x: c.wx - 6, y: c.wy - 6, w: 12, h: 12,
    }))
  }

  hitCube(_idx: number): void {
    this.scatter()
  }

  scatter(): void {
    if (this.scattered) return
    this.scattered = true
    this.cubes.forEach((c, i) => {
      if (c.hit) return
      const angle = (i / 4) * Math.PI * 2
      c.sx = Math.cos(angle) * 200
      c.sy = Math.sin(angle) * 200
      c.wx = this.x + Math.cos(c.angle) * 20
      c.wy = this.y + Math.sin(c.angle) * 20
      c.life = 1.2
    })
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (playerX > this.x - 400) this.activated = true
      else return
    }
    this.time       += dt
    this.orbitAngle += 2 * dt

    if (!this.scattered) {
      // Drift toward player slowly
      const dx = playerX - this.x, dy = playerY - this.y
      const dist = Math.hypot(dx, dy) || 1
      if (dist > 40) {
        this.x += (dx / dist) * 40 * dt
        this.y += (dy / dist) * 40 * dt
      }
      for (const c of this.cubes) c.angle += 2 * dt
    } else {
      // Scatter cubes
      let anyAlive = false
      for (const c of this.cubes) {
        if (c.hit || c.life <= 0) continue
        anyAlive = true
        c.wx += c.sx * dt
        c.wy += c.sy * dt
        c.life -= dt
      }
      if (!anyAlive) this.active = false
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active || !this.activated) return
    const sx = this.x - cameraX
    if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return

    ctx.save()
    if (!this.scattered) {
      for (const c of this.cubes) {
        if (c.hit) continue
        const cx = this.x + Math.cos(c.angle) * 20 - cameraX
        const cy = this.y + Math.sin(c.angle) * 20
        ctx.fillStyle = '#e8e8f0'
        ctx.fillRect(cx - 6, cy - 6, 12, 12)
        ctx.fillStyle = '#00b4d8'
        ctx.fillRect(cx - 1, cy - 1, 2, 2)
      }
    } else {
      for (const c of this.cubes) {
        if (c.hit || c.life <= 0) continue
        const cx = c.wx - cameraX
        ctx.globalAlpha = Math.min(1, c.life)
        ctx.fillStyle = '#e8e8f0'
        ctx.fillRect(cx - 6, c.wy - 6, 12, 12)
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
}
