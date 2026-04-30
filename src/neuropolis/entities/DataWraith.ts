import { CONFIG } from '../constants/config'

interface Fragment {
  angle: number
  dist:  number
}

export interface ChildWraith {
  x: number; y: number
  vx: number; vy: number
  life: number
}

export class DataWraith {
  x: number
  y: number
  active   = true
  exploded = false
  scoreEmitted = false
  hp = 1

  private fragments: Fragment[] = []
  private time = 0
  childWraiths: ChildWraith[] = []

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    for (let i = 0; i < 3; i++) {
      this.fragments.push({ angle: (i / 3) * Math.PI * 2, dist: 16 })
    }
  }

  getRect() { return { x: this.x - 15, y: this.y - 9, w: 30, h: 18 } }

  // Only EMP or prism shots damage this
  takeDamage(empOrPrism: boolean): void {
    if (!empOrPrism) return
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    this.time += dt

    // Float toward player — speed = distance/3
    const dx = playerX - this.x, dy = playerY - this.y
    const dist = Math.hypot(dx, dy) || 1
    const speed = Math.min(dist / 3, 120)
    if (dist > 10) {
      this.x += (dx / dist) * speed * dt
      this.y += (dy / dist) * speed * dt
    }

    // Orbit fragments
    for (const f of this.fragments) {
      f.angle += 2 * dt
    }

    // Update child wraiths
    for (let i = this.childWraiths.length - 1; i >= 0; i--) {
      const c = this.childWraiths[i]!
      c.x    += c.vx * dt
      c.y    += c.vy * dt
      c.life -= dt
      if (c.life <= 0) this.childWraiths.splice(i, 1)
    }
  }

  spawnPrismChildren(): void {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2
      this.childWraiths.push({
        x: this.x, y: this.y,
        vx: Math.cos(angle) * 80, vy: Math.sin(angle) * 80,
        life: 1.5,
      })
    }
    this.active = false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active) return
    const sx = this.x - cameraX
    if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) return

    ctx.save()

    // Ghost body
    ctx.fillStyle = 'rgba(224,64,251,0.3)'
    ctx.strokeStyle = '#e040fb'
    ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 16
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(sx, this.y, 15, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0

    // Orbiting fragments
    for (const f of this.fragments) {
      const fx = sx + Math.cos(f.angle) * f.dist
      const fy = this.y + Math.sin(f.angle) * f.dist * 0.5
      ctx.fillStyle = '#e040fb'
      ctx.fillRect(fx - 2, fy - 2, 4, 4)
    }

    // Child wraiths
    for (const c of this.childWraiths) {
      const cx = c.x - cameraX
      ctx.globalAlpha = c.life / 1.5
      ctx.fillStyle = 'rgba(224,64,251,0.5)'
      ctx.beginPath()
      ctx.ellipse(cx, c.y, 8, 5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.restore()
  }
}
