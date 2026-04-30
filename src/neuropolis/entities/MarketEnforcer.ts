import { CONFIG } from '../constants/config'

interface TrackingOrb {
  x: number; y: number
  vx: number; vy: number
  life: number
}

export class MarketEnforcer {
  x: number
  y: number
  hp = 3
  active  = true
  exploded = false
  scoreEmitted = false

  private patrolL: number
  private patrolR: number
  private speed = 90
  private dir = 1

  private rushTimer    = 0
  private rushCooldown = 0
  private isRushing    = false
  private rushVx       = 0

  private shootTimer = 2.5
  private time       = 0
  private beaconAngle = 0

  orbs: TrackingOrb[] = []

  constructor(x: number, groundY: number, patrolL: number, patrolR: number) {
    this.x       = x
    this.y       = groundY - 36
    this.patrolL = patrolL
    this.patrolR = patrolR
  }

  getRect() { return { x: this.x - 20, y: this.y - 18, w: 40, h: 36 } }

  takeHit(): void {
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    this.time       += dt
    this.beaconAngle += 2.5 * dt

    const pcx = playerX + 11
    const dist = Math.abs(pcx - this.x)

    // Rush logic
    if (this.rushCooldown > 0) {
      this.rushCooldown -= dt
      this.isRushing = false
    }
    if (this.rushTimer > 0) {
      this.rushTimer -= dt
      if (this.rushTimer <= 0) {
        this.isRushing = false
        this.rushCooldown = 1.5
      } else {
        this.x += this.rushVx * dt
      }
    } else if (dist < 280 && this.rushCooldown <= 0 && !this.isRushing) {
      this.isRushing  = true
      this.rushTimer  = 0.8
      this.rushVx     = (pcx > this.x ? 1 : -1) * 180
      this.dir        = pcx > this.x ? 1 : -1
    } else if (!this.isRushing) {
      // Patrol
      this.x += this.dir * this.speed * dt
      if (this.x > this.patrolR) { this.x = this.patrolR; this.dir = -1 }
      if (this.x < this.patrolL) { this.x = this.patrolL; this.dir = 1  }
    }

    // Shoot tracking orb
    this.shootTimer -= dt
    if (this.shootTimer <= 0) {
      this.shootTimer = 2.5
      const dx = pcx - this.x, dy = playerY - this.y
      const len = Math.hypot(dx, dy) || 1
      this.orbs.push({
        x: this.x, y: this.y,
        vx: (dx / len) * 90, vy: (dy / len) * 90,
        life: 3.0,
      })
    }

    // Update orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i]!
      const dx = pcx - o.x, dy = playerY - o.y
      const len = Math.hypot(dx, dy) || 1
      o.vx += (dx / len) * 90 * 1 * dt  // slight homing
      o.vy += (dy / len) * 90 * 1 * dt
      // clamp speed
      const sp = Math.hypot(o.vx, o.vy)
      if (sp > 110) { o.vx = o.vx / sp * 110; o.vy = o.vy / sp * 110 }
      o.x += o.vx * dt
      o.y += o.vy * dt
      o.life -= dt
      if (o.life <= 0) this.orbs.splice(i, 1)
    }
  }

  checkOrbHit(px: number, py: number, pw: number, ph: number): boolean {
    for (const o of this.orbs) {
      if (o.x > px && o.x < px + pw && o.y > py && o.y < py + ph) return true
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return

    ctx.save()

    // Hexagonal body (approx via clip)
    const bx = sx - 20, by = this.y - 18, bw = 40, bh = 36
    ctx.fillStyle = '#1a1e3a'
    ctx.fillRect(bx, by, bw, bh)

    // Magenta trim top
    ctx.fillStyle = '#e040fb'
    ctx.fillRect(bx, by, bw, 3)
    ctx.fillStyle = '#ff9100'
    ctx.fillRect(bx, by + bh - 3, bw, 3)

    // Visor
    ctx.fillStyle = '#ff1744'
    ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 6
    ctx.fillRect(bx + 6, by + 10, bw - 12, 5)
    ctx.shadowBlur = 0

    // Shoulder pylons
    ctx.fillStyle = '#2a2e50'
    ctx.fillRect(bx - 10, by + 4, 8, 16)
    ctx.fillRect(bx + bw + 2, by + 4, 8, 16)

    // Beacon light on top (spinning amber circle)
    ctx.save()
    ctx.translate(sx, by - 4)
    ctx.rotate(this.beaconAngle)
    ctx.fillStyle = '#ff8c00'
    ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    ctx.restore()

    // Orbs
    for (const o of this.orbs) {
      const ox = o.x - cameraX
      ctx.fillStyle = '#ff8c00'
      ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(ox, o.y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
